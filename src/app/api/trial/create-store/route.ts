import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { initializeTrialState } from '@/lib/proof-week'

/**
 * Called from the /trial wizard after step 2 (store info) completes.
 * Creates the actual store record and starts the 14-day signup
 * window. This does NOT start the 7-day proof clock — that only
 * happens later when a real channel connects (see
 * /api/trial/activate-channel).
 */
export async function POST(req: NextRequest) {
  try {
    const { type, storeName, phone, phoneCode, city, channel } = await req.json()

    if (!storeName || !phone) {
      return NextResponse.json({ error: 'storeName and phone required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const slug = storeName
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
      .replace(/^-+|-+$/g, '') || `store-${Date.now()}`

    // Handle slug collisions by appending a short suffix
    const { data: existingStore } = await supabase
      .from('stores')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    const finalSlug = existingStore ? `${slug}-${Date.now().toString(36)}` : slug

    const { data: newStore, error } = await supabase
      .from('stores')
      .insert({
        name: storeName,
        slug: finalSlug,
        phone: `${phoneCode || ''}${phone}`,
        type: type || 'other',
        status: 'pilot',
        plan: 'free_pilot',
        settings: {
          default_language: 'ar',
          tone: 'friendly',
          city: city || null,
          preferred_channel: channel || null,
        },
      })
      .select('id, slug')
      .single()

    if (error || !newStore) {
      console.error('Store creation error:', error)
      return NextResponse.json({ error: 'failed to create store' }, { status: 500 })
    }

    await initializeTrialState(newStore.id)

    return NextResponse.json({
      storeId: newStore.id,
      slug: newStore.slug,
    })
  } catch (err: any) {
    console.error('Trial signup error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

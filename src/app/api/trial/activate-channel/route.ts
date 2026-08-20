import { NextRequest, NextResponse } from 'next/server'
import { startProofWeek } from '@/lib/proof-week'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Called when a channel actually goes live (e.g. the demo chat
 * receives its first real message, or a WhatsApp/Instagram webhook
 * confirms connection). This is the ONLY place the 7-day proof
 * clock starts — never at signup form submission.
 */
export async function POST(req: NextRequest) {
  try {
    const { storeId: storeSlug, channel } = await req.json()

    if (!storeSlug || !channel) {
      return NextResponse.json({ error: 'storeId and channel required' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('slug', storeSlug)
      .maybeSingle()

    if (!store) {
      return NextResponse.json({ error: 'store not found' }, { status: 404 })
    }

    // Record the channel connection itself
    await supabase.from('channel_connections').insert({
      store_id: store.id,
      channel,
      status: 'active',
      connected_at: new Date().toISOString(),
    })

    // This is idempotent internally — calling it twice does not
    // reset an already-running clock.
    await startProofWeek(store.id, channel)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Channel activation error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

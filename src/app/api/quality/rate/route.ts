import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { messageId, conversationId, storeId: storeSlug, rating, note } = await req.json()

    if (!messageId || !conversationId || !storeSlug || !rating) {
      return NextResponse.json({ error: 'messageId, conversationId, storeId, rating required' }, { status: 400 })
    }

    if (!['correct', 'needs_edit', 'escalated'].includes(rating)) {
      return NextResponse.json({ error: 'invalid rating value' }, { status: 400 })
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

    // Upsert: rating a message twice just updates the existing tag,
    // it never creates duplicate rows (UNIQUE(message_id) enforces this).
    const { data, error } = await supabase
      .from('message_quality')
      .upsert(
        {
          message_id: messageId,
          conversation_id: conversationId,
          store_id: store.id,
          rating,
          note: note || null,
        },
        { onConflict: 'message_id' }
      )
      .select('id')
      .single()

    if (error) {
      console.error('Quality rating error:', error)
      return NextResponse.json({ error: 'failed to save rating' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: data.id })
  } catch (err: any) {
    console.error('Quality rating route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

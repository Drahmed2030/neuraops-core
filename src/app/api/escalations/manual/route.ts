import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { consumeRateLimit, requestIp } from '@/lib/security/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const conversationId = typeof body.conversationId === 'string' ? body.conversationId.trim().slice(0, 128) : ''
    const storeSlug = typeof body.storeId === 'string' ? body.storeId.trim().slice(0, 120) : ''
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim().slice(0, 128) : ''
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : ''

    if (!conversationId || !storeSlug || !sessionId)
      return NextResponse.json({ error: 'conversationId, storeId and sessionId required.' }, { status: 400 })
    if (!/^[A-Za-z0-9_-]{12,128}$/.test(sessionId))
      return NextResponse.json({ error: 'invalid sessionId' }, { status: 400 })

    const ip = requestIp(req)
    const [ipAllowed, sessionAllowed] = await Promise.all([
      consumeRateLimit(`human-request:ip:${ip}`, 10, 3600),
      consumeRateLimit(`human-request:session:${storeSlug}:${sessionId}`, 3, 3600),
    ])
    if (!ipAllowed || !sessionAllowed)
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

    const { data: store } = await supabaseAdmin
      .from('stores').select('id').eq('slug', storeSlug).maybeSingle()
    if (!store)
      return NextResponse.json({ error: 'Store not found.' }, { status: 404 })

    const { data: conversation } = await supabaseAdmin
      .from('conversations').select('id, store_id, session_id')
      .eq('id', conversationId).eq('store_id', store.id)
      .eq('session_id', sessionId).maybeSingle()

    if (!conversation)
      return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })

    const { data: existingEscalation } = await supabaseAdmin
      .from('escalations').select('id')
      .eq('conversation_id', conversationId).eq('store_id', store.id)
      .in('status', ['pending', 'in_progress']).maybeSingle()

    if (existingEscalation)
      return NextResponse.json({ ok: true, escalationId: existingEscalation.id })

    await supabaseAdmin.from('conversations').update({
      status: 'escalated',
      manually_paused: true,
      paused_at: new Date().toISOString(),
      paused_reason: reason || 'Customer requested a human',
    }).eq('id', conversationId).eq('store_id', store.id).eq('session_id', sessionId)

    const { data: escalation, error } = await supabaseAdmin
      .from('escalations')
      .insert({
        conversation_id: conversationId,
        store_id: store.id,
        reason: reason || 'Customer requested a human',
        priority: 'high',
        confidence_score: 0,
        triggered_by: 'customer_request',
        context: { customer_requested_human: true },
        sla_deadline: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
      .select('id').single()

    if (error || !escalation) {
      console.error('Customer escalation error:', error?.message)
      return NextResponse.json({ error: 'Failed to create escalation.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, escalationId: escalation.id })
  } catch (err) {
    console.error('Customer escalation error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

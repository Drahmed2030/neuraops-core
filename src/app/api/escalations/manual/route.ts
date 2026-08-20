import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * "Stop automation, hand to my team" — a trustworthy manual escalation
 * trigger, independent of the AI's own confidence-based escalation.
 * This is what reduces an owner's fear of losing a customer to a
 * wrong automated reply: they (or their team) can always take over
 * a specific conversation instantly.
 */
export async function POST(req: NextRequest) {
  try {
    const { conversationId, storeId: storeSlug, reason } = await req.json()

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, store_id, session_id')
      .eq('id', conversationId)
      .maybeSingle()

    if (!conversation) {
      return NextResponse.json({ error: 'conversation not found' }, { status: 404 })
    }

    // Pause automation on this specific conversation
    await supabase
      .from('conversations')
      .update({
        status: 'escalated',
        manually_paused: true,
        paused_at: new Date().toISOString(),
        paused_reason: reason || null,
      })
      .eq('id', conversationId)

    // Build a context summary from the last few messages, so whoever
    // picks this up doesn't have to re-read the whole conversation
    // from scratch.
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(6)

    const contextSummary = (recentMessages || [])
      .reverse()
      .map(m => `${m.role === 'user' ? 'العميل' : 'المساعد'}: ${m.content}`)
      .join('\n')

    const { data: escalation, error } = await supabase
      .from('escalations')
      .insert({
        conversation_id: conversationId,
        store_id: conversation.store_id,
        reason: reason || 'طلب تصعيد يدوي من صاحب المتجر',
        priority: 'high',
        confidence_score: 0,
        triggered_by: 'manual_owner',
        context: { context_summary: contextSummary, manual: true },
        sla_deadline: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      console.error('Manual escalation error:', error)
      return NextResponse.json({ error: 'failed to create escalation' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      escalationId: escalation.id,
      contextSummary,
    })
  } catch (err: any) {
    console.error('Escalation route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

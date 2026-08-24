import { NextRequest, NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/require-store-access'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * POST /api/escalations/manual
 * Body: { conversationId: string, storeId: string, reason?: string }
 *
 * Manually pauses automation on a conversation and creates an escalation.
 *
 * Auth: requireStoreAccess (401/403)
 * DB:   supabaseAdmin — all tables accessed via verified store anchor
 *
 * Tables accessed:
 *   conversations — SELECT (verify store_id), UPDATE (pause)
 *   messages      — SELECT (build context summary)
 *   escalations   — INSERT
 *
 * RLS why it works: supabaseAdmin bypasses RLS; store scope enforced in queries.
 *
 * Security changes from original:
 *   + requireStoreAccess guard
 *   + conversation verified by both id AND store_id (cross-store check)
 *   + raw error messages not returned to client
 *   Business logic (context summary, sla_deadline, priority): unchanged.
 */
export async function POST(req: NextRequest) {
  let body: { conversationId?: string; storeId?: string; reason?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const { conversationId, storeId, reason } = body

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId required.' }, { status: 400 })
  }
  if (!storeId) {
    return NextResponse.json({ error: 'storeId required.' }, { status: 400 })
  }

  // 1. Auth + ownership
  const ctx = await requireStoreAccess(req, storeId)
  if (ctx instanceof NextResponse) return ctx

  // 2. Verify conversation belongs to verified store
  const { data: conversation } = await supabaseAdmin
    .from('conversations')
    .select('id, store_id, session_id')
    .eq('id', conversationId)
    .eq('store_id', ctx.store.id)           // cross-store check
    .maybeSingle()

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })
  }

  // 3. Pause automation (unchanged business logic)
  await supabaseAdmin
    .from('conversations')
    .update({
      status: 'escalated',
      manually_paused: true,
      paused_at: new Date().toISOString(),
      paused_reason: reason || null,
    })
    .eq('id', conversationId)

  // 4. Build context summary from last 6 messages (unchanged)
  const { data: recentMessages } = await supabaseAdmin
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(6)

  const contextSummary = (recentMessages || [])
    .reverse()
    .map((m: { role: string; content: string }) =>
      `${m.role === 'user' ? 'العميل' : 'المساعد'}: ${m.content}`
    )
    .join('\n')

  // 5. Create escalation record (unchanged)
  const { data: escalation, error } = await supabaseAdmin
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
    console.error('[POST /escalations/manual]', error)
    return NextResponse.json({ error: 'Failed to create escalation.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, escalationId: escalation.id, contextSummary })
}

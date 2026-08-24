import { NextRequest, NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/require-store-access'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/quality?storeId=<store-slug>&limit=<n>
 *
 * Returns recent assistant messages with quality ratings for review.
 *
 * Auth: requireStoreAccess (401/403)
 * DB:   supabaseAdmin — all queries scoped by ctx.store.id
 *
 * Tables accessed:
 *   conversations  — SELECT ids by store_id
 *   messages       — SELECT assistant messages by conversation_id
 *   message_quality — SELECT ratings by message_id
 *   messages       — SELECT preceding user message per assistant message
 *
 * RLS why it works: supabaseAdmin bypasses RLS; store scope enforced in queries.
 *
 * IMPORTANT: preserve the current frontend contract: storeId is the store slug.
 *   requireStoreAccess resolves that slug to the verified store UUID server-side.
 *
 * Security changes from original:
 *   + requireStoreAccess guard while preserving the existing slug request contract
 *   + uses supabaseAdmin — no RLS failures on any table
 *   + raw error messages not returned to client
 *   All query logic and enrichment: unchanged from original.
 */
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('storeId')
  const limit   = Math.min(
    parseInt(req.nextUrl.searchParams.get('limit') || '20', 10),
    100
  )

  if (!storeId) {
    return NextResponse.json({ error: 'storeId required.' }, { status: 400 })
  }

  const ctx = await requireStoreAccess(req, storeId)
  if (ctx instanceof NextResponse) return ctx

  // Step 1: this store's conversation IDs
  const { data: storeConvos } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('store_id', ctx.store.id)           // verified store
    .order('started_at', { ascending: false })
    .limit(50)

  const convoIds = (storeConvos || []).map((c: { id: string }) => c.id)
  if (convoIds.length === 0) return NextResponse.json({ items: [] })

  // Step 2: assistant messages in those conversations
  const { data: messages, error } = await supabaseAdmin
    .from('messages')
    .select('id, conversation_id, content, agent_used, confidence, created_at')
    .eq('role', 'assistant')
    .in('conversation_id', convoIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[GET /quality]', error)
    return NextResponse.json({ error: 'Failed to fetch messages.' }, { status: 500 })
  }

  const messageIds = (messages || []).map((m: any) => m.id)

  // Step 3: existing ratings
  const { data: ratings } = await supabaseAdmin
    .from('message_quality')
    .select('message_id, rating, note')
    .in(
      'message_id',
      messageIds.length > 0 ? messageIds : ['00000000-0000-0000-0000-000000000000']
    )

  const ratingMap = new Map((ratings || []).map((r: any) => [r.message_id, r]))

  // Step 4: enrich with preceding customer question (unchanged logic)
  const enriched = await Promise.all(
    (messages || []).map(async (m: any) => {
      const { data: userMsg } = await supabaseAdmin
        .from('messages')
        .select('content')
        .eq('conversation_id', m.conversation_id)
        .eq('role', 'user')
        .lt('created_at', m.created_at)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const rating = ratingMap.get(m.id)
      return {
        messageId:        m.id,
        conversationId:   m.conversation_id,
        customerQuestion: userMsg?.content || null,
        assistantReply:   m.content,
        agentUsed:        m.agent_used,
        confidence:       m.confidence,
        createdAt:        m.created_at,
        rating:           rating?.rating || null,
        note:             rating?.note   || null,
      }
    })
  )

  return NextResponse.json({ items: enriched })
}

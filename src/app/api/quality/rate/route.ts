import { NextRequest, NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/require-store-access'
import { supabaseAdmin } from '@/lib/supabase/admin'

const VALID_RATINGS = ['correct', 'needs_edit', 'escalated'] as const
type Rating = typeof VALID_RATINGS[number]

/**
 * POST /api/quality/rate
 * Body: { messageId, conversationId, storeId, rating, note? }
 *
 * Tags an assistant message with a quality rating.
 *
 * Auth: requireStoreAccess (401/403)
 * DB:   supabaseAdmin
 *
 * Tables accessed:
 *   messages        — SELECT with !inner join to conversations
 *                     verifies: message.id = messageId
 *                               message.conversation_id = conversationId
 *                               conversation.store_id = ctx.store.id
 *   message_quality — UPSERT onConflict 'message_id' (UNIQUE exists in 004)
 *
 * RLS why it works: supabaseAdmin bypasses RLS; 3-level chain enforced in query.
 *
 * Schema notes:
 *   message_quality has NO rated_at column — created_at used on insert.
 *   rated_by is text DEFAULT 'store_owner' — omitted from upsert, uses default.
 *
 * Security changes from original:
 *   + requireStoreAccess guard while preserving the existing slug request contract
 *   + full 3-level entity validation: message → conversation → store
 *   + raw error messages not returned to client
 *   Business logic: unchanged.
 */
export async function POST(req: NextRequest) {
  let body: {
    messageId?:      string
    conversationId?: string
    storeId?:        string
    rating?:         string
    note?:           string
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const { messageId, conversationId, storeId, rating, note } = body

  if (!messageId || !conversationId || !storeId || !rating) {
    return NextResponse.json(
      { error: 'messageId, conversationId, storeId, rating required.' },
      { status: 400 }
    )
  }

  if (!VALID_RATINGS.includes(rating as Rating)) {
    return NextResponse.json(
      { error: `rating must be one of: ${VALID_RATINGS.join(', ')}` },
      { status: 400 }
    )
  }

  const ctx = await requireStoreAccess(req, storeId)
  if (ctx instanceof NextResponse) return ctx

  // Full 3-level entity validation in one query:
  //   message.id = messageId
  //   message.conversation_id = conversationId
  //   conversation.store_id = ctx.store.id
  //
  // Uses !inner join so the query returns nothing if any level fails.
  const { data: msg, error: msgError } = await supabaseAdmin
    .from('messages')
    .select('id, conversation_id, conversations!inner(id, store_id)')
    .eq('id', messageId)
    .eq('conversation_id', conversationId)
    .eq('conversations.store_id', ctx.store.id)  // cross-store check
    .maybeSingle()

  if (msgError || !msg) {
    console.error('[POST /quality/rate] entity validation failed:', msgError)
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
  }

  // Upsert rating
  // onConflict: 'message_id' is valid — UNIQUE(message_id) exists in migration 004
  // No rated_at column in schema — created_at used automatically on insert
  const { data, error } = await supabaseAdmin
    .from('message_quality')
    .upsert(
      {
        message_id:      messageId,
        conversation_id: conversationId,
        store_id:        ctx.store.id,
        rating:          rating as Rating,
        note:            note || null,
        // rated_by: intentionally omitted — uses DEFAULT 'store_owner'
      },
      { onConflict: 'message_id' }
    )
    .select('id')
    .single()

  if (error) {
    console.error('[POST /quality/rate]', error)
    return NextResponse.json({ error: 'Failed to save rating.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: data.id })
}

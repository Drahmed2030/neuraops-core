import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Returns recent conversations with their assistant messages, plus
 * any existing quality rating for each message. This is what powers
 * the Response Quality Center: a real sample of every conversation,
 * ready to be tagged correct/needs-edit/escalated.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const storeSlug = searchParams.get('storeId')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    if (!storeSlug) {
      return NextResponse.json({ error: 'storeId required' }, { status: 400 })
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

    // Two-step query (more reliable than a nested-table filter):
    // first get this store's conversation IDs, then fetch assistant
    // messages within those conversations.
    const { data: storeConvos } = await supabase
      .from('conversations')
      .select('id')
      .eq('store_id', store.id)
      .order('started_at', { ascending: false })
      .limit(50)

    const convoIds = (storeConvos || []).map(c => c.id)

    if (convoIds.length === 0) {
      return NextResponse.json({ items: [] })
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, conversation_id, content, agent_used, confidence, created_at')
      .eq('role', 'assistant')
      .in('conversation_id', convoIds)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Quality fetch error:', error)
      return NextResponse.json({ error: 'failed to fetch conversations' }, { status: 500 })
    }

    const messageIds = (messages || []).map((m: any) => m.id)

    // Existing ratings for these messages, if any
    const { data: ratings } = await supabase
      .from('message_quality')
      .select('message_id, rating, note')
      .in('message_id', messageIds.length > 0 ? messageIds : ['00000000-0000-0000-0000-000000000000'])

    const ratingMap = new Map((ratings || []).map(r => [r.message_id, r]))

    // For each assistant message, also grab the preceding user message
    // for context, so a reviewer doesn't have to guess what was asked.
    const enriched = await Promise.all(
      (messages || []).map(async (m: any) => {
        const { data: userMsg } = await supabase
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
          messageId: m.id,
          conversationId: m.conversation_id,
          customerQuestion: userMsg?.content || null,
          assistantReply: m.content,
          agentUsed: m.agent_used,
          confidence: m.confidence,
          createdAt: m.created_at,
          rating: rating?.rating || null,
          note: rating?.note || null,
        }
      })
    )

    return NextResponse.json({ items: enriched })
  } catch (err: any) {
    console.error('Quality center error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

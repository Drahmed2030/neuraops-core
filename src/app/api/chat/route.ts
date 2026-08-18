import { NextRequest, NextResponse } from 'next/server'
import { routerAgent } from '@/lib/agents/router'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { message, storeId, sessionId, history = [] } = await req.json()

    if (!message || !storeId) {
      return NextResponse.json({ error: 'message and storeId required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Get or create conversation
    let conversationId: string
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('store_id', storeId)
      .eq('session_id', sessionId)
      .eq('status', 'open')
      .single()

    if (existing) {
      conversationId = existing.id
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ store_id: storeId, session_id: sessionId, channel: 'demo' })
        .select('id')
        .single()
      conversationId = newConv!.id
    }

    // Save user message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
    })

    // Run agent
    const agentResponse = await routerAgent(message, storeId, history)

    // Save assistant message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: agentResponse.answer,
      agent_used: agentResponse.agent,
      confidence: agentResponse.confidence,
      retrieved_chunks: agentResponse.retrieved_chunks,
    })

    // Handle escalation
    if (agentResponse.should_escalate) {
      // Calculate SLA deadline (30 min for high priority)
      const slaDeadline = new Date(Date.now() + 30 * 60 * 1000).toISOString()

      await supabase.from('escalations').insert({
        conversation_id: conversationId,
        store_id: storeId,
        reason: agentResponse.escalation_reason || 'تصعيد تلقائي',
        priority: agentResponse.confidence < 0.3 ? 'high' : 'medium',
        confidence_score: agentResponse.confidence,
        context: { message, history: history.slice(-4) },
        sla_deadline: slaDeadline,
      })

      // Update conversation status
      await supabase
        .from('conversations')
        .update({ status: 'escalated' })
        .eq('id', conversationId)
    }

    return NextResponse.json({
      answer: agentResponse.answer,
      agent: agentResponse.agent,
      confidence: agentResponse.confidence,
      escalated: agentResponse.should_escalate,
      conversationId,
    })

  } catch (err: any) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

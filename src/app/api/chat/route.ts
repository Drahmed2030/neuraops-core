import { NextRequest, NextResponse } from 'next/server'
import { handleCustomerMessage } from '@/lib/agents/orchestrator'
import { createServerClient } from '@/lib/supabase/server'
import { startProofWeek } from '@/lib/proof-week'

export async function POST(req: NextRequest) {
  try {
    const { message, storeId, sessionId, history = [], channel = 'demo' } = await req.json()

    if (!message || !storeId) {
      return NextResponse.json({ error: 'message and storeId required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: store } = await supabase
      .from('stores')
      .select('id, proof_started_at')
      .eq('slug', storeId)
      .maybeSingle()

    const realStoreId = store?.id || storeId

    if (store && !store.proof_started_at) {
      await startProofWeek(realStoreId, channel)
    }

    let conversationId: string
    let isManuallyPaused = false

    const { data: existing } = await supabase
      .from('conversations')
      .select('id, manually_paused')
      .eq('store_id', realStoreId)
      .eq('session_id', sessionId)
      .eq('status', 'open')
      .maybeSingle()

    if (existing) {
      conversationId = existing.id
      isManuallyPaused = existing.manually_paused || false
    } else {
      // Also check escalated conversations for this session — if a
      // human already took over, new messages should still be logged
      // but NOT trigger a fresh AI reply.
      const { data: escalatedExisting } = await supabase
        .from('conversations')
        .select('id, manually_paused')
        .eq('store_id', realStoreId)
        .eq('session_id', sessionId)
        .eq('status', 'escalated')
        .maybeSingle()

      if (escalatedExisting) {
        conversationId = escalatedExisting.id
        isManuallyPaused = escalatedExisting.manually_paused || false
      } else {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ store_id: realStoreId, session_id: sessionId, channel })
          .select('id')
          .single()
        conversationId = newConv!.id
      }
    }

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
    })

    // A human has taken this conversation over — the AI must not
    // reply. This is what makes the escalation button trustworthy:
    // once pressed, automation truly stops for that conversation,
    // not just visually in the dashboard.
    if (isManuallyPaused) {
      return NextResponse.json({
        answer: null,
        agent: null,
        confidence: null,
        escalated: true,
        manuallyPaused: true,
        conversationId,
      })
    }

    const agentResponse = await handleCustomerMessage(message, realStoreId, history)

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: agentResponse.answer,
      agent_used: agentResponse.agent,
      confidence: agentResponse.confidence,
      retrieved_chunks: agentResponse.retrieved_chunks,
    })

    if (agentResponse.should_escalate) {
      const slaDeadline = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      await supabase.from('escalations').insert({
        conversation_id: conversationId,
        store_id: realStoreId,
        reason: agentResponse.escalation_reason || 'تصعيد تلقائي',
        priority: agentResponse.confidence < 0.3 ? 'high' : 'medium',
        confidence_score: agentResponse.confidence,
        triggered_by: 'ai_confidence',
        context: { message, routed_to: agentResponse.agent, routing_reasoning: agentResponse.routingReasoning },
        sla_deadline: slaDeadline,
      })
      await supabase.from('conversations').update({ status: 'escalated' }).eq('id', conversationId)
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
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

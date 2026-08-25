import { NextRequest, NextResponse } from 'next/server'
import { handleCustomerMessage } from '@/lib/agents/orchestrator'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { startProofWeek } from '@/lib/proof-week'
import { consumeRateLimit, requestIp } from '@/lib/security/rate-limit'
import { ACTIVE_ESCALATION_STATUSES, ensureActiveEscalation } from '@/lib/reliability/escalation.mjs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const storeSlug = typeof body.storeId === 'string' ? body.storeId.trim() : ''
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
    const channel = typeof body.channel === 'string' ? body.channel.trim() : 'demo'

    if (!message || message.length > 4000)
      return NextResponse.json({ error: 'invalid message' }, { status: 400 })
    if (!storeSlug || storeSlug.length > 120)
      return NextResponse.json({ error: 'invalid storeId' }, { status: 400 })
    if (!/^[A-Za-z0-9_-]{12,128}$/.test(sessionId))
      return NextResponse.json({ error: 'invalid sessionId' }, { status: 400 })
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(channel))
      return NextResponse.json({ error: 'invalid channel' }, { status: 400 })

    const ip = requestIp(req)
    const [ipAllowed, sessionAllowed] = await Promise.all([
      consumeRateLimit(`chat:ip:${ip}`, 30, 60),
      consumeRateLimit(`chat:session:${storeSlug}:${sessionId}`, 20, 60),
    ])
    if (!ipAllowed || !sessionAllowed)
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores').select('id, proof_started_at').eq('slug', storeSlug).maybeSingle()

    if (storeError) {
      console.error('Store lookup error:', storeError.message)
      return NextResponse.json({ error: 'Store lookup failed.' }, { status: 500 })
    }
    if (!store)
      return NextResponse.json({ error: 'Store not found.' }, { status: 404 })

    const realStoreId = store.id
    if (!store.proof_started_at) await startProofWeek(realStoreId, channel)

    let conversationId: string
    let isManuallyPaused = false
    let conversationWasEscalated = false

    const { data: existing } = await supabaseAdmin
      .from('conversations').select('id, manually_paused')
      .eq('store_id', realStoreId).eq('session_id', sessionId)
      .eq('status', 'open').maybeSingle()

    if (existing) {
      conversationId = existing.id
      isManuallyPaused = existing.manually_paused || false
    } else {
      const { data: escalatedExisting } = await supabaseAdmin
        .from('conversations').select('id, manually_paused')
        .eq('store_id', realStoreId).eq('session_id', sessionId)
        .eq('status', 'escalated').maybeSingle()

      if (escalatedExisting) {
        conversationId = escalatedExisting.id
        isManuallyPaused = escalatedExisting.manually_paused || false
        conversationWasEscalated = true
      } else {
        const { data: newConv, error: insertError } = await supabaseAdmin
          .from('conversations')
          .insert({ store_id: realStoreId, session_id: sessionId, channel })
          .select('id').single()

        if (insertError || !newConv) {
          console.error('Conversation insert error:', insertError?.message)
          return NextResponse.json({ error: 'Failed to create conversation.' }, { status: 500 })
        }
        conversationId = newConv.id
      }
    }

    const { data: priorMessages } = await supabaseAdmin
      .from('messages').select('role, content')
      .eq('conversation_id', conversationId)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true }).limit(20)

    const serverHistory = (priorMessages || []).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content.slice(0, 4000),
    }))

    const { error: userMessageError } = await supabaseAdmin.from('messages').insert({
      conversation_id: conversationId, role: 'user', content: message,
    })
    if (userMessageError) {
      console.error('User message insert error:', userMessageError.message)
      return NextResponse.json({ error: 'Message could not be stored.' }, { status: 500 })
    }

    if (conversationWasEscalated || isManuallyPaused) {
      const { data: activeEscalation, error: activeEscalationError } = await supabaseAdmin
        .from('escalations').select('id')
        .eq('conversation_id', conversationId).eq('store_id', realStoreId)
        .in('status', ACTIVE_ESCALATION_STATUSES).limit(1).maybeSingle()

      if (activeEscalationError) {
        console.error('Active escalation lookup error:', activeEscalationError.message)
        return NextResponse.json({ error: 'Escalation state unavailable.' }, { status: 503 })
      }

      if (activeEscalation) {
        return NextResponse.json({
          answer: null, agent: null, confidence: null,
          escalated: true, manuallyPaused: isManuallyPaused,
          waitingForHuman: true, conversationId,
        })
      }

      if (conversationWasEscalated) {
        const { error: repairError } = await supabaseAdmin.from('conversations')
          .update({ status: 'open' })
          .eq('id', conversationId).eq('store_id', realStoreId).eq('session_id', sessionId)
        if (repairError) {
          console.error('Conversation state repair error:', repairError.message)
          return NextResponse.json({ error: 'Conversation state unavailable.' }, { status: 503 })
        }
      }

      if (isManuallyPaused) {
        return NextResponse.json({
          answer: null, agent: null, confidence: null,
          escalated: false, manuallyPaused: true, conversationId,
        })
      }
    }

    const agentResponse = await handleCustomerMessage(message, realStoreId, serverHistory)

    const { error: assistantMessageError } = await supabaseAdmin.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: agentResponse.answer,
      agent_used: agentResponse.agent,
      confidence: agentResponse.confidence,
      retrieved_chunks: agentResponse.retrieved_chunks,
    })
    if (assistantMessageError) {
      console.error('Assistant message insert error:', assistantMessageError.message)
      return NextResponse.json({ error: 'Assistant response could not be stored.' }, { status: 500 })
    }

    let escalated = false

    if (agentResponse.should_escalate) {
      const slaDeadline = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      const escalationInput = {
        conversationId,
        storeId: realStoreId,
        sessionId,
        reason: agentResponse.escalation_reason || 'تصعيد تلقائي',
        priority: agentResponse.confidence < 0.3 ? 'high' : 'medium',
        confidenceScore: agentResponse.confidence,
        agent: agentResponse.agent,
        routingReasoning: agentResponse.routingReasoning,
        slaDeadline,
      }

      const adapter = {
        findActive: async (activeConversationId: string, activeStoreId: string) => {
          const { data, error } = await supabaseAdmin.from('escalations').select('id')
            .eq('conversation_id', activeConversationId).eq('store_id', activeStoreId)
            .in('status', ACTIVE_ESCALATION_STATUSES).limit(1).maybeSingle()
          if (error) throw error
          return data
        },
        create: async (input: typeof escalationInput) => {
          const { data, error } = await supabaseAdmin.from('escalations').insert({
            conversation_id: input.conversationId,
            store_id: input.storeId,
            reason: input.reason,
            priority: input.priority,
            confidence_score: input.confidenceScore,
            triggered_by: 'ai_confidence',
            context: {
              routed_to: input.agent,
              routing_reasoning: input.routingReasoning,
            },
            sla_deadline: input.slaDeadline,
          }).select('id').single()
          if (error?.code === '23505') return { duplicate: true }
          if (error) throw error
          return data
        },
        markConversationEscalated: async (input: typeof escalationInput) => {
          const { data, error } = await supabaseAdmin.from('conversations')
            .update({ status: 'escalated' })
            .eq('id', input.conversationId).eq('store_id', input.storeId)
            .eq('session_id', input.sessionId).select('id').maybeSingle()
          if (error) {
            console.error('Conversation escalation status error:', error.message)
            return false
          }
          return Boolean(data)
        },
        remove: async (escalationId: string, activeStoreId: string) => {
          const { error } = await supabaseAdmin.from('escalations').delete()
            .eq('id', escalationId).eq('store_id', activeStoreId)
          if (error) console.error('Escalation rollback error:', error.message)
        },
      }

      try {
        const persistence = await ensureActiveEscalation(adapter, escalationInput)
        escalated = persistence.ok
      } catch (error) {
        console.error('Escalation persistence error:', error)
        escalated = false
      }

      if (!escalated) {
        return NextResponse.json({
          answer: agentResponse.answer,
          agent: agentResponse.agent,
          confidence: agentResponse.confidence,
          escalated: false,
          conversationId,
          error: 'Escalation could not be persisted.',
        }, { status: 503 })
      }
    }

    return NextResponse.json({
      answer: agentResponse.answer,
      agent: agentResponse.agent,
      confidence: agentResponse.confidence,
      escalated,
      conversationId,
    })
  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

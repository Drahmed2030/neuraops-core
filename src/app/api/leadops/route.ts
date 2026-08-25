import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { consumeRateLimit, requestIp } from '@/lib/security/rate-limit'
import { ACTIVE_ESCALATION_STATUSES, ensureActiveEscalation } from '@/lib/reliability/escalation.mjs'
import { generateLeadResponse } from '@/lib/leadops/ai'
import { normalizeLeadInput, qualificationDecision, scoreLead } from '@/lib/leadops/qualification.mjs'
import {
  isTerminalConversionStatus,
  persistPublicLeadIdempotently,
} from '@/lib/leadops/persistence.mjs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const storeSlug = typeof body.storeId === 'string' ? body.storeId.trim() : ''
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
    const source = typeof body.source === 'string' ? body.source.trim() : 'web'

    if (!storeSlug || storeSlug.length > 120)
      return NextResponse.json({ error: 'invalid storeId' }, { status: 400 })
    if (!/^[A-Za-z0-9_-]{12,128}$/.test(sessionId))
      return NextResponse.json({ error: 'invalid sessionId' }, { status: 400 })
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(source))
      return NextResponse.json({ error: 'invalid source' }, { status: 400 })

    const ip = requestIp(req)
    const [ipAllowed, sessionAllowed] = await Promise.all([
      consumeRateLimit(`leadops:ip:${ip}`, 30, 60),
      consumeRateLimit(`leadops:session:${storeSlug}:${sessionId}`, 12, 60),
    ])
    if (!ipAllowed || !sessionAllowed)
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores').select('id').eq('slug', storeSlug).maybeSingle()
    if (storeError) return NextResponse.json({ error: 'Store lookup failed.' }, { status: 500 })
    if (!store) return NextResponse.json({ error: 'Store not found.' }, { status: 404 })

    const publicPersistenceAdapter = {
      find: async (storeId: string, activeSessionId: string) => {
        const { data, error } = await supabaseAdmin.from('leads').select('*')
          .eq('store_id', storeId).eq('session_id', activeSessionId).maybeSingle()
        if (error) throw error
        return data
      },
      updateNonTerminal: async (leadId: string, storeId: string, record: Record<string, unknown>) => {
        const { data, error } = await supabaseAdmin.from('leads').update(record)
          .eq('id', leadId).eq('store_id', storeId)
          .not('conversion_status', 'in', '(won,lost)')
          .select('*').maybeSingle()
        if (error) throw error
        return data
      },
      insert: async (record: Record<string, unknown>) => {
        const { data, error } = await supabaseAdmin.from('leads').insert(record).select('*').single()
        if (error?.code === '23505') return null
        if (error) throw error
        return data
      },
    }

    const existingLead = await publicPersistenceAdapter.find(store.id, sessionId)
    if (isTerminalConversionStatus(existingLead?.conversion_status)) {
      return NextResponse.json({
        leadId: existingLead.id,
        score: existingLead.score,
        qualificationStatus: existingLead.qualification_status,
        reason: existingLead.qualification_reason,
        answer: existingLead.ai_response,
        aiConfidence: existingLead.ai_confidence,
        escalated: false,
        terminal: true,
        conversionStatus: existingLead.conversion_status,
      })
    }

    const lead = normalizeLeadInput(body)
    const deterministicScore = scoreLead(lead)
    const ai = await generateLeadResponse({
      need: lead.need,
      budgetBand: lead.budgetBand,
      urgency: lead.urgency,
      decisionAuthority: lead.decisionAuthority,
      score: deterministicScore,
    })
    const decision = qualificationDecision(lead, ai.confidence)

    const baseRecord = {
      store_id: store.id,
      session_id: sessionId,
      source,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      need: lead.need,
      budget_band: lead.budgetBand,
      urgency: lead.urgency,
      decision_authority: lead.decisionAuthority,
      qualification_status: decision.status === 'needs_human' ? 'pending' : decision.status,
      score: decision.score,
      qualification_reason: decision.reason,
      ai_confidence: ai.confidence,
      ai_response: ai.answer,
      updated_at: new Date().toISOString(),
    }

    const firstPersistence = await persistPublicLeadIdempotently(publicPersistenceAdapter, baseRecord)
    let savedLead = firstPersistence.lead

    if (firstPersistence.terminal) {
      return NextResponse.json({
        leadId: savedLead.id,
        score: savedLead.score,
        qualificationStatus: savedLead.qualification_status,
        reason: savedLead.qualification_reason,
        answer: savedLead.ai_response,
        aiConfidence: savedLead.ai_confidence,
        escalated: false,
        terminal: true,
        conversionStatus: savedLead.conversion_status,
      })
    }

    if (decision.status === 'needs_human') {
      const canonicalBeforeEscalation = await publicPersistenceAdapter.find(store.id, sessionId)
      if (isTerminalConversionStatus(canonicalBeforeEscalation?.conversion_status)) {
        return NextResponse.json({
          leadId: canonicalBeforeEscalation.id,
          score: canonicalBeforeEscalation.score,
          qualificationStatus: canonicalBeforeEscalation.qualification_status,
          reason: canonicalBeforeEscalation.qualification_reason,
          answer: canonicalBeforeEscalation.ai_response,
          aiConfidence: canonicalBeforeEscalation.ai_confidence,
          escalated: false,
          terminal: true,
          conversionStatus: canonicalBeforeEscalation.conversion_status,
        })
      }

      let conversationId = savedLead.conversation_id as string | null

      if (!conversationId) {
        const { data: existingConversation } = await supabaseAdmin.from('conversations')
          .select('id').eq('store_id', store.id).eq('session_id', sessionId)
          .in('status', ['open', 'escalated']).limit(1).maybeSingle()
        conversationId = existingConversation?.id || null
      }

      if (!conversationId) {
        const { data: createdConversation, error: conversationError } = await supabaseAdmin
          .from('conversations')
          .insert({ store_id: store.id, session_id: sessionId, channel: 'web', metadata: { workflow: 'leadops' } })
          .select('id').single()
        if (conversationError || !createdConversation)
          return NextResponse.json({ error: 'Lead captured but human review could not be initialized.' }, { status: 503 })
        conversationId = createdConversation.id

        const { data: claimedLead, error: claimError } = await supabaseAdmin.from('leads')
          .update({ conversation_id: conversationId })
          .eq('id', savedLead.id).eq('store_id', store.id).is('conversation_id', null)
          .not('conversion_status', 'in', '(won,lost)')
          .select('id, conversation_id').maybeSingle()

        if (claimError) return NextResponse.json({ error: 'Lead captured but human review could not be initialized.' }, { status: 503 })
        if (!claimedLead) {
          const { data: canonicalLead } = await supabaseAdmin.from('leads')
            .select('conversation_id, conversion_status').eq('id', savedLead.id).eq('store_id', store.id).single()
          if (isTerminalConversionStatus(canonicalLead?.conversion_status)) {
            await supabaseAdmin.from('conversations').delete().eq('id', conversationId).eq('store_id', store.id)
            return NextResponse.json({
              leadId: savedLead.id,
              score: savedLead.score,
              qualificationStatus: savedLead.qualification_status,
              reason: savedLead.qualification_reason,
              answer: savedLead.ai_response,
              aiConfidence: savedLead.ai_confidence,
              escalated: false,
              terminal: true,
              conversionStatus: canonicalLead?.conversion_status,
            })
          }
          if (canonicalLead?.conversation_id && canonicalLead.conversation_id !== conversationId) {
            await supabaseAdmin.from('conversations').delete().eq('id', conversationId).eq('store_id', store.id)
            conversationId = canonicalLead.conversation_id
          }
        }
      }

      const escalationInput = {
        conversationId,
        storeId: store.id,
        sessionId,
        reason: `LeadOps: ${decision.reason}`,
        priority: decision.score >= 75 ? 'high' : 'medium',
        confidenceScore: ai.confidence,
        slaDeadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }

      const escalationAdapter = {
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
            triggered_by: 'leadops_qualification',
            context: { workflow: 'leadops', lead_id: savedLead.id, score: decision.score },
            sla_deadline: input.slaDeadline,
          }).select('id').single()
          if (error?.code === '23505') return { duplicate: true }
          if (error) throw error
          return data
        },
        markConversationEscalated: async (input: typeof escalationInput) => {
          const { data, error } = await supabaseAdmin.from('conversations')
            .update({ status: 'escalated' }).eq('id', input.conversationId)
            .eq('store_id', input.storeId).eq('session_id', input.sessionId)
            .select('id').maybeSingle()
          return !error && Boolean(data)
        },
        remove: async (escalationId: string, activeStoreId: string) => {
          await supabaseAdmin.from('escalations').delete().eq('id', escalationId).eq('store_id', activeStoreId)
        },
      }

      let escalationOk = false
      try {
        escalationOk = (await ensureActiveEscalation(escalationAdapter, escalationInput)).ok
      } catch (error) {
        console.error('[leadops] escalation persistence error:', error)
      }

      if (!escalationOk) {
        await supabaseAdmin.from('leads').update({ follow_up_status: 'escalation_failed' })
          .eq('id', savedLead.id).eq('store_id', store.id)
          .not('conversion_status', 'in', '(won,lost)')
        return NextResponse.json({ error: 'Lead captured but human escalation could not be persisted.' }, { status: 503 })
      }

      const finalPersistence = await persistPublicLeadIdempotently(publicPersistenceAdapter, {
        ...baseRecord,
        conversation_id: conversationId,
        qualification_status: 'needs_human',
        follow_up_status: 'pending',
      })
      savedLead = finalPersistence.lead
    }

    return NextResponse.json({
      leadId: savedLead.id,
      score: decision.score,
      qualificationStatus: decision.status,
      reason: decision.reason,
      answer: ai.answer,
      aiConfidence: ai.confidence,
      escalated: decision.status === 'needs_human',
    })
  } catch (error) {
    console.error('[leadops] workflow error:', error)
    return NextResponse.json({ error: 'Lead qualification failed.' }, { status: 500 })
  }
}

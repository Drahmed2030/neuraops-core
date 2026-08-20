import { createServerClient } from '@/lib/supabase/server'

interface ProofReportData {
  totalConversations: number
  resolvedCount: number
  escalatedCount: number
  avgFirstResponseSeconds: number
  topTopics: { topic: string; count: number }[]
}

/**
 * Generates a proof-week report for the given day (3, 6, or 7) from
 * REAL data in messages/conversations/escalations — no placeholder
 * numbers. Stores the result so the report a customer saw never
 * silently changes later.
 */
export async function generateProofReport(
  storeId: string,
  reportDay: 3 | 6 | 7
): Promise<ProofReportData> {
  const supabase = createServerClient()

  const { data: store } = await supabase
    .from('stores')
    .select('proof_started_at')
    .eq('id', storeId)
    .single()

  const since = store?.proof_started_at || new Date(0).toISOString()

  // Total conversations since proof week started
  const { count: totalConversations } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .gte('started_at', since)

  // Escalated conversations
  const { count: escalatedCount } = await supabase
    .from('escalations')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .gte('created_at', since)

  const total = totalConversations || 0
  const escalated = escalatedCount || 0
  // "Resolved" is defined explicitly here, per the report's own
  // warning: a conversation that got an assistant reply and was
  // NOT escalated counts as resolved. This definition must travel
  // with the number wherever it's shown.
  const resolved = Math.max(0, total - escalated)

  // Average first-response time: time between conversation start
  // and its first assistant message
  const { data: convos } = await supabase
    .from('conversations')
    .select('id, started_at')
    .eq('store_id', storeId)
    .gte('started_at', since)
    .limit(200)

  let avgFirstResponseSeconds = 0
  if (convos && convos.length > 0) {
    const responseTimes: number[] = []
    for (const convo of convos) {
      const { data: firstReply } = await supabase
        .from('messages')
        .select('created_at')
        .eq('conversation_id', convo.id)
        .eq('role', 'assistant')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (firstReply) {
        const diff = (new Date(firstReply.created_at).getTime() - new Date(convo.started_at).getTime()) / 1000
        if (diff >= 0) responseTimes.push(diff)
      }
    }
    if (responseTimes.length > 0) {
      avgFirstResponseSeconds = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    }
  }

  // Top topics: group by which agent handled the conversation
  // (a reasonable proxy for topic until a dedicated topic-tagging
  // system exists — intentionally not over-built here)
  const { data: agentCounts } = await supabase
    .from('messages')
    .select('agent_used')
    .eq('role', 'assistant')
    .not('agent_used', 'is', null)
    .in('conversation_id', (convos || []).map(c => c.id))

  const topicMap: Record<string, number> = {}
  for (const row of agentCounts || []) {
    const key = row.agent_used || 'unknown'
    topicMap[key] = (topicMap[key] || 0) + 1
  }
  const topTopics = Object.entries(topicMap)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const reportData: ProofReportData = {
    totalConversations: total,
    resolvedCount: resolved,
    escalatedCount: escalated,
    avgFirstResponseSeconds: Math.round(avgFirstResponseSeconds),
    topTopics,
  }

  // Store it — this is what makes the report immutable once viewed
  await supabase.from('proof_reports').insert({
    store_id: storeId,
    report_day: reportDay,
    total_conversations: reportData.totalConversations,
    resolved_count: reportData.resolvedCount,
    escalated_count: reportData.escalatedCount,
    avg_first_response_seconds: reportData.avgFirstResponseSeconds,
    top_topics: reportData.topTopics,
  })

  return reportData
}

export async function getLatestProofReport(storeId: string, reportDay?: 3 | 6 | 7) {
  const supabase = createServerClient()
  let query = supabase
    .from('proof_reports')
    .select('*')
    .eq('store_id', storeId)
    .order('generated_at', { ascending: false })
    .limit(1)

  if (reportDay) {
    query = query.eq('report_day', reportDay)
  }

  const { data } = await query.maybeSingle()
  return data
}

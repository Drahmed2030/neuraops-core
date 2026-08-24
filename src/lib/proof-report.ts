import { supabaseAdmin } from '@/lib/supabase/admin'

interface ProofReportData {
  totalConversations: number
  resolvedCount: number
  escalatedCount: number
  avgFirstResponseSeconds: number
  topTopics: { topic: string; count: number }[]
}

export async function generateProofReport(
  storeId: string,
  reportDay: 3 | 6 | 7
): Promise<ProofReportData> {
  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('proof_started_at')
    .eq('id', storeId)
    .single()

  const since = store?.proof_started_at || new Date(0).toISOString()

  const { count: totalConversations } = await supabaseAdmin
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .gte('started_at', since)

  const { count: escalatedCount } = await supabaseAdmin
    .from('escalations')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .gte('created_at', since)

  const total = totalConversations || 0
  const escalated = escalatedCount || 0
  const resolved = Math.max(0, total - escalated)

  const { data: convos } = await supabaseAdmin
    .from('conversations')
    .select('id, started_at')
    .eq('store_id', storeId)
    .gte('started_at', since)
    .limit(200)

  let avgFirstResponseSeconds = 0

  if (convos?.length) {
    const responseTimes: number[] = []

    for (const convo of convos) {
      const { data: firstReply } = await supabaseAdmin
        .from('messages')
        .select('created_at')
        .eq('conversation_id', convo.id)
        .eq('role', 'assistant')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (firstReply) {
        const diff =
          (new Date(firstReply.created_at).getTime() -
            new Date(convo.started_at).getTime()) /
          1000

        if (diff >= 0) responseTimes.push(diff)
      }
    }

    if (responseTimes.length) {
      avgFirstResponseSeconds =
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    }
  }

  const conversationIds = (convos || []).map((c) => c.id)
  let agentCounts: { agent_used: string | null }[] = []

  if (conversationIds.length) {
    const { data } = await supabaseAdmin
      .from('messages')
      .select('agent_used')
      .eq('role', 'assistant')
      .not('agent_used', 'is', null)
      .in('conversation_id', conversationIds)

    agentCounts = data || []
  }

  const topicMap: Record<string, number> = {}

  for (const row of agentCounts) {
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

  const { error } = await supabaseAdmin.from('proof_reports').insert({
    store_id: storeId,
    report_day: reportDay,
    total_conversations: reportData.totalConversations,
    resolved_count: reportData.resolvedCount,
    escalated_count: reportData.escalatedCount,
    avg_first_response_seconds: reportData.avgFirstResponseSeconds,
    top_topics: reportData.topTopics,
  })

  if (error) throw error

  return reportData
}

export async function getLatestProofReport(
  storeId: string,
  reportDay?: 3 | 6 | 7
) {
  let query = supabaseAdmin
    .from('proof_reports')
    .select('*')
    .eq('store_id', storeId)
    .order('generated_at', { ascending: false })
    .limit(1)

  if (reportDay) query = query.eq('report_day', reportDay)

  const { data } = await query.maybeSingle()
  return data
}

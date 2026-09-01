export function withSupabaseRenewalPersistence(basePersistence, supabase) {
  if (!basePersistence?.loadEngagementBundle || !basePersistence?.loadPilotMeasurements) {
    throw new Error('invalid_base_persistence')
  }
  if (!supabase || typeof supabase.rpc !== 'function') {
    throw new Error('invalid_supabase_client')
  }

  async function recordRenewalDecision({
    engagement,
    expectedVersion,
    event,
    policyVersion,
    decision,
    reason,
    proofSummary,
  }) {
    const { data, error } = await supabase.rpc('control_plane_record_renewal_decision', {
      p_engagement_id: engagement.engagementId,
      p_expected_version: expectedVersion,
      p_event: event,
      p_policy_version: policyVersion,
      p_decision: decision,
      p_reason: reason,
      p_proof_summary: proofSummary,
    })

    if (error) return { ok: false, reason: 'persistence_failed' }
    if (!data?.ok) {
      if (data?.reason === 'version_conflict') {
        return { ok: false, reason: 'version_conflict', currentVersion: data.currentVersion }
      }
      return { ok: false, reason: 'persistence_failed', domainReason: data?.reason }
    }

    return {
      ok: true,
      version: data.version,
      duplicate: Boolean(data.duplicate),
      decisionId: data.decisionId,
    }
  }

  async function loadRenewalDecisions(engagementId) {
    const { data, error } = await supabase.rpc('control_plane_load_renewal_decisions', {
      p_engagement_id: engagementId,
    })
    if (error) throw new Error(`control_plane_renewal_load_failed:${error.message}`)
    return Array.isArray(data) ? data : []
  }

  return {
    ...basePersistence,
    recordRenewalDecision,
    loadRenewalDecisions,
  }
}

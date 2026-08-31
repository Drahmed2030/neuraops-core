import { applyLifecycleEvent } from './lifecycle.mjs'

function mapRpcError(error) {
  const message = String(error?.message ?? '')
  if (message.includes('version_conflict')) return { ok: false, reason: 'version_conflict' }
  if (message.includes('event_id_conflict')) {
    return { ok: false, reason: 'persistence_failed', domainReason: 'event_id_conflict' }
  }
  return { ok: false, reason: 'persistence_failed' }
}

export function createSupabaseControlPlanePersistence(supabase) {
  if (!supabase || typeof supabase.rpc !== 'function') {
    throw new Error('invalid_supabase_client')
  }

  async function loadEngagementBundle(engagementId) {
    const { data, error } = await supabase.rpc('control_plane_load_engagement_bundle', {
      p_engagement_id: engagementId,
    })
    if (error) throw new Error(`control_plane_load_failed:${error.message}`)
    if (!data) return null
    return data
  }

  async function commitLifecycle({ engagement, event, entitlement, expectedVersion }) {
    const current = await loadEngagementBundle(engagement.engagementId)
    if (!current) return { ok: false, reason: 'persistence_failed' }

    const applied = applyLifecycleEvent({
      engagement: current.engagement,
      events: current.events,
      grants: current.entitlements,
      event,
      entitlementGrant: entitlement,
    })

    if (!applied.ok) {
      return { ok: false, reason: 'persistence_failed', domainReason: applied.reason }
    }
    if (applied.duplicate) {
      return { ok: true, version: current.version, duplicate: true }
    }

    const { data, error } = await supabase.rpc('control_plane_commit_lifecycle', {
      p_engagement_id: engagement.engagementId,
      p_expected_version: expectedVersion,
      p_event: event,
      p_next_state: applied.engagement.state,
      p_entitlement: entitlement ?? null,
    })

    if (error) return mapRpcError(error)
    if (!data?.ok) {
      if (data?.reason === 'version_conflict') {
        return { ok: false, reason: 'version_conflict', currentVersion: data.currentVersion }
      }
      return {
        ok: false,
        reason: 'persistence_failed',
        domainReason: data?.reason,
      }
    }

    return {
      ok: true,
      version: data.version,
      duplicate: Boolean(data.duplicate),
    }
  }

  return { loadEngagementBundle, commitLifecycle }
}

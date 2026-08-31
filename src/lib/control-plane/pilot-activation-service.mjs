import { hasEntitlement } from './entitlements.mjs'

function nowIso(clock) {
  return (clock ? clock() : new Date()).toISOString()
}

export function createPilotActivationService({ persistence, clock }) {
  if (!persistence?.loadEngagementBundle || !persistence?.commitLifecycle) {
    throw new Error('invalid_persistence_port')
  }

  async function startPilot({ engagementId, actorId = 'system' }) {
    const bundle = await persistence.loadEngagementBundle(engagementId)
    if (!bundle) return { ok: false, reason: 'engagement_not_found' }
    if (bundle.engagement.product !== 'nexus' || bundle.engagement.kind !== 'nexus_lifecycle') {
      return { ok: false, reason: 'not_nexus_lifecycle' }
    }
    if (bundle.engagement.state !== 'PILOT_READY') {
      return { ok: false, reason: 'pilot_not_ready', state: bundle.engagement.state }
    }

    const occurredAt = nowIso(clock)
    if (!hasEntitlement(
      bundle.entitlements,
      bundle.engagement.organizationId,
      'nexus.pilot_workspace',
      occurredAt,
    )) {
      return { ok: false, reason: 'pilot_entitlement_not_active' }
    }

    const event = {
      eventId: `pilot:${engagementId}:started`,
      type: 'PILOT_STARTED',
      occurredAt,
      organizationId: bundle.engagement.organizationId,
      engagementId,
      actor: actorId === 'system'
        ? { type: 'system' }
        : { type: 'operator', actorId },
      payload: { entitlement: 'nexus.pilot_workspace' },
    }

    return persistence.commitLifecycle({
      engagement: bundle.engagement,
      event,
      expectedVersion: bundle.version,
    })
  }

  return { startPilot }
}

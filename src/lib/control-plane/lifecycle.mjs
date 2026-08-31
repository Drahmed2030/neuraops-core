import { appendEvent, findEventById, sameEvent } from './event-ledger.mjs'
import { grantEntitlement } from './entitlements.mjs'
import { transitionEngagement } from './state-machine.mjs'

export function applyLifecycleEvent({ engagement, events, grants, event, entitlementGrant }) {
  if (!engagement?.engagementId || !engagement?.organizationId || !engagement?.state) {
    return { ok: false, reason: 'invalid_engagement' }
  }
  if (event?.engagementId !== engagement.engagementId || event?.organizationId !== engagement.organizationId) {
    return { ok: false, reason: 'event_scope_mismatch' }
  }

  const existingEvent = findEventById(events, event.eventId)
  if (existingEvent) {
    if (!sameEvent(existingEvent, event)) {
      return { ok: false, reason: 'event_id_conflict', existingEvent }
    }
    return {
      ok: true,
      duplicate: true,
      engagement,
      events,
      grants,
      transition: null,
      eventCreated: false,
      entitlement: null,
    }
  }

  const transition = transitionEngagement(engagement.state, event.type)
  if (!transition.ok) return { ok: false, reason: transition.reason, transition }

  let nextGrants = grants
  let entitlementResult = null

  if (event.type === 'ENTITLEMENT_GRANTED') {
    if (!entitlementGrant) return { ok: false, reason: 'entitlement_grant_required' }
    if (entitlementGrant.organizationId !== engagement.organizationId) {
      return { ok: false, reason: 'entitlement_scope_mismatch' }
    }
    entitlementResult = grantEntitlement(grants, entitlementGrant)
    if (!entitlementResult.ok) return { ok: false, reason: entitlementResult.reason }
    nextGrants = entitlementResult.grants
  }

  const eventResult = appendEvent(events, event)
  if (!eventResult.ok) return { ok: false, reason: eventResult.reason }

  return {
    ok: true,
    duplicate: false,
    engagement: { ...engagement, state: transition.to },
    events: eventResult.events,
    grants: nextGrants,
    transition,
    eventCreated: eventResult.created,
    entitlement: entitlementResult,
  }
}

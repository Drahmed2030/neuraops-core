import { paymentReceivedEvent, validateVerifiedPayment } from './payment-policy.mjs'
import { applyLifecycleEvent } from './lifecycle.mjs'

export function fulfillVerifiedPayment({ engagement, events, grants, expectedPayment, verifiedPayment, entitlementGrant }) {
  const validation = validateVerifiedPayment(expectedPayment, verifiedPayment)
  if (!validation.ok) return validation

  const paymentEventResult = paymentReceivedEvent(expectedPayment, verifiedPayment)
  if (!paymentEventResult.ok) return paymentEventResult

  const paymentApplied = applyLifecycleEvent({
    engagement,
    events,
    grants,
    event: paymentEventResult.event,
  })
  if (!paymentApplied.ok) return paymentApplied

  if (!entitlementGrant) {
    return {
      ok: true,
      stage: 'payment_confirmed',
      engagement: paymentApplied.engagement,
      events: paymentApplied.events,
      grants: paymentApplied.grants,
      entitlementApplied: false,
    }
  }

  const entitlementEvent = {
    eventId: `entitlement:${entitlementGrant.organizationId}:${entitlementGrant.key}:${entitlementGrant.startsAt}`,
    type: 'ENTITLEMENT_GRANTED',
    occurredAt: verifiedPayment.occurredAt,
    organizationId: entitlementGrant.organizationId,
    engagementId: engagement.engagementId,
    actor: { type: 'system' },
    payload: { key: entitlementGrant.key, source: entitlementGrant.source },
  }

  const entitlementApplied = applyLifecycleEvent({
    engagement: paymentApplied.engagement,
    events: paymentApplied.events,
    grants: paymentApplied.grants,
    event: entitlementEvent,
    entitlementGrant,
  })
  if (!entitlementApplied.ok) return entitlementApplied

  return {
    ok: true,
    stage: 'entitlement_granted',
    engagement: entitlementApplied.engagement,
    events: entitlementApplied.events,
    grants: entitlementApplied.grants,
    entitlementApplied: true,
  }
}

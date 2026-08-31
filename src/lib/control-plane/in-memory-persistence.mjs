import { findEventById, sameEvent } from './event-ledger.mjs'
import { applyLifecycleEvent } from './lifecycle.mjs'

function clone(value) {
  return structuredClone(value)
}

function normalizedKind(product, kind) {
  if (product === 'nexus') return 'nexus_lifecycle'
  if (product === 'cliniverse' && kind === 'subscription') return 'subscription'
  return null
}

function samePayment(left, right) {
  if (!left || !right) return false
  const keys = [
    'paymentId', 'organizationId', 'engagementId', 'provider',
    'amountMinor', 'currency', 'status', 'idempotencyKey',
  ]
  return keys.every(key => (left[key] ?? null) === (right[key] ?? null))
}

function validPendingPayment(payment, engagement) {
  return Boolean(
    payment?.paymentId &&
    payment?.organizationId === engagement.organizationId &&
    payment?.engagementId === engagement.engagementId &&
    ['manual', 'apple', 'web_gateway'].includes(payment?.provider) &&
    Number.isInteger(payment?.amountMinor) && payment.amountMinor >= 0 &&
    typeof payment?.currency === 'string' && payment.currency.length > 0 &&
    payment?.status === 'pending' &&
    typeof payment?.idempotencyKey === 'string' && payment.idempotencyKey.length > 0 &&
    payment?.createdAt
  )
}

export function createInMemoryControlPlanePersistence(initialBundles = []) {
  const store = new Map()
  const sourceRefs = new Map()

  for (const bundle of initialBundles) {
    if (!bundle?.engagement?.engagementId) throw new Error('invalid_initial_bundle')
    const engagement = {
      ...bundle.engagement,
      kind: normalizedKind(bundle.engagement.product, bundle.engagement.kind) ?? bundle.engagement.kind,
    }
    store.set(engagement.engagementId, clone({
      engagement,
      events: bundle.events ?? [],
      entitlements: bundle.entitlements ?? [],
      payments: bundle.payments ?? [],
      version: bundle.version ?? 0,
    }))
    if (bundle.sourceRef) sourceRefs.set(bundle.sourceRef, engagement.engagementId)
  }

  async function bootstrapEngagement(input) {
    if (!input?.sourceRef || !input?.organizationId || !input?.engagementId) {
      return { ok: false, reason: 'invalid_bootstrap' }
    }
    const kind = normalizedKind(input.product, input.kind)
    if (!kind) return { ok: false, reason: 'invalid_engagement_kind' }

    const existingId = sourceRefs.get(input.sourceRef)
    if (existingId) {
      const existing = store.get(existingId)
      if (!existing || existing.engagement.engagementId !== input.engagementId || existing.engagement.organizationId !== input.organizationId || existing.engagement.product !== input.product || existing.engagement.kind !== kind) {
        return { ok: false, reason: 'source_ref_conflict' }
      }
      return { ok: true, created: false, engagementId: existingId, organizationId: input.organizationId, version: existing.version }
    }

    const bundle = {
      engagement: {
        engagementId: input.engagementId,
        organizationId: input.organizationId,
        product: input.product,
        kind,
        state: input.initialState,
      },
      events: [],
      entitlements: [],
      payments: [],
      version: 0,
    }
    store.set(input.engagementId, clone(bundle))
    sourceRefs.set(input.sourceRef, input.engagementId)
    return { ok: true, created: true, engagementId: input.engagementId, organizationId: input.organizationId, version: 0 }
  }

  async function loadEngagementBundle(engagementId) {
    const bundle = store.get(engagementId)
    return bundle ? clone(bundle) : null
  }

  async function commitLifecycle({ engagement, event, entitlement, expectedVersion }) {
    const engagementId = engagement?.engagementId
    const current = engagementId ? store.get(engagementId) : null
    if (!current) return { ok: false, reason: 'persistence_failed' }
    if (engagement.organizationId !== current.engagement.organizationId) {
      return { ok: false, reason: 'persistence_failed' }
    }

    const existingEvent = event?.eventId ? findEventById(current.events, event.eventId) : null
    if (existingEvent) {
      if (!sameEvent(existingEvent, event)) {
        return { ok: false, reason: 'persistence_failed', domainReason: 'event_id_conflict' }
      }
      return { ok: true, version: current.version, duplicate: true }
    }

    if (current.version !== expectedVersion) {
      return { ok: false, reason: 'version_conflict', currentVersion: current.version }
    }

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

    const next = {
      engagement: applied.engagement,
      events: applied.events,
      entitlements: applied.grants,
      payments: current.payments,
      version: current.version + 1,
    }

    store.set(engagementId, clone(next))
    return { ok: true, version: next.version, duplicate: false }
  }

  async function createPaymentIntent({ engagement, event, payment, expectedVersion }) {
    const engagementId = engagement?.engagementId
    const current = engagementId ? store.get(engagementId) : null
    if (!current) return { ok: false, reason: 'persistence_failed' }
    if (engagement.organizationId !== current.engagement.organizationId) {
      return { ok: false, reason: 'persistence_failed', domainReason: 'payment_scope_mismatch' }
    }

    const existingEvent = event?.eventId ? findEventById(current.events, event.eventId) : null
    const existingPayment = current.payments.find(item =>
      item.paymentId === payment?.paymentId ||
      (payment?.idempotencyKey && item.idempotencyKey === payment.idempotencyKey)
    )

    if (existingEvent || existingPayment) {
      if (existingEvent && existingPayment && sameEvent(existingEvent, event) && samePayment(existingPayment, payment)) {
        return { ok: true, version: current.version, duplicate: true, payment: clone(existingPayment) }
      }
      return { ok: false, reason: 'persistence_failed', domainReason: existingEvent ? 'event_id_conflict' : 'payment_intent_conflict' }
    }

    if (current.version !== expectedVersion) {
      return { ok: false, reason: 'version_conflict', currentVersion: current.version }
    }
    if (!validPendingPayment(payment, current.engagement)) {
      return { ok: false, reason: 'persistence_failed', domainReason: 'invalid_payment_intent' }
    }

    const applied = applyLifecycleEvent({
      engagement: current.engagement,
      events: current.events,
      grants: current.entitlements,
      event,
    })
    if (!applied.ok) {
      return { ok: false, reason: 'persistence_failed', domainReason: applied.reason }
    }

    const next = {
      engagement: applied.engagement,
      events: applied.events,
      entitlements: current.entitlements,
      payments: [...current.payments, clone(payment)],
      version: current.version + 1,
    }
    store.set(engagementId, clone(next))
    return { ok: true, version: next.version, duplicate: false, payment: clone(payment) }
  }

  return {
    bootstrapEngagement,
    loadEngagementBundle,
    commitLifecycle,
    createPaymentIntent,
    snapshot(engagementId) {
      const bundle = store.get(engagementId)
      return bundle ? clone(bundle) : null
    },
  }
}

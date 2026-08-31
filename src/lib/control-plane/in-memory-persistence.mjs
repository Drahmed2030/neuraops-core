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

  return {
    async bootstrapEngagement(input) {
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
    },

    async loadEngagementBundle(engagementId) {
      const bundle = store.get(engagementId)
      return bundle ? clone(bundle) : null
    },

    async commitLifecycle({ engagement, event, entitlement, expectedVersion }) {
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
    },

    snapshot(engagementId) {
      const bundle = store.get(engagementId)
      return bundle ? clone(bundle) : null
    },
  }
}

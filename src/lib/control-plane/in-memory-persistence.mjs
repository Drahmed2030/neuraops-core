import { findEventById, sameEvent } from './event-ledger.mjs'
import { applyLifecycleEvent } from './lifecycle.mjs'

function clone(value) {
  return structuredClone(value)
}

export function createInMemoryControlPlanePersistence(initialBundles = []) {
  const store = new Map()

  for (const bundle of initialBundles) {
    if (!bundle?.engagement?.engagementId) throw new Error('invalid_initial_bundle')
    store.set(bundle.engagement.engagementId, clone({
      engagement: bundle.engagement,
      events: bundle.events ?? [],
      entitlements: bundle.entitlements ?? [],
      payments: bundle.payments ?? [],
      version: bundle.version ?? 0,
    }))
  }

  return {
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

      // Idempotency is checked before optimistic concurrency. This covers the case
      // where the first commit succeeded but its response was lost and the caller
      // retries the exact same event with a stale expectedVersion.
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

      // Atomic swap: nothing is visible until the whole domain operation succeeds.
      store.set(engagementId, clone(next))
      return { ok: true, version: next.version, duplicate: false }
    },

    // Test/dev-only introspection. Not part of the production persistence port.
    snapshot(engagementId) {
      const bundle = store.get(engagementId)
      return bundle ? clone(bundle) : null
    },
  }
}

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
      if (current.version !== expectedVersion) {
        return { ok: false, reason: 'version_conflict', currentVersion: current.version }
      }
      if (engagement.organizationId !== current.engagement.organizationId) {
        return { ok: false, reason: 'persistence_failed' }
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

      // Exact webhook retries are successful no-ops and do not advance the version.
      if (applied.duplicate) {
        return { ok: true, version: current.version, duplicate: true }
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

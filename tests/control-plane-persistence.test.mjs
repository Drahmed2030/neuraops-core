import test from 'node:test'
import assert from 'node:assert/strict'
import { createInMemoryControlPlanePersistence } from '../src/lib/control-plane/in-memory-persistence.mjs'

function seed(state = 'AUDIT_STARTED') {
  return {
    engagement: {
      engagementId: 'eng-1',
      organizationId: 'org-1',
      product: 'nexus',
      kind: 'audit',
      state,
    },
    events: [],
    entitlements: [],
    payments: [],
    version: 0,
  }
}

function event(overrides = {}) {
  return {
    eventId: 'evt-1',
    type: 'AUDIT_COMPLETED',
    occurredAt: '2026-09-01T01:00:00Z',
    organizationId: 'org-1',
    engagementId: 'eng-1',
    actor: { type: 'system' },
    payload: { score: 81 },
    ...overrides,
  }
}

test('atomic lifecycle commit updates state and event together', async () => {
  const adapter = createInMemoryControlPlanePersistence([seed()])
  const before = await adapter.loadEngagementBundle('eng-1')
  const result = await adapter.commitLifecycle({ engagement: before.engagement, event: event(), expectedVersion: before.version })
  assert.deepEqual(result, { ok: true, version: 1, duplicate: false })
  const after = await adapter.loadEngagementBundle('eng-1')
  assert.equal(after.engagement.state, 'AUDIT_COMPLETED')
  assert.equal(after.events.length, 1)
  assert.equal(after.events[0].eventId, 'evt-1')
  assert.equal(after.version, 1)
})

test('two writers from the same version cannot both commit', async () => {
  const adapter = createInMemoryControlPlanePersistence([seed()])
  const writerA = await adapter.loadEngagementBundle('eng-1')
  const writerB = await adapter.loadEngagementBundle('eng-1')
  const first = await adapter.commitLifecycle({ engagement: writerA.engagement, event: event(), expectedVersion: writerA.version })
  assert.equal(first.ok, true)
  assert.equal(first.version, 1)
  const second = await adapter.commitLifecycle({ engagement: writerB.engagement, event: event({ eventId: 'evt-2' }), expectedVersion: writerB.version })
  assert.equal(second.ok, false)
  assert.equal(second.reason, 'version_conflict')
  assert.equal(second.currentVersion, 1)
  const final = await adapter.loadEngagementBundle('eng-1')
  assert.equal(final.version, 1)
  assert.equal(final.events.length, 1)
  assert.equal(final.events[0].eventId, 'evt-1')
})

test('failed domain transition rolls back the whole bundle', async () => {
  const adapter = createInMemoryControlPlanePersistence([seed('AUDIT_COMPLETED')])
  const before = await adapter.loadEngagementBundle('eng-1')
  const result = await adapter.commitLifecycle({ engagement: before.engagement, event: event({ eventId: 'evt-invalid', type: 'PILOT_STARTED' }), expectedVersion: before.version })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'persistence_failed')
  assert.equal(result.domainReason, 'transition_not_allowed')
  const after = await adapter.loadEngagementBundle('eng-1')
  assert.deepEqual(after, before)
})

test('entitlement failure does not persist event, state, or partial grant', async () => {
  const adapter = createInMemoryControlPlanePersistence([seed('PAYMENT_CONFIRMED')])
  const before = await adapter.loadEngagementBundle('eng-1')
  const entitlementEvent = event({ eventId: 'evt-ent-1', type: 'ENTITLEMENT_GRANTED', payload: {} })
  const result = await adapter.commitLifecycle({
    engagement: before.engagement,
    event: entitlementEvent,
    entitlement: { organizationId: 'org-2', key: 'nexus.pilot_workspace', status: 'active', source: 'payment', startsAt: '2026-09-01T01:00:00Z' },
    expectedVersion: before.version,
  })
  assert.equal(result.ok, false)
  assert.equal(result.domainReason, 'entitlement_scope_mismatch')
  const after = await adapter.loadEngagementBundle('eng-1')
  assert.deepEqual(after, before)
})

test('exact duplicate event is a successful no-op without version bump', async () => {
  const adapter = createInMemoryControlPlanePersistence([seed()])
  const before = await adapter.loadEngagementBundle('eng-1')
  const e = event()
  const first = await adapter.commitLifecycle({ engagement: before.engagement, event: e, expectedVersion: 0 })
  assert.equal(first.version, 1)
  const current = await adapter.loadEngagementBundle('eng-1')
  const retry = await adapter.commitLifecycle({ engagement: current.engagement, event: e, expectedVersion: 1 })
  assert.deepEqual(retry, { ok: true, version: 1, duplicate: true })
  const after = await adapter.loadEngagementBundle('eng-1')
  assert.equal(after.version, 1)
  assert.equal(after.events.length, 1)
})

test('exact duplicate retry succeeds even with stale expectedVersion after lost response', async () => {
  const adapter = createInMemoryControlPlanePersistence([seed()])
  const original = await adapter.loadEngagementBundle('eng-1')
  const e = event()
  const first = await adapter.commitLifecycle({ engagement: original.engagement, event: e, expectedVersion: 0 })
  assert.equal(first.version, 1)

  // Simulate a client that never received the first response and retries the same request.
  const retry = await adapter.commitLifecycle({ engagement: original.engagement, event: e, expectedVersion: 0 })
  assert.deepEqual(retry, { ok: true, version: 1, duplicate: true })

  const after = await adapter.loadEngagementBundle('eng-1')
  assert.equal(after.version, 1)
  assert.equal(after.events.length, 1)
})

test('stale retry with same eventId but conflicting content is rejected, not treated as version conflict', async () => {
  const adapter = createInMemoryControlPlanePersistence([seed()])
  const original = await adapter.loadEngagementBundle('eng-1')
  const e = event()
  await adapter.commitLifecycle({ engagement: original.engagement, event: e, expectedVersion: 0 })

  const conflicting = await adapter.commitLifecycle({
    engagement: original.engagement,
    event: event({ payload: { score: 22 } }),
    expectedVersion: 0,
  })
  assert.equal(conflicting.ok, false)
  assert.equal(conflicting.reason, 'persistence_failed')
  assert.equal(conflicting.domainReason, 'event_id_conflict')
})

test('loaded bundles are defensive copies and cannot mutate persistence by reference', async () => {
  const adapter = createInMemoryControlPlanePersistence([seed()])
  const loaded = await adapter.loadEngagementBundle('eng-1')
  loaded.engagement.state = 'CLOSED'
  loaded.events.push(event())
  const reloaded = await adapter.loadEngagementBundle('eng-1')
  assert.equal(reloaded.engagement.state, 'AUDIT_STARTED')
  assert.equal(reloaded.events.length, 0)
})

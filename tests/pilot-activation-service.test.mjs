import test from 'node:test'
import assert from 'node:assert/strict'
import { createInMemoryControlPlanePersistence } from '../src/lib/control-plane/in-memory-persistence.mjs'
import { createPilotActivationService } from '../src/lib/control-plane/pilot-activation-service.mjs'

function seed(entitlements = []) {
  return {
    engagement: {
      engagementId: 'eng-1',
      organizationId: 'org-1',
      product: 'nexus',
      kind: 'nexus_lifecycle',
      state: 'PILOT_READY',
    },
    events: [],
    entitlements,
    payments: [],
    version: 8,
  }
}

const activeGrant = {
  organizationId: 'org-1',
  key: 'nexus.pilot_workspace',
  status: 'active',
  source: 'payment',
  startsAt: '2026-09-01T00:00:00Z',
}

test('pilot starts only with active entitlement', async () => {
  const persistence = createInMemoryControlPlanePersistence([seed([activeGrant])])
  const service = createPilotActivationService({
    persistence,
    clock: () => new Date('2026-09-01T01:00:00Z'),
  })

  const result = await service.startPilot({ engagementId: 'eng-1', actorId: 'operator-1' })
  assert.equal(result.ok, true)
  assert.equal(result.version, 9)

  const bundle = await persistence.loadEngagementBundle('eng-1')
  assert.equal(bundle.engagement.state, 'PILOT_ACTIVE')
  assert.equal(bundle.events[0].type, 'PILOT_STARTED')
})

test('pilot cannot start without entitlement', async () => {
  const persistence = createInMemoryControlPlanePersistence([seed([])])
  const service = createPilotActivationService({
    persistence,
    clock: () => new Date('2026-09-01T01:00:00Z'),
  })

  const result = await service.startPilot({ engagementId: 'eng-1' })
  assert.deepEqual(result, { ok: false, reason: 'pilot_entitlement_not_active' })
  const bundle = await persistence.loadEngagementBundle('eng-1')
  assert.equal(bundle.engagement.state, 'PILOT_READY')
  assert.equal(bundle.version, 8)
})

test('future entitlement does not activate pilot early', async () => {
  const persistence = createInMemoryControlPlanePersistence([seed([{
    ...activeGrant,
    startsAt: '2026-09-01T02:00:00Z',
  }])])
  const service = createPilotActivationService({
    persistence,
    clock: () => new Date('2026-09-01T01:00:00Z'),
  })

  const result = await service.startPilot({ engagementId: 'eng-1' })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'pilot_entitlement_not_active')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createOperationsSnapshot,
  deriveRuntimeStatus,
  deriveTrustPosture,
} from '../src/lib/trust/operations-read-model.mjs'

test('absence of telemetry is UNKNOWN rather than falsely healthy', () => {
  assert.equal(deriveRuntimeStatus([]), 'UNKNOWN')
  const snapshot = createOperationsSnapshot({ generatedAt: '2026-09-01T18:40:00.000Z' })
  assert.equal(snapshot.runtimeStatus, 'UNKNOWN')
  assert.equal(snapshot.mode, 'read-only')
})

test('incident and degraded service states dominate healthy statuses', () => {
  assert.equal(deriveRuntimeStatus([
    { runtimeStatus: 'HEALTHY' },
    { runtimeStatus: 'DEGRADED' },
  ]), 'DEGRADED')
  assert.equal(deriveRuntimeStatus([
    { runtimeStatus: 'HEALTHY' },
    { runtimeStatus: 'INCIDENT' },
  ]), 'INCIDENT')
})

test('known recovery gaps produce ACTION_REQUIRED trust posture', () => {
  assert.equal(deriveTrustPosture({
    recovery: { verified: 0, partial: 2, gaps: 1, tier0Gaps: [] },
    openIncidents: [],
  }), 'ACTION_REQUIRED')
})

test('high or critical incident requires action even without recovery gaps', () => {
  assert.equal(deriveTrustPosture({
    recovery: { verified: 4, partial: 0, gaps: 0, tier0Gaps: [] },
    openIncidents: [{ severity: 'high' }],
  }), 'ACTION_REQUIRED')
})

test('operations snapshot has no mutation authority', () => {
  const snapshot = createOperationsSnapshot({
    services: [{ service: 'api', runtimeStatus: 'HEALTHY', measuredAt: '2026-09-01T18:40:00.000Z' }],
    recovery: { total: 1, verified: 1, partial: 0, gaps: 0, tier0Gaps: [] },
    openIncidents: [],
  })
  assert.equal(snapshot.runtimeStatus, 'HEALTHY')
  assert.equal(snapshot.trustPosture, 'HEALTHY')
  assert.deepEqual(snapshot.authority, {
    canMutateProduction: false,
    canMerge: false,
    canDeploy: false,
    canGrantEntitlement: false,
    canRotateCredentials: false,
  })
})

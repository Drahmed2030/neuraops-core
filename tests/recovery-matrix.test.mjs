import test from 'node:test'
import assert from 'node:assert/strict'
import {
  RECOVERY_MATRIX,
  recoverySummary,
  validateRecoveryMatrix,
  validateRecoveryObjective,
} from '../src/lib/trust/recovery-matrix.mjs'

test('recovery matrix is structurally valid and has unique services', () => {
  assert.equal(validateRecoveryMatrix(), true)
  assert.equal(new Set(RECOVERY_MATRIX.map((item) => item.service)).size, RECOVERY_MATRIX.length)
})

test('verified recovery claims cannot exist without evidence', () => {
  assert.throws(() => validateRecoveryObjective({
    service: 'example', product: 'shared', tier: 1,
    rtoMinutes: 60, rpoMinutes: 0,
    degradedMode: 'safe fallback', dependencies: [],
    readiness: 'verified', objectiveStatus: 'verified', evidenceRefs: [],
    recoveryOwner: 'platform-operations', restoreDrillCadenceDays: 90,
  }), /require evidence/)
})

test('verified readiness and objective status cannot contradict each other', () => {
  const objective = {
    service: 'example', product: 'shared', tier: 1,
    rtoMinutes: 60, rpoMinutes: 0,
    degradedMode: 'safe fallback', dependencies: [],
    readiness: 'verified', objectiveStatus: 'target', evidenceRefs: ['evidence:1'],
    recoveryOwner: 'platform-operations', restoreDrillCadenceDays: 90,
  }
  assert.throws(() => validateRecoveryObjective(objective), /must agree/)
})

test('current matrix distinguishes targets from proven recovery', () => {
  for (const item of RECOVERY_MATRIX) {
    assert.equal(item.objectiveStatus, 'target')
    assert.deepEqual(item.evidenceRefs, [])
  }
  const summary = recoverySummary()
  assert.equal(summary.verified, 0)
  assert.ok(summary.partial > 0)
  assert.ok(summary.gaps > 0)
})

test('tier zero services fail closed or preserve safe degraded operation', () => {
  const tier0 = RECOVERY_MATRIX.filter((item) => item.tier === 0)
  assert.ok(tier0.length >= 3)
  for (const item of tier0) {
    assert.ok(item.degradedMode.length > 20)
    assert.notEqual(item.readiness, 'verified')
  }
})

test('payment recovery does not grant entitlement without verified evidence', () => {
  const payment = RECOVERY_MATRIX.find((item) => item.service === 'b2b-payment-provider')
  assert.equal(payment.readiness, 'gap')
  assert.match(payment.degradedMode, /Do not activate paid entitlement without verified settlement evidence/)
})

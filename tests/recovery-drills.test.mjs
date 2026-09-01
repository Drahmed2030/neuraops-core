import test from 'node:test'
import assert from 'node:assert/strict'
import { createEvidenceRecord } from '../src/lib/trust/evidence.mjs'
import { buildOperationsReadModel } from '../src/lib/trust/operations-read-model.mjs'
import {
  createRecoveryDrillRecord,
  validateRecoveryDrillRecord,
} from '../src/lib/trust/recovery-drills.mjs'

const STARTED_AT = '2026-08-01T10:00:00.000Z'
const COMPLETED_AT = '2026-08-01T10:40:00.000Z'
const GENERATED_AT = '2026-08-02T10:00:00.000Z'

function objective(overrides = {}) {
  return {
    service: 'vercel-runtime',
    product: 'neuraops',
    tier: 0,
    rtoMinutes: 60,
    rpoMinutes: 0,
    degradedMode: 'Preserve the last known-good deployment and block unsafe releases.',
    dependencies: ['github-source', 'vercel-platform'],
    readiness: 'partial',
    objectiveStatus: 'target',
    evidenceRefs: [],
    recoveryOwner: 'platform-operations',
    restoreDrillCadenceDays: 90,
    ...overrides,
  }
}

function evidence(overrides = {}) {
  return createEvidenceRecord({
    evidenceId: 'evidence:redeploy-drill-1',
    kind: 'recovery-drill',
    source: 'recovery-evidence-adapter',
    product: 'neuraops',
    environment: 'preview',
    integritySha256: 'd'.repeat(64),
    classification: 'internal',
    retentionClass: 'audit',
    generatedAt: COMPLETED_AT,
    ...overrides,
  })
}

function completedDrill(overrides = {}) {
  return createRecoveryDrillRecord({
    drillRef: 'drill:vercel-redeploy-1',
    service: 'vercel-runtime',
    objectiveVersion: 'v1',
    exerciseType: 'redeploy',
    state: 'completed',
    outcome: 'passed',
    startedAt: STARTED_AT,
    completedAt: COMPLETED_AT,
    achievedRtoMinutes: 40,
    achievedRpoMinutes: 0,
    evidenceRefs: ['evidence:redeploy-drill-1'],
    approvalRef: 'operator:recovery-approver-1',
    source: 'recovery-drill-recorder',
    product: 'neuraops',
    environment: 'preview',
    classification: 'internal',
    ...overrides,
  })
}

test('recovery drill records retain only bounded metadata and opaque references', () => {
  const record = createRecoveryDrillRecord({
    drillRef: 'drill:planned-restore-1',
    service: 'supabase-core',
    objectiveVersion: 'v1',
    exerciseType: 'restore',
    state: 'planned',
    startedAt: STARTED_AT,
    source: 'recovery-drill-recorder',
    product: 'shared',
    environment: 'preview',
    classification: 'internal',
  })

  assert.match(record.drillRef, /^[a-f0-9]{64}$/)
  assert.equal(record.approvalRef, null)
  assert.throws(() => createRecoveryDrillRecord({ ...record, payload: { backup: 'raw' } }), /Unsupported recovery drill field/)
  assert.throws(() => createRecoveryDrillRecord({ ...record, patient: 'must-not-enter' }), /Unsupported recovery drill field/)
  assert.throws(() => validateRecoveryDrillRecord({ ...record, drillRef: 'raw-drill-id' }), /must be opaque/)
})

test('default recovery drill posture is honest, non-executable, and persistence-free', () => {
  const model = buildOperationsReadModel({
    recoveryMatrix: [objective()],
    generatedAt: GENERATED_AT,
  })

  assert.equal(model.recoveryDrills.drillMode, 'evidence-records-only')
  assert.equal(model.recoveryDrills.executionAllowed, false)
  assert.equal(model.recoveryDrills.persistenceEnabled, false)
  assert.equal(model.recoveryDrills.summary.totalDrills, 0)
  assert.equal(model.recoveryDrills.summary.objectivesNotRun, 1)
  assert.equal(model.recoveryDrills.objectives[0].status, 'not-run')
})

test('evidence-backed drill verifies its objective without projecting raw evidence or approval IDs', () => {
  const record = completedDrill()
  const model = buildOperationsReadModel({
    evidenceRecords: [evidence()],
    recoveryDrillRecords: [record],
    recoveryMatrix: [objective()],
    generatedAt: GENERATED_AT,
  })
  const serialized = JSON.stringify(model.recoveryDrills)

  assert.equal(model.recoveryDrills.summary.verifiedDrills, 1)
  assert.equal(model.recoveryDrills.objectives[0].status, 'verified')
  assert.equal(model.recoveryDrills.drills[0].objectiveResult, 'met')
  assert.equal(model.recoveryDrills.drills[0].verificationStatus, 'verified')
  assert.equal(model.recoveryDrills.drills[0].approvalPresent, true)
  assert.equal(model.recovery.objectives[0].readiness, 'partial')
  assert.equal(model.recovery.objectives[0].objectiveStatus, 'target')
  assert.doesNotMatch(serialized, /evidence:redeploy-drill-1|operator:recovery-approver-1/)
})

test('missing evidence keeps a declared pass verification-pending', () => {
  const model = buildOperationsReadModel({
    recoveryDrillRecords: [completedDrill()],
    recoveryMatrix: [objective()],
    generatedAt: GENERATED_AT,
  })

  assert.equal(model.recoveryDrills.summary.verifiedDrills, 0)
  assert.equal(model.recoveryDrills.summary.verificationPendingDrills, 1)
  assert.equal(model.recoveryDrills.summary.unresolvedEvidenceRefs, 1)
  assert.equal(model.recoveryDrills.objectives[0].status, 'verification-pending')
  assert.deepEqual(model.recoveryDrills.verificationIssues, [{
    drillRef: completedDrill().drillRef,
    service: 'vercel-runtime',
    reason: 'unresolved-evidence',
  }])
})

test('evidence cannot cross product or environment boundaries', () => {
  const productMismatch = buildOperationsReadModel({
    evidenceRecords: [evidence({ product: 'cliniverse' })],
    recoveryDrillRecords: [completedDrill()],
    recoveryMatrix: [objective()],
    generatedAt: GENERATED_AT,
  })
  const environmentMismatch = buildOperationsReadModel({
    evidenceRecords: [evidence({ environment: 'production' })],
    recoveryDrillRecords: [completedDrill()],
    recoveryMatrix: [objective()],
    generatedAt: GENERATED_AT,
  })

  assert.equal(productMismatch.recoveryDrills.summary.crossProductEvidenceRefs, 1)
  assert.equal(productMismatch.recoveryDrills.drills[0].verificationStatus, 'verification-pending')
  assert.equal(environmentMismatch.recoveryDrills.summary.crossEnvironmentEvidenceRefs, 1)
  assert.equal(environmentMismatch.recoveryDrills.drills[0].verificationStatus, 'verification-pending')
})

test('unrelated, short-lived, stale, or future evidence cannot verify a drill', () => {
  const variants = [
    evidence({ kind: 'control-check' }),
    evidence({ retentionClass: 'operational' }),
    evidence({ generatedAt: '2026-07-31T23:59:59.999Z' }),
    evidence({ generatedAt: '2026-08-03T00:00:00.000Z' }),
  ]

  for (const invalidEvidence of variants) {
    const model = buildOperationsReadModel({
      evidenceRecords: [invalidEvidence],
      recoveryDrillRecords: [completedDrill()],
      recoveryMatrix: [objective()],
      generatedAt: GENERATED_AT,
    })
    assert.equal(model.recoveryDrills.summary.invalidEvidenceRefs, 1)
    assert.equal(model.recoveryDrills.drills[0].evidence.invalid, 1)
    assert.equal(model.recoveryDrills.drills[0].verificationStatus, 'verification-pending')
    assert.equal(model.recoveryDrills.verificationIssues[0].reason, 'invalid-evidence-contract')
  }
})

test('a recovery drill cannot claim a different product than its objective', () => {
  const record = completedDrill({ product: 'cliniverse' })

  assert.throws(() => buildOperationsReadModel({
    evidenceRecords: [evidence({ product: 'cliniverse' })],
    recoveryDrillRecords: [record],
    recoveryMatrix: [objective()],
    generatedAt: GENERATED_AT,
  }), /product boundary violation/)
})

test('missed RTO or RPO stays unverified and requires remediation', () => {
  const model = buildOperationsReadModel({
    evidenceRecords: [evidence()],
    recoveryDrillRecords: [completedDrill({ achievedRtoMinutes: 61 })],
    recoveryMatrix: [objective()],
    generatedAt: GENERATED_AT,
  })

  assert.equal(model.recoveryDrills.summary.verifiedDrills, 0)
  assert.equal(model.recoveryDrills.summary.verificationPendingDrills, 0)
  assert.equal(model.recoveryDrills.summary.objectiveMissedDrills, 1)
  assert.equal(model.recoveryDrills.drills[0].objectiveResult, 'missed')
  assert.equal(model.recoveryDrills.drills[0].verificationStatus, 'unverified')
  assert.equal(model.recoveryDrills.objectives[0].status, 'needs-remediation')
  assert.equal(model.recoveryDrills.verificationIssues[0].reason, 'objective-missed')
})

test('verified drill becomes overdue only after its declared cadence', () => {
  const model = buildOperationsReadModel({
    evidenceRecords: [evidence()],
    recoveryDrillRecords: [completedDrill()],
    recoveryMatrix: [objective({ restoreDrillCadenceDays: 30 })],
    generatedAt: '2026-09-01T10:40:00.001Z',
  })

  assert.equal(model.recoveryDrills.objectives[0].status, 'overdue')
  assert.equal(model.recoveryDrills.summary.objectivesOverdue, 1)
  assert.equal(model.recoveryDrills.objectives[0].nextDueAt, '2026-08-31T10:40:00.000Z')
})

test('a later failed drill supersedes an older verified posture', () => {
  const failedEvidence = evidence({ evidenceId: 'evidence:redeploy-drill-2', integritySha256: 'e'.repeat(64), generatedAt: '2026-08-10T11:00:00.000Z' })
  const failed = completedDrill({
    drillRef: 'drill:vercel-redeploy-2',
    outcome: 'failed',
    startedAt: '2026-08-10T10:00:00.000Z',
    completedAt: '2026-08-10T11:00:00.000Z',
    evidenceRefs: [failedEvidence.evidenceId],
    approvalRef: null,
  })
  const model = buildOperationsReadModel({
    evidenceRecords: [evidence(), failedEvidence],
    recoveryDrillRecords: [completedDrill(), failed],
    recoveryMatrix: [objective()],
    generatedAt: '2026-08-11T10:00:00.000Z',
  })

  assert.equal(model.recoveryDrills.summary.verifiedDrills, 1)
  assert.equal(model.recoveryDrills.objectives[0].status, 'needs-remediation')
  assert.equal(model.recoveryDrills.objectives[0].verifiedDrills, 1)
})

test('completed drill lifecycle requires metrics, evidence, and approval for a pass', () => {
  assert.throws(() => completedDrill({ achievedRtoMinutes: null }), /require achieved RTO and RPO/)
  assert.throws(() => completedDrill({ evidenceRefs: [] }), /require evidence/)
  assert.throws(() => completedDrill({ approvalRef: null }), /require opaque approval/)
  assert.throws(() => completedDrill({ completedAt: '2026-08-01T09:00:00.000Z' }), /cannot precede/)
})

test('completed drill timestamps cannot claim a future result', () => {
  assert.throws(() => buildOperationsReadModel({
    evidenceRecords: [evidence()],
    recoveryDrillRecords: [completedDrill()],
    recoveryMatrix: [objective()],
    generatedAt: '2026-08-01T10:39:59.999Z',
  }), /cannot be after generatedAt/)
})

test('a riskier result wins when two drills share the latest completion time', () => {
  const failedEvidence = evidence({ evidenceId: 'evidence:redeploy-drill-risk', integritySha256: 'f'.repeat(64) })
  const failed = completedDrill({
    drillRef: 'drill:vercel-redeploy-risk',
    outcome: 'failed',
    evidenceRefs: [failedEvidence.evidenceId],
    approvalRef: null,
  })
  const model = buildOperationsReadModel({
    evidenceRecords: [evidence(), failedEvidence],
    recoveryDrillRecords: [completedDrill(), failed],
    recoveryMatrix: [objective()],
    generatedAt: GENERATED_AT,
  })

  assert.equal(model.recoveryDrills.objectives[0].status, 'needs-remediation')
})

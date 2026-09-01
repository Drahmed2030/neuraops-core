import test from 'node:test'
import assert from 'node:assert/strict'
import { createEvidenceRecord, indexEvidenceRecords } from '../src/lib/trust/evidence.mjs'
import { buildOperationsReadModel } from '../src/lib/trust/operations-read-model.mjs'
import { createTrustEvent } from '../src/lib/trust/trust-event.mjs'

const GENERATED_AT = '2026-09-01T19:00:00.000Z'

function recoveryObjective(overrides = {}) {
  return {
    service: 'example-service',
    product: 'neuraops',
    tier: 1,
    rtoMinutes: 60,
    rpoMinutes: 0,
    degradedMode: 'Fail closed and preserve a safe read-only operating path.',
    dependencies: ['authoritative-source'],
    readiness: 'partial',
    objectiveStatus: 'target',
    evidenceRefs: [],
    recoveryOwner: 'platform-operations',
    restoreDrillCadenceDays: 90,
    ...overrides,
  }
}

test('evidence records retain only allowlisted metadata and opaque location references', () => {
  const record = createEvidenceRecord({
    evidenceId: 'evidence:restore-drill-1',
    kind: 'recovery-drill',
    source: 'github-actions-adapter',
    product: 'neuraops',
    environment: 'preview',
    integritySha256: 'A'.repeat(64),
    classification: 'internal',
    retentionClass: 'audit',
    generatedAt: GENERATED_AT,
    locationRef: 'https://provider.example/private/run/123',
  })

  assert.equal(record.integritySha256, 'a'.repeat(64))
  assert.match(record.locationRef, /^[a-f0-9]{64}$/)
  assert.doesNotMatch(JSON.stringify(record), /provider\.example|private\/run/)
  assert.throws(() => createEvidenceRecord({ ...record, payload: 'must-not-enter-trust-fabric' }), /Unsupported evidence field/)
})

test('evidence index rejects duplicate records', () => {
  const record = createEvidenceRecord({
    evidenceId: 'evidence:duplicate', kind: 'control-check', source: 'test-adapter',
    product: 'shared', environment: 'development', integritySha256: 'b'.repeat(64),
    classification: 'internal', retentionClass: 'operational', generatedAt: GENERATED_AT,
  })

  assert.throws(() => indexEvidenceRecords([record, record]), /Duplicate evidence record/)
})

test('operations read model aggregates metadata without exposing event attributes or clinical content', () => {
  const event = createTrustEvent({
    eventId: 'event:cliniverse-control-1',
    occurredAt: '2026-09-01T18:59:00.000Z',
    domain: 'observability',
    eventType: 'cliniverse.control.health',
    source: 'cliniverse-control-adapter',
    product: 'cliniverse',
    environment: 'preview',
    classification: 'clinical-restricted',
    attributes: { patient: 'Jane Doe', status: 'healthy' },
  })

  const model = buildOperationsReadModel({ events: [event], generatedAt: GENERATED_AT })
  const serialized = JSON.stringify(model)

  assert.equal(model.mode, 'read-only')
  assert.equal(model.trust.totalEvents, 1)
  assert.equal(model.trust.byProduct.cliniverse, 1)
  assert.equal(model.trust.byClassification['clinical-restricted'], 1)
  assert.equal(model.privacy.clinicalDataIncluded, false)
  assert.equal(model.incidentLineage.replayMode, 'metadata-only')
  assert.equal(model.incidentLineage.executionAllowed, false)
  assert.equal(model.incidentLineage.summary.totalIncidents, 0)
  assert.equal(model.recoveryDrills.drillMode, 'evidence-records-only')
  assert.equal(model.recoveryDrills.executionAllowed, false)
  assert.equal(model.recoveryDrills.persistenceEnabled, false)
  assert.equal(model.recoveryDrills.summary.totalDrills, 0)
  assert.doesNotMatch(serialized, /Jane Doe|attributes|\[REDACTED\]/)
  assert.equal(Object.isFrozen(model), true)
})

test('recovery verification resolves evidence only within the approved product boundary', () => {
  const evidence = createEvidenceRecord({
    evidenceId: 'evidence:neuraops-restore-1',
    kind: 'recovery-drill',
    source: 'recovery-adapter',
    product: 'neuraops',
    environment: 'preview',
    integritySha256: 'c'.repeat(64),
    classification: 'internal',
    retentionClass: 'audit',
    generatedAt: GENERATED_AT,
  })

  const model = buildOperationsReadModel({
    evidenceRecords: [evidence],
    recoveryMatrix: [
      recoveryObjective({
        service: 'neuraops-runtime',
        readiness: 'verified',
        objectiveStatus: 'verified',
        evidenceRefs: [evidence.evidenceId],
      }),
      recoveryObjective({
        service: 'cliniverse-entitlements',
        product: 'cliniverse',
        readiness: 'verified',
        objectiveStatus: 'verified',
        evidenceRefs: [evidence.evidenceId],
      }),
    ],
    generatedAt: GENERATED_AT,
  })

  const neuraops = model.recovery.objectives.find((item) => item.service === 'neuraops-runtime')
  const cliniverse = model.recovery.objectives.find((item) => item.service === 'cliniverse-entitlements')

  assert.equal(neuraops.readiness, 'verified')
  assert.equal(neuraops.objectiveStatus, 'verified')
  assert.equal(cliniverse.readiness, 'partial')
  assert.equal(cliniverse.objectiveStatus, 'target')
  assert.equal(cliniverse.evidence.scopeMismatch, 1)
  assert.equal(model.recovery.summary.crossProductEvidenceRefs, 1)
  assert.deepEqual(model.recovery.verificationIssues, [
    { service: 'cliniverse-entitlements', reason: 'product-scope-mismatch' },
  ])
})

test('missing recovery evidence fails closed to a target rather than a verified claim', () => {
  const model = buildOperationsReadModel({
    recoveryMatrix: [recoveryObjective({
      readiness: 'verified',
      objectiveStatus: 'verified',
      evidenceRefs: ['evidence:missing'],
    })],
    generatedAt: GENERATED_AT,
  })

  assert.equal(model.recovery.summary.verified, 0)
  assert.equal(model.recovery.summary.partial, 1)
  assert.equal(model.recovery.summary.unresolvedEvidenceRefs, 1)
  assert.equal(model.recovery.objectives[0].objectiveStatus, 'target')
})

test('read model rejects manually constructed unsanitized trust events', () => {
  const event = createTrustEvent({
    eventId: 'event:safe', domain: 'evidence', eventType: 'evidence.created',
    source: 'test-adapter', product: 'shared', environment: 'development',
    classification: 'internal', occurredAt: GENERATED_AT,
  })

  assert.throws(() => buildOperationsReadModel({
    events: [{ ...event, attributes: { token: 'raw-token' } }],
    generatedAt: GENERATED_AT,
  }), /Unsanitized trust attribute/)
})

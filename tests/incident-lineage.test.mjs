import test from 'node:test'
import assert from 'node:assert/strict'
import { createEvidenceRecord } from '../src/lib/trust/evidence.mjs'
import {
  createIncidentLineageRecord,
  validateIncidentLineageRecord,
} from '../src/lib/trust/incident-lineage.mjs'
import { buildOperationsReadModel } from '../src/lib/trust/operations-read-model.mjs'
import { createTrustEvent } from '../src/lib/trust/trust-event.mjs'

const GENERATED_AT = '2026-09-01T21:30:00.000Z'

function lineageRecord(overrides = {}) {
  return createIncidentLineageRecord({
    lineageRef: 'lineage:incident-1:step-1',
    incidentRef: 'incident:private-123',
    phase: 'detected',
    outcome: 'observed',
    sequence: 1,
    occurredAt: '2026-09-01T21:00:00.000Z',
    source: 'ntrp-runtime-sensor',
    product: 'neuraops',
    environment: 'preview',
    classification: 'internal',
    evidenceRefs: [],
    ...overrides,
  })
}

test('incident lineage records retain only opaque references and allowlisted metadata', () => {
  const record = lineageRecord({
    eventRef: 'event:private-456',
    predecessorRef: 'lineage:private-predecessor',
  })

  assert.equal(validateIncidentLineageRecord(record), true)
  assert.match(record.lineageRef, /^[a-f0-9]{64}$/)
  assert.match(record.incidentRef, /^[a-f0-9]{64}$/)
  assert.match(record.predecessorRef, /^[a-f0-9]{64}$/)
  assert.match(record.eventRef, /^[a-f0-9]{64}$/)
  assert.doesNotMatch(JSON.stringify(record), /private-123|private-456|private-predecessor/)
  assert.equal(Object.isFrozen(record), true)
  assert.equal(Object.isFrozen(record.evidenceRefs), true)

  assert.throws(() => lineageRecord({ payload: { patient: 'must-not-enter' } }), /Unsupported incident lineage field/)
  assert.throws(() => lineageRecord({ attributes: { clinical_note: 'must-not-enter' } }), /Unsupported incident lineage field/)
})

test('metadata-only replay resolves a coherent event and evidence lineage without raw IDs', () => {
  const detected = createTrustEvent({
    eventId: 'event:incident-detected',
    domain: 'incident',
    eventType: 'incident.detected',
    source: 'ntrp-runtime-sensor',
    product: 'neuraops',
    environment: 'preview',
    classification: 'internal',
    occurredAt: '2026-09-01T21:00:00.000Z',
  })
  const verified = createTrustEvent({
    eventId: 'event:incident-verified',
    domain: 'incident',
    eventType: 'incident.verified',
    source: 'ntrp-review-adapter',
    product: 'neuraops',
    environment: 'preview',
    classification: 'internal',
    occurredAt: '2026-09-01T21:10:00.000Z',
  })
  const evidence = createEvidenceRecord({
    evidenceId: 'evidence:incident-verification-1',
    kind: 'incident-verification',
    source: 'ntrp-review-adapter',
    product: 'neuraops',
    environment: 'preview',
    integritySha256: 'd'.repeat(64),
    classification: 'internal',
    retentionClass: 'audit',
    generatedAt: '2026-09-01T21:11:00.000Z',
  })
  const step1 = lineageRecord({ eventRef: detected.eventId })
  const step2 = lineageRecord({
    lineageRef: 'lineage:incident-1:step-2',
    predecessorRef: step1.lineageRef,
    eventRef: verified.eventId,
    phase: 'verified',
    outcome: 'verified',
    sequence: 2,
    occurredAt: '2026-09-01T21:10:00.000Z',
    source: 'ntrp-review-adapter',
    evidenceRefs: [evidence.evidenceId],
  })

  const model = buildOperationsReadModel({
    events: [detected, verified],
    evidenceRecords: [evidence],
    lineageRecords: [step2, step1],
    generatedAt: GENERATED_AT,
  })
  const replay = model.incidentLineage.replays[0]
  const serialized = JSON.stringify(model.incidentLineage)

  assert.equal(model.incidentLineage.replayMode, 'metadata-only')
  assert.equal(model.incidentLineage.executionAllowed, false)
  assert.equal(model.incidentLineage.summary.totalIncidents, 1)
  assert.equal(model.incidentLineage.summary.totalSteps, 2)
  assert.equal(replay.status, 'complete')
  assert.equal(replay.verificationStatus, 'verified')
  assert.deepEqual(replay.steps.map((step) => step.predecessor), ['root', 'linked'])
  assert.deepEqual(replay.steps.map((step) => step.event), ['resolved', 'resolved'])
  assert.equal(replay.evidence.resolved, 1)
  assert.doesNotMatch(serialized, /incident:private-123|event:incident-|evidence:incident-verification-1/)
})

test('missing references downgrade declared verification and keep replay partial', () => {
  const record = lineageRecord({
    eventRef: 'event:missing',
    phase: 'verified',
    outcome: 'verified',
    evidenceRefs: ['evidence:missing'],
  })
  const model = buildOperationsReadModel({
    lineageRecords: [record],
    generatedAt: GENERATED_AT,
  })
  const replay = model.incidentLineage.replays[0]

  assert.equal(replay.status, 'partial')
  assert.equal(replay.verificationStatus, 'unverified')
  assert.equal(replay.steps[0].phase, 'verification-pending')
  assert.equal(replay.steps[0].outcome, 'unresolved')
  assert.equal(model.incidentLineage.summary.unresolvedEventRefs, 1)
  assert.equal(model.incidentLineage.summary.unresolvedEvidenceRefs, 1)
  assert.deepEqual(model.incidentLineage.verificationIssues, [{
    lineageRef: record.lineageRef,
    reason: 'unresolved-evidence',
  }])
})

test('a missing predecessor keeps the replay partial without inventing a lineage edge', () => {
  const record = lineageRecord({
    predecessorRef: 'lineage:missing-predecessor',
    sequence: 2,
  })
  const model = buildOperationsReadModel({
    lineageRecords: [record],
    generatedAt: GENERATED_AT,
  })

  assert.equal(model.incidentLineage.replays[0].status, 'partial')
  assert.equal(model.incidentLineage.replays[0].steps[0].predecessor, 'unresolved')
  assert.equal(model.incidentLineage.summary.unresolvedPredecessorRefs, 1)
})

test('cross-product evidence cannot verify an incident lineage step', () => {
  const evidence = createEvidenceRecord({
    evidenceId: 'evidence:cliniverse-only',
    kind: 'incident-verification',
    source: 'cliniverse-control-adapter',
    product: 'cliniverse',
    environment: 'preview',
    integritySha256: 'e'.repeat(64),
    classification: 'clinical-restricted',
    retentionClass: 'audit',
    generatedAt: GENERATED_AT,
  })
  const record = lineageRecord({
    phase: 'verified',
    outcome: 'verified',
    evidenceRefs: [evidence.evidenceId],
  })
  const model = buildOperationsReadModel({
    evidenceRecords: [evidence],
    lineageRecords: [record],
    generatedAt: GENERATED_AT,
  })

  assert.equal(model.incidentLineage.replays[0].steps[0].phase, 'verification-pending')
  assert.equal(model.incidentLineage.summary.crossProductEvidenceRefs, 1)
  assert.equal(model.incidentLineage.verificationIssues[0].reason, 'product-scope-mismatch')
})

test('a shared incident reference cannot combine NeuraOps and Cliniverse timelines', () => {
  const neuraops = lineageRecord()
  const cliniverse = lineageRecord({
    lineageRef: 'lineage:incident-1:cliniverse',
    product: 'cliniverse',
  })

  assert.throws(() => buildOperationsReadModel({
    lineageRecords: [neuraops, cliniverse],
    generatedAt: GENERATED_AT,
  }), /scope boundary violation/)
})

test('verified lineage declarations require agreement and at least one evidence reference', () => {
  assert.throws(() => lineageRecord({
    phase: 'verified',
    outcome: 'restored',
  }), /must agree/)
  assert.throws(() => lineageRecord({
    phase: 'verified',
    outcome: 'verified',
  }), /require evidence/)
})

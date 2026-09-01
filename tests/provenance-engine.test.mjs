import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDecisionProvenance, buildProofProvenance, evidenceHash } from '../src/lib/control-plane/provenance-engine.mjs'

test('evidence hash is deterministic across object key ordering', () => {
  assert.equal(evidenceHash({ b: 2, a: 1 }), evidenceHash({ a: 1, b: 2 }))
})

test('proof provenance requires persisted source event ids and hashes ordered evidence', () => {
  const result = buildProofProvenance({
    engagementId: 'eng-1',
    organizationId: 'org-1',
    measurements: [
      { stage: 'outcome', sourceEventId: 'evt-outcome', recordedAt: '2026-09-01T00:00:02Z', metrics: { leakagePercent: 5 } },
      { stage: 'baseline', sourceEventId: 'evt-baseline', recordedAt: '2026-09-01T00:00:00Z', metrics: { leakagePercent: 10 } },
    ],
  })

  assert.equal(result.ok, true)
  assert.deepEqual(result.provenance.sourceEventIds, ['evt-baseline', 'evt-outcome'])
  assert.match(result.provenance.evidenceHash, /^sha256:[a-f0-9]{64}$/)
})

test('proof provenance fails closed when a measurement has no source event id', () => {
  const result = buildProofProvenance({
    engagementId: 'eng-1',
    organizationId: 'org-1',
    measurements: [
      { stage: 'baseline', recordedAt: '2026-09-01T00:00:00Z', metrics: { leakagePercent: 10 } },
      { stage: 'outcome', sourceEventId: 'evt-outcome', recordedAt: '2026-09-01T00:00:02Z', metrics: { leakagePercent: 5 } },
    ],
  })

  assert.deepEqual(result, { ok: false, reason: 'source_event_id_required', stage: 'baseline' })
})

test('decision provenance binds proof evidence to policy and decision', () => {
  const result = buildDecisionProvenance({
    proofEvidenceHash: 'sha256:abc',
    policyVersion: 'renewal-v1',
    decision: 'RENEWAL_RECOMMENDED',
    reason: 'verified_improvement_meets_policy',
  })

  assert.equal(result.ok, true)
  assert.equal(result.provenance.proofEvidenceHash, 'sha256:abc')
  assert.match(result.provenance.decisionHash, /^sha256:[a-f0-9]{64}$/)
})

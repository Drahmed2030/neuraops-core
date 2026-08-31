import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildProofSnapshot,
  compareOperationalMetrics,
  validateOperationalMetrics,
} from '../src/lib/control-plane/proof-engine.mjs'

test('proof engine validates supported aggregate operational metrics', () => {
  assert.deepEqual(validateOperationalMetrics({ followUpCompletionPercent: 80 }), { ok: true })
  assert.equal(validateOperationalMetrics({ followUpCompletionPercent: 120 }).reason, 'percentage_out_of_range')
  assert.equal(validateOperationalMetrics({ patientName: 1 }).reason, 'unsupported_metric')
})

test('proof engine understands lower-is-better and higher-is-better metrics', () => {
  const result = compareOperationalMetrics(
    {
      medianReferralResponseHours: 18,
      unresolvedReferralBacklog: 42,
      followUpCompletionPercent: 61,
      leakagePercent: 14,
    },
    {
      medianReferralResponseHours: 7,
      unresolvedReferralBacklog: 17,
      followUpCompletionPercent: 84,
      leakagePercent: 7,
    },
  )

  assert.equal(result.ok, true)
  assert.equal(result.summary.comparableMetrics, 4)
  assert.equal(result.summary.improvedMetrics, 4)
  assert.equal(result.summary.improvementRatePercent, 100)
  assert.equal(result.comparisons.find(item => item.metric === 'medianReferralResponseHours').improvement, 11)
  assert.equal(result.comparisons.find(item => item.metric === 'followUpCompletionPercent').improvement, 23)
})

test('proof snapshot preserves baseline checkpoint outcome and comparison evidence', () => {
  const result = buildProofSnapshot({
    engagementId: 'eng-1',
    organizationId: 'org-1',
    recordedAt: '2026-09-01T00:00:00Z',
    baseline: { medianReferralResponseHours: 18, followUpCompletionPercent: 61 },
    checkpoint: { medianReferralResponseHours: 11, followUpCompletionPercent: 73 },
    outcome: { medianReferralResponseHours: 7, followUpCompletionPercent: 84 },
  })

  assert.equal(result.ok, true)
  assert.equal(result.proof.summary.improvedMetrics, 2)
  assert.equal(result.proof.checkpoint.followUpCompletionPercent, 73)
})

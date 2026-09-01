import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateRenewalDecision, validateRenewalPolicy } from '../src/lib/control-plane/renewal-engine.mjs'

const policy = {
  version: 'renewal-v0.1',
  minImprovementRatePercent: 60,
  maxWorsenedMetrics: 1,
  minComparableMetrics: 3,
  expansionImprovementRatePercent: 90,
}

function proof(summary) {
  return { summary }
}

test('renewal policy validation rejects inconsistent thresholds', () => {
  assert.deepEqual(validateRenewalPolicy({ ...policy, expansionImprovementRatePercent: 50 }), {
    ok: false,
    reason: 'invalid_expansion_improvement_rate',
  })
})

test('strong proof recommends expansion without auto-renewing anything', () => {
  const result = evaluateRenewalDecision(proof({ comparableMetrics: 4, improvedMetrics: 4, worsenedMetrics: 0, unchangedMetrics: 0, improvementRatePercent: 100 }), policy)
  assert.equal(result.ok, true)
  assert.equal(result.decision, 'EXPANSION_RECOMMENDED')
  assert.equal(result.policyVersion, 'renewal-v0.1')
})

test('moderate proof recommends renewal', () => {
  const result = evaluateRenewalDecision(proof({ comparableMetrics: 4, improvedMetrics: 3, worsenedMetrics: 1, unchangedMetrics: 0, improvementRatePercent: 75 }), policy)
  assert.equal(result.decision, 'RENEWAL_RECOMMENDED')
})

test('too many worsened metrics forces human review', () => {
  const result = evaluateRenewalDecision(proof({ comparableMetrics: 5, improvedMetrics: 3, worsenedMetrics: 2, unchangedMetrics: 0, improvementRatePercent: 60 }), policy)
  assert.equal(result.decision, 'NEEDS_HUMAN_REVIEW')
  assert.equal(result.reason, 'too_many_worsened_metrics')
})

test('insufficient proof forces human review instead of guessing', () => {
  const result = evaluateRenewalDecision(proof({ comparableMetrics: 2, improvedMetrics: 2, worsenedMetrics: 0, unchangedMetrics: 0, improvementRatePercent: 100 }), policy)
  assert.equal(result.decision, 'NEEDS_HUMAN_REVIEW')
  assert.equal(result.reason, 'insufficient_comparable_metrics')
})

test('weak evidence closes with proof rather than fabricating value', () => {
  const result = evaluateRenewalDecision(proof({ comparableMetrics: 4, improvedMetrics: 2, worsenedMetrics: 1, unchangedMetrics: 1, improvementRatePercent: 50 }), policy)
  assert.equal(result.decision, 'CLOSE_WITH_PROOF')
})

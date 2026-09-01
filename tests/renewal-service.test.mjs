import test from 'node:test'
import assert from 'node:assert/strict'
import { createRenewalService } from '../src/lib/control-plane/renewal-service.mjs'

const policy = {
  version: 'renewal-v0.1',
  minImprovementRatePercent: 60,
  maxWorsenedMetrics: 1,
  minComparableMetrics: 3,
  expansionImprovementRatePercent: 90,
}

function persistence(overrides = {}) {
  const calls = []
  const base = {
    calls,
    async loadEngagementBundle() {
      return {
        engagement: {
          engagementId: 'eng-1', organizationId: 'org-1', product: 'nexus', kind: 'nexus_lifecycle', state: 'OUTCOME_RECORDED',
        },
        version: 12,
        events: [], entitlements: [], payments: [],
      }
    },
    async loadPilotMeasurements() {
      return [
        { stage: 'baseline', sourceEventId: 'pilot:eng-1:baseline', recordedAt: '2026-09-01T00:00:00Z', metrics: { medianReferralResponseHours: 18, unresolvedReferralBacklog: 42, followUpCompletionPercent: 61, leakagePercent: 14 } },
        { stage: 'checkpoint', sourceEventId: 'pilot:eng-1:checkpoint', recordedAt: '2026-09-01T00:30:00Z', metrics: { medianReferralResponseHours: 11, unresolvedReferralBacklog: 28, followUpCompletionPercent: 73, leakagePercent: 10 } },
        { stage: 'outcome', sourceEventId: 'pilot:eng-1:outcome', recordedAt: '2026-09-01T01:00:00Z', metrics: { medianReferralResponseHours: 7, unresolvedReferralBacklog: 17, followUpCompletionPercent: 84, leakagePercent: 7 } },
      ]
    },
    async recordRenewalDecision(input) {
      calls.push(input)
      return { ok: true, version: 13, duplicate: false, decisionId: 'decision-1' }
    },
  }
  return Object.assign(base, overrides)
}

test('renewal service derives recommendation only from persisted proof and binds provenance', async () => {
  const store = persistence()
  const service = createRenewalService({ persistence: store, policy, clock: () => new Date('2026-09-01T01:00:00Z') })
  const result = await service.evaluateAndRecord({ engagementId: 'eng-1' })

  assert.equal(result.ok, true)
  assert.equal(result.decision, 'EXPANSION_RECOMMENDED')
  assert.equal(result.version, 13)
  assert.equal(store.calls.length, 1)
  assert.equal(store.calls[0].proofSummary.improvementRatePercent, 100)
  assert.equal(store.calls[0].event.type, 'RENEWAL_DECISION_RECORDED')
  assert.deepEqual(store.calls[0].sourceEventIds, [
    'pilot:eng-1:baseline',
    'pilot:eng-1:checkpoint',
    'pilot:eng-1:outcome',
  ])
  assert.match(store.calls[0].proofEvidenceHash, /^sha256:[a-f0-9]{64}$/)
  assert.match(store.calls[0].decisionHash, /^sha256:[a-f0-9]{64}$/)
})

test('renewal service refuses to guess without persisted baseline and outcome', async () => {
  const store = persistence({ async loadPilotMeasurements() { return [{ stage: 'outcome', sourceEventId: 'evt-outcome', metrics: { leakagePercent: 7 } }] } })
  const service = createRenewalService({ persistence: store, policy })
  const result = await service.evaluateAndRecord({ engagementId: 'eng-1' })
  assert.deepEqual(result, { ok: false, reason: 'persisted_proof_incomplete' })
})

test('renewal service does not run before outcome is recorded', async () => {
  const store = persistence({
    async loadEngagementBundle() {
      return { engagement: { engagementId: 'eng-1', organizationId: 'org-1', product: 'nexus', kind: 'nexus_lifecycle', state: 'PILOT_ACTIVE' }, version: 9, events: [], entitlements: [], payments: [] }
    },
  })
  const service = createRenewalService({ persistence: store, policy })
  const result = await service.evaluateAndRecord({ engagementId: 'eng-1' })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'outcome_required_before_renewal_decision')
})

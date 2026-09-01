import test from 'node:test'
import assert from 'node:assert/strict'
import { createPilotDeliveryService } from '../src/lib/control-plane/pilot-delivery-service.mjs'

function fakePersistence() {
  let bundle = {
    engagement: {
      engagementId: 'eng-1',
      organizationId: 'org-1',
      product: 'nexus',
      kind: 'nexus_lifecycle',
      state: 'PILOT_ACTIVE',
    },
    events: [],
    entitlements: [],
    payments: [],
    version: 9,
  }
  const measurements = []

  return {
    async loadEngagementBundle() { return structuredClone(bundle) },
    async recordPilotMeasurement({ stage, measurement, event }) {
      if (measurements.some(item => item.stage === stage)) {
        return { ok: false, reason: 'persistence_failed', domainReason: 'measurement_stage_conflict' }
      }
      measurements.push({ ...structuredClone(measurement), sourceEventId: event.eventId })
      bundle.version += 1
      if (stage === 'checkpoint') bundle.engagement.state = 'CHECKPOINT_COMPLETED'
      if (stage === 'outcome') bundle.engagement.state = 'OUTCOME_RECORDED'
      return { ok: true, version: bundle.version, duplicate: false }
    },
    async loadPilotMeasurements() { return structuredClone(measurements) },
  }
}

test('pilot delivery produces proof from persisted baseline and outcome with provenance', async () => {
  const persistence = fakePersistence()
  const service = createPilotDeliveryService({ persistence, clock: () => new Date('2026-09-01T00:00:00Z') })

  const baseline = await service.captureBaseline({
    engagementId: 'eng-1',
    metrics: { medianReferralResponseHours: 18, followUpCompletionPercent: 61 },
  })
  assert.equal(baseline.ok, true)

  const checkpoint = await service.captureCheckpoint({
    engagementId: 'eng-1',
    metrics: { medianReferralResponseHours: 11, followUpCompletionPercent: 73 },
  })
  assert.equal(checkpoint.ok, true)

  const outcome = await service.captureOutcome({
    engagementId: 'eng-1',
    metrics: { medianReferralResponseHours: 7, followUpCompletionPercent: 84 },
  })
  assert.equal(outcome.ok, true)
  assert.equal(outcome.proof.summary.improvedMetrics, 2)
  assert.equal(outcome.proof.summary.improvementRatePercent, 100)
  assert.deepEqual(outcome.proof.provenance.sourceEventIds, [
    'pilot:eng-1:baseline',
    'pilot:eng-1:checkpoint',
    'pilot:eng-1:outcome',
  ])
  assert.match(outcome.proof.provenance.evidenceHash, /^sha256:[a-f0-9]{64}$/)
})

test('pilot delivery rejects unsupported metric before persistence', async () => {
  let writes = 0
  const persistence = fakePersistence()
  const original = persistence.recordPilotMeasurement
  persistence.recordPilotMeasurement = async input => { writes += 1; return original(input) }
  const service = createPilotDeliveryService({ persistence })

  const result = await service.captureBaseline({ engagementId: 'eng-1', metrics: { patientName: 1 } })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'unsupported_metric')
  assert.equal(writes, 0)
})

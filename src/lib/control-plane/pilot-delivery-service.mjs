import { buildProofSnapshot, validateOperationalMetrics } from './proof-engine.mjs'

function nowIso(clock) {
  return (clock ? clock() : new Date()).toISOString()
}

function stageEventType(stage) {
  if (stage === 'baseline') return 'BASELINE_CAPTURED'
  if (stage === 'checkpoint') return 'CHECKPOINT_COMPLETED'
  if (stage === 'outcome') return 'OUTCOME_RECORDED'
  return null
}

export function createPilotDeliveryService({ persistence, clock }) {
  if (!persistence?.loadEngagementBundle || !persistence?.recordPilotMeasurement || !persistence?.loadPilotMeasurements) {
    throw new Error('invalid_persistence_port')
  }

  async function recordMeasurement({ engagementId, stage, metrics, actorId = 'system' }) {
    const validation = validateOperationalMetrics(metrics)
    if (!validation.ok) return validation

    const eventType = stageEventType(stage)
    if (!eventType) return { ok: false, reason: 'invalid_measurement_stage' }

    const bundle = await persistence.loadEngagementBundle(engagementId)
    if (!bundle) return { ok: false, reason: 'engagement_not_found' }
    if (bundle.engagement.product !== 'nexus' || bundle.engagement.kind !== 'nexus_lifecycle') {
      return { ok: false, reason: 'not_nexus_lifecycle' }
    }

    if (stage === 'baseline' && bundle.engagement.state !== 'PILOT_ACTIVE') {
      return { ok: false, reason: 'baseline_not_recordable', state: bundle.engagement.state }
    }
    if (stage === 'checkpoint' && bundle.engagement.state !== 'PILOT_ACTIVE') {
      return { ok: false, reason: 'checkpoint_not_recordable', state: bundle.engagement.state }
    }
    if (stage === 'outcome' && !['PILOT_ACTIVE', 'CHECKPOINT_COMPLETED'].includes(bundle.engagement.state)) {
      return { ok: false, reason: 'outcome_not_recordable', state: bundle.engagement.state }
    }

    const occurredAt = nowIso(clock)
    const event = {
      eventId: `pilot:${engagementId}:${stage}`,
      type: eventType,
      occurredAt,
      organizationId: bundle.engagement.organizationId,
      engagementId,
      actor: actorId === 'system' ? { type: 'system' } : { type: 'operator', actorId },
      payload: { stage, metricKeys: Object.keys(metrics).sort() },
    }

    const result = await persistence.recordPilotMeasurement({
      engagement: bundle.engagement,
      expectedVersion: bundle.version,
      stage,
      event,
      measurement: {
        engagementId,
        organizationId: bundle.engagement.organizationId,
        stage,
        recordedAt: occurredAt,
        metrics,
      },
    })
    if (!result.ok) return result

    if (stage !== 'outcome') return result

    const measurements = await persistence.loadPilotMeasurements(engagementId)
    const baseline = measurements.find(item => item.stage === 'baseline')
    const checkpoint = measurements.find(item => item.stage === 'checkpoint')
    const outcome = measurements.find(item => item.stage === 'outcome')
    if (!baseline || !outcome) return { ok: false, reason: 'proof_measurements_incomplete' }

    const proof = buildProofSnapshot({
      engagementId,
      organizationId: bundle.engagement.organizationId,
      recordedAt: occurredAt,
      baseline: baseline.metrics,
      checkpoint: checkpoint?.metrics,
      outcome: outcome.metrics,
    })
    if (!proof.ok) return proof

    return { ...result, proof: proof.proof }
  }

  return {
    captureBaseline(input) {
      return recordMeasurement({ ...input, stage: 'baseline' })
    },
    captureCheckpoint(input) {
      return recordMeasurement({ ...input, stage: 'checkpoint' })
    },
    captureOutcome(input) {
      return recordMeasurement({ ...input, stage: 'outcome' })
    },
  }
}

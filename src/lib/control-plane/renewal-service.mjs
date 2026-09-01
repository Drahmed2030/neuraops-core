import { buildProofSnapshot } from './proof-engine.mjs'
import { evaluateRenewalDecision } from './renewal-engine.mjs'

function nowIso(clock) {
  return (clock ? clock() : new Date()).toISOString()
}

export function createRenewalService({ persistence, policy, clock }) {
  if (!persistence?.loadEngagementBundle || !persistence?.loadPilotMeasurements || !persistence?.recordRenewalDecision) {
    throw new Error('invalid_persistence_port')
  }

  async function evaluateAndRecord({ engagementId, actorId = 'system' }) {
    const bundle = await persistence.loadEngagementBundle(engagementId)
    if (!bundle) return { ok: false, reason: 'engagement_not_found' }
    if (bundle.engagement.product !== 'nexus' || bundle.engagement.kind !== 'nexus_lifecycle') {
      return { ok: false, reason: 'not_nexus_lifecycle' }
    }
    if (bundle.engagement.state !== 'OUTCOME_RECORDED') {
      return { ok: false, reason: 'outcome_required_before_renewal_decision', state: bundle.engagement.state }
    }

    const measurements = await persistence.loadPilotMeasurements(engagementId)
    const baseline = measurements.find(item => item.stage === 'baseline')
    const checkpoint = measurements.find(item => item.stage === 'checkpoint')
    const outcome = measurements.find(item => item.stage === 'outcome')
    if (!baseline || !outcome) return { ok: false, reason: 'persisted_proof_incomplete' }

    const recordedAt = nowIso(clock)
    const proofResult = buildProofSnapshot({
      engagementId,
      organizationId: bundle.engagement.organizationId,
      baseline: baseline.metrics,
      checkpoint: checkpoint?.metrics,
      outcome: outcome.metrics,
      recordedAt,
    })
    if (!proofResult.ok) return proofResult

    const evaluated = evaluateRenewalDecision(proofResult.proof, policy)
    if (!evaluated.ok) return evaluated

    const event = {
      eventId: `renewal:${engagementId}:${evaluated.policyVersion}`,
      type: 'RENEWAL_DECISION_RECORDED',
      occurredAt: recordedAt,
      organizationId: bundle.engagement.organizationId,
      engagementId,
      actor: actorId === 'system' ? { type: 'system' } : { type: 'operator', actorId },
      payload: {
        policyVersion: evaluated.policyVersion,
        decision: evaluated.decision,
        reason: evaluated.reason,
      },
    }

    const persisted = await persistence.recordRenewalDecision({
      engagement: bundle.engagement,
      expectedVersion: bundle.version,
      event,
      policyVersion: evaluated.policyVersion,
      decision: evaluated.decision,
      reason: evaluated.reason,
      proofSummary: proofResult.proof.summary,
    })
    if (!persisted.ok) return persisted

    return {
      ok: true,
      decision: evaluated.decision,
      reason: evaluated.reason,
      policyVersion: evaluated.policyVersion,
      proof: proofResult.proof,
      version: persisted.version,
      duplicate: persisted.duplicate,
      decisionId: persisted.decisionId,
    }
  }

  return { evaluateAndRecord }
}

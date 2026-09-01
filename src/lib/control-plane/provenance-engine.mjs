import { createHash } from 'crypto'

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(key => [key, canonicalize(value[key])])
    )
  }
  return value
}

export function evidenceHash(value) {
  const canonical = JSON.stringify(canonicalize(value))
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`
}

export function buildProofProvenance({ engagementId, organizationId, measurements }) {
  if (!Array.isArray(measurements) || measurements.length < 2) {
    return { ok: false, reason: 'provenance_measurements_required' }
  }

  const ordered = ['baseline', 'checkpoint', 'outcome']
    .map(stage => measurements.find(item => item.stage === stage))
    .filter(Boolean)

  if (!ordered.some(item => item.stage === 'baseline') || !ordered.some(item => item.stage === 'outcome')) {
    return { ok: false, reason: 'provenance_baseline_and_outcome_required' }
  }

  for (const item of ordered) {
    if (!item.sourceEventId || typeof item.sourceEventId !== 'string') {
      return { ok: false, reason: 'source_event_id_required', stage: item.stage }
    }
  }

  const sourceEventIds = ordered.map(item => item.sourceEventId)
  const evidence = ordered.map(item => ({
    stage: item.stage,
    sourceEventId: item.sourceEventId,
    recordedAt: item.recordedAt,
    metrics: item.metrics,
  }))

  return {
    ok: true,
    provenance: {
      sourceEventIds,
      evidenceHash: evidenceHash({ engagementId, organizationId, evidence }),
    },
  }
}

export function buildDecisionProvenance({ proofEvidenceHash, policyVersion, decision, reason }) {
  if (!proofEvidenceHash || typeof proofEvidenceHash !== 'string') {
    return { ok: false, reason: 'proof_evidence_hash_required' }
  }
  if (!policyVersion || typeof policyVersion !== 'string') {
    return { ok: false, reason: 'policy_version_required' }
  }

  return {
    ok: true,
    provenance: {
      proofEvidenceHash,
      policyVersion,
      decisionHash: evidenceHash({ proofEvidenceHash, policyVersion, decision, reason }),
    },
  }
}

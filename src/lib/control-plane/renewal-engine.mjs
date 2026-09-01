function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

export function validateRenewalPolicy(policy) {
  if (!policy || typeof policy !== 'object') return { ok: false, reason: 'invalid_policy' }
  if (!policy.version || typeof policy.version !== 'string') return { ok: false, reason: 'policy_version_required' }
  if (!finiteNumber(policy.minImprovementRatePercent) || policy.minImprovementRatePercent < 0 || policy.minImprovementRatePercent > 100) {
    return { ok: false, reason: 'invalid_min_improvement_rate' }
  }
  if (!Number.isInteger(policy.maxWorsenedMetrics) || policy.maxWorsenedMetrics < 0) {
    return { ok: false, reason: 'invalid_max_worsened_metrics' }
  }
  if (!Number.isInteger(policy.minComparableMetrics) || policy.minComparableMetrics < 1) {
    return { ok: false, reason: 'invalid_min_comparable_metrics' }
  }
  if (!finiteNumber(policy.expansionImprovementRatePercent) || policy.expansionImprovementRatePercent < policy.minImprovementRatePercent || policy.expansionImprovementRatePercent > 100) {
    return { ok: false, reason: 'invalid_expansion_improvement_rate' }
  }
  return { ok: true }
}

export function evaluateRenewalDecision(proof, policy) {
  const policyValidation = validateRenewalPolicy(policy)
  if (!policyValidation.ok) return policyValidation
  if (!proof?.summary) return { ok: false, reason: 'proof_summary_required' }

  const summary = proof.summary
  if (!Number.isInteger(summary.comparableMetrics) || !finiteNumber(summary.improvementRatePercent)) {
    return { ok: false, reason: 'invalid_proof_summary' }
  }

  if (summary.comparableMetrics < policy.minComparableMetrics) {
    return {
      ok: true,
      decision: 'NEEDS_HUMAN_REVIEW',
      reason: 'insufficient_comparable_metrics',
      policyVersion: policy.version,
    }
  }

  if (summary.worsenedMetrics > policy.maxWorsenedMetrics) {
    return {
      ok: true,
      decision: 'NEEDS_HUMAN_REVIEW',
      reason: 'too_many_worsened_metrics',
      policyVersion: policy.version,
    }
  }

  if (summary.improvementRatePercent >= policy.expansionImprovementRatePercent && summary.worsenedMetrics === 0) {
    return {
      ok: true,
      decision: 'EXPANSION_RECOMMENDED',
      reason: 'strong_verified_improvement',
      policyVersion: policy.version,
    }
  }

  if (summary.improvementRatePercent >= policy.minImprovementRatePercent) {
    return {
      ok: true,
      decision: 'RENEWAL_RECOMMENDED',
      reason: 'verified_improvement_meets_policy',
      policyVersion: policy.version,
    }
  }

  return {
    ok: true,
    decision: 'CLOSE_WITH_PROOF',
    reason: 'improvement_below_renewal_threshold',
    policyVersion: policy.version,
  }
}

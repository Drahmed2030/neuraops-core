const METRICS = {
  referralVolumePerMonth: { direction: 'higher', unit: 'count' },
  medianReferralResponseHours: { direction: 'lower', unit: 'hours' },
  unresolvedReferralBacklog: { direction: 'lower', unit: 'count' },
  followUpCompletionPercent: { direction: 'higher', unit: 'percent' },
  leakagePercent: { direction: 'lower', unit: 'percent' },
  locationOrHandoffCount: { direction: 'lower', unit: 'count' },
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

export function validateOperationalMetrics(metrics) {
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) {
    return { ok: false, reason: 'invalid_metrics' }
  }
  const entries = Object.entries(metrics)
  if (entries.length === 0) return { ok: false, reason: 'metrics_required' }

  for (const [key, value] of entries) {
    if (!METRICS[key]) return { ok: false, reason: 'unsupported_metric', metric: key }
    if (!isFiniteNumber(value)) return { ok: false, reason: 'invalid_metric_value', metric: key }
    if ((key.endsWith('Percent')) && (value < 0 || value > 100)) {
      return { ok: false, reason: 'percentage_out_of_range', metric: key }
    }
    if (!key.endsWith('Percent') && value < 0) {
      return { ok: false, reason: 'negative_metric_value', metric: key }
    }
  }

  return { ok: true }
}

export function compareOperationalMetrics(baseline, outcome) {
  const baselineValidation = validateOperationalMetrics(baseline)
  if (!baselineValidation.ok) return baselineValidation
  const outcomeValidation = validateOperationalMetrics(outcome)
  if (!outcomeValidation.ok) return outcomeValidation

  const comparisons = []
  for (const [key, definition] of Object.entries(METRICS)) {
    if (!isFiniteNumber(baseline[key]) || !isFiniteNumber(outcome[key])) continue
    const before = baseline[key]
    const after = outcome[key]
    const absoluteDelta = after - before
    const relativeDeltaPercent = before === 0 ? null : (absoluteDelta / before) * 100
    const improvement = definition.direction === 'higher'
      ? after - before
      : before - after

    comparisons.push({
      metric: key,
      unit: definition.unit,
      direction: definition.direction,
      before,
      after,
      absoluteDelta,
      relativeDeltaPercent,
      improvement,
      improved: improvement > 0,
      unchanged: improvement === 0,
    })
  }

  if (comparisons.length === 0) return { ok: false, reason: 'no_comparable_metrics' }

  const improvedCount = comparisons.filter(item => item.improved).length
  const worsenedCount = comparisons.filter(item => !item.improved && !item.unchanged).length
  const unchangedCount = comparisons.filter(item => item.unchanged).length

  return {
    ok: true,
    comparisons,
    summary: {
      comparableMetrics: comparisons.length,
      improvedMetrics: improvedCount,
      worsenedMetrics: worsenedCount,
      unchangedMetrics: unchangedCount,
      improvementRatePercent: (improvedCount / comparisons.length) * 100,
    },
  }
}

export function buildProofSnapshot({ engagementId, organizationId, baseline, checkpoint, outcome, recordedAt }) {
  const comparison = compareOperationalMetrics(baseline, outcome)
  if (!comparison.ok) return comparison

  if (checkpoint) {
    const checkpointValidation = validateOperationalMetrics(checkpoint)
    if (!checkpointValidation.ok) return checkpointValidation
  }

  return {
    ok: true,
    proof: {
      engagementId,
      organizationId,
      recordedAt,
      baseline,
      checkpoint: checkpoint ?? null,
      outcome,
      comparisons: comparison.comparisons,
      summary: comparison.summary,
    },
  }
}

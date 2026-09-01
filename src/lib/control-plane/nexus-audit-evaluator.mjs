import { validateOperationalMetrics } from './proof-engine.mjs'

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

export function validateAuditPolicy(policy) {
  if (!policy || typeof policy !== 'object') return { ok: false, reason: 'invalid_audit_policy' }
  if (!policy.version || typeof policy.version !== 'string') return { ok: false, reason: 'audit_policy_version_required' }
  if (!Number.isInteger(policy.topGapCount) || policy.topGapCount < 1 || policy.topGapCount > 6) {
    return { ok: false, reason: 'invalid_top_gap_count' }
  }
  if (!policy.signals || typeof policy.signals !== 'object' || Array.isArray(policy.signals)) {
    return { ok: false, reason: 'audit_policy_signals_required' }
  }

  const signalEntries = Object.entries(policy.signals)
  if (signalEntries.length === 0) return { ok: false, reason: 'audit_policy_signals_required' }

  for (const [metric, signal] of signalEntries) {
    const metricValidation = validateOperationalMetrics({ [metric]: 0 })
    if (!metricValidation.ok && metricValidation.reason === 'unsupported_metric') {
      return { ok: false, reason: 'unsupported_policy_metric', metric }
    }
    if (!signal?.label || typeof signal.label !== 'string') return { ok: false, reason: 'signal_label_required', metric }
    if (!['higher_risk', 'lower_risk'].includes(signal.direction)) return { ok: false, reason: 'invalid_signal_direction', metric }
    if (!finite(signal.warningThreshold) || !finite(signal.criticalThreshold)) {
      return { ok: false, reason: 'invalid_signal_threshold', metric }
    }
    if (!finite(signal.weight) || signal.weight <= 0) return { ok: false, reason: 'invalid_signal_weight', metric }
    if (signal.direction === 'higher_risk' && signal.criticalThreshold < signal.warningThreshold) {
      return { ok: false, reason: 'invalid_threshold_order', metric }
    }
    if (signal.direction === 'lower_risk' && signal.criticalThreshold > signal.warningThreshold) {
      return { ok: false, reason: 'invalid_threshold_order', metric }
    }
  }

  return { ok: true }
}

function severityFor(value, signal) {
  if (signal.direction === 'higher_risk') {
    if (value >= signal.criticalThreshold) return 2
    if (value >= signal.warningThreshold) return 1
    return 0
  }
  if (value <= signal.criticalThreshold) return 2
  if (value <= signal.warningThreshold) return 1
  return 0
}

export function evaluateNexusAudit(metrics, policy) {
  const metricsValidation = validateOperationalMetrics(metrics)
  if (!metricsValidation.ok) return metricsValidation
  const policyValidation = validateAuditPolicy(policy)
  if (!policyValidation.ok) return policyValidation

  const assessed = []
  for (const [metric, signal] of Object.entries(policy.signals)) {
    const value = metrics[metric]
    if (!finite(value)) continue
    const severity = severityFor(value, signal)
    assessed.push({
      metric,
      label: signal.label,
      value,
      severity,
      weightedRisk: severity * signal.weight,
      direction: signal.direction,
    })
  }

  if (assessed.length === 0) return { ok: false, reason: 'no_policy_metrics_supplied' }

  const priorityGaps = assessed
    .filter(item => item.severity > 0)
    .sort((a, b) => b.weightedRisk - a.weightedRisk || b.severity - a.severity || a.metric.localeCompare(b.metric))
    .slice(0, policy.topGapCount)
    .map(item => ({
      metric: item.metric,
      title: item.label,
      severity: item.severity === 2 ? 'critical' : 'attention',
      value: item.value,
    }))

  return {
    ok: true,
    result: {
      policyVersion: policy.version,
      assessedSignals: assessed.length,
      riskSignals: assessed.filter(item => item.severity > 0).length,
      priorityGapCount: priorityGaps.length,
    },
    priorityGaps,
  }
}

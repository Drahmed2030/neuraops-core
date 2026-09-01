import { evaluateNexusAudit as evaluateNexusAuditRuntime } from './nexus-audit-evaluator.mjs'

export type AuditSignalPolicy = {
  label: string
  direction: 'higher_risk' | 'lower_risk'
  warningThreshold: number
  criticalThreshold: number
  weight: number
}

export type NexusAuditPolicy = {
  version: string
  topGapCount: number
  signals: Record<string, AuditSignalPolicy>
}

export type NexusAuditGap = {
  metric: string
  title: string
  severity: 'critical' | 'attention'
  value: number
}

export type NexusAuditEvaluation =
  | { ok: false; reason: string; metric?: string }
  | {
      ok: true
      result: {
        policyVersion: string
        assessedSignals: number
        riskSignals: number
        priorityGapCount: number
      }
      priorityGaps: NexusAuditGap[]
    }

export function evaluateNexusAudit(metrics: unknown, policy: NexusAuditPolicy): NexusAuditEvaluation {
  return evaluateNexusAuditRuntime(metrics, policy) as NexusAuditEvaluation
}

export type TrustDomain =
  | 'identity'
  | 'policy'
  | 'evidence'
  | 'observability'
  | 'incident'
  | 'entitlement'
  | 'recovery'

export type DataClassification =
  | 'public'
  | 'internal'
  | 'account'
  | 'sensitive'
  | 'clinical-restricted'

export type TrustProduct = 'neuraops' | 'cliniverse' | 'shared'
export type TrustEnvironment = 'development' | 'preview' | 'production'

export interface TrustContext {
  correlationId?: string | null
  traceId?: string | null
  product: TrustProduct
  environment: TrustEnvironment
  occurredAt: string
}

export interface TrustEvent<TAttributes extends Record<string, unknown> = Record<string, unknown>> {
  schemaVersion: 1
  eventId: string
  domain: TrustDomain
  eventType: string
  source: string
  subjectRef?: string | null
  classification: DataClassification
  context: TrustContext
  attributes: TAttributes
}

export interface IdentitySnapshot {
  principalRef: string
  principalType: 'user' | 'service' | 'system'
  assurance: 'unknown' | 'password' | 'oauth' | 'passkey' | 'service-credential'
  authenticated: boolean
}

export interface PolicyDecision {
  policyId: string
  policyVersion: string
  decision: 'allow' | 'deny' | 'review'
  reasonCode: string
  evidenceRefs: string[]
}

export interface EvidenceRecord {
  schemaVersion: 1
  evidenceId: string
  kind: string
  source: string
  product: TrustProduct
  environment: TrustEnvironment
  integritySha256: string
  classification: DataClassification
  retentionClass: 'ephemeral' | 'operational' | 'audit' | 'regulated'
  generatedAt: string
  /** SHA-256 opaque reference only; never a raw URL, path, identifier, or payload. */
  locationRef?: string | null
}

export interface ObservabilitySnapshot {
  service: string
  operation: string
  status: 'healthy' | 'degraded' | 'failed' | 'unknown'
  correlationId?: string | null
  traceId?: string | null
  measuredAt: string
}

export interface IncidentSnapshot {
  incidentRef: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  state: 'open' | 'investigating' | 'mitigated' | 'resolved'
  remediation: 'observe' | 'open-fix-pr' | 'human-escalation'
  evidenceRefs: string[]
}

export type IncidentLineagePhase = 'detected' | 'triaged' | 'contained' | 'recovered' | 'verified'
export type IncidentLineageOutcome = 'observed' | 'degraded' | 'restored' | 'verified' | 'unresolved'
export type IncidentLineageProjectedPhase = IncidentLineagePhase | 'verification-pending'

export interface IncidentLineageRecord {
  schemaVersion: 1
  lineageRef: string
  incidentRef: string
  predecessorRef: string | null
  eventRef: string | null
  evidenceRefs: string[]
  phase: IncidentLineagePhase
  outcome: IncidentLineageOutcome
  sequence: number
  occurredAt: string
  source: string
  product: TrustProduct
  environment: TrustEnvironment
  classification: DataClassification
}

export interface IncidentReplayStepProjection {
  lineageRef: string
  sequence: number
  phase: IncidentLineageProjectedPhase
  outcome: IncidentLineageOutcome
  declaredPhase: IncidentLineagePhase
  declaredOutcome: IncidentLineageOutcome
  occurredAt: string
  source: string
  product: TrustProduct
  environment: TrustEnvironment
  classification: DataClassification
  predecessor: 'root' | 'linked' | 'unresolved' | 'scope-mismatch'
  event: 'not-referenced' | 'resolved' | 'unresolved' | 'scope-mismatch'
  evidence: {
    referenced: number
    resolved: number
    unresolved: number
    scopeMismatch: number
  }
}

export interface IncidentReplayProjection {
  incidentRef: string
  product: TrustProduct
  environment: TrustEnvironment
  startedAt: string
  latestOccurredAt: string
  status: 'complete' | 'partial'
  verificationStatus: 'verified' | 'unverified'
  evidence: {
    referenced: number
    resolved: number
    unresolved: number
    scopeMismatch: number
  }
  steps: IncidentReplayStepProjection[]
}

export interface EntitlementSnapshot {
  principalRef: string
  product: TrustProduct
  entitlement: string
  state: 'inactive' | 'active' | 'grace' | 'revoked'
  authority: string
  evidenceRef?: string | null
  validUntil?: string | null
}

export interface RecoveryObjective {
  service: string
  product: TrustProduct
  tier: 0 | 1 | 2 | 3
  rtoMinutes: number
  rpoMinutes: number
  degradedMode: string
  dependencies: string[]
  readiness: 'verified' | 'partial' | 'gap'
  objectiveStatus: 'target' | 'verified'
  evidenceRefs: string[]
  recoveryOwner: string
  restoreDrillCadenceDays: number
}

export interface RecoveryObjectiveProjection extends Omit<RecoveryObjective, 'evidenceRefs'> {
  declaredReadiness: RecoveryObjective['readiness']
  declaredObjectiveStatus: RecoveryObjective['objectiveStatus']
  evidence: {
    referenced: number
    resolved: number
    unresolved: number
    scopeMismatch: number
  }
}

export interface OperationsReadModel {
  schemaVersion: 1
  generatedAt: string
  mode: 'read-only'
  privacy: {
    rawPayloadsIncluded: false
    eventAttributesIncluded: false
    directIdentifiersIncluded: false
    clinicalDataIncluded: false
  }
  trust: {
    totalEvents: number
    latestOccurredAt: string | null
    byDomain: Record<TrustDomain, number>
    byProduct: Record<TrustProduct, number>
    byEnvironment: Record<TrustEnvironment, number>
    byClassification: Record<DataClassification, number>
  }
  evidence: {
    total: number
    latestGeneratedAt: string | null
    byProduct: Record<TrustProduct, number>
    byClassification: Record<DataClassification, number>
    byRetentionClass: Record<string, number>
    byKind: Record<string, number>
  }
  incidentLineage: {
    replayMode: 'metadata-only'
    executionAllowed: false
    summary: {
      totalIncidents: number
      totalSteps: number
      completeReplays: number
      verifiedReplays: number
      partialReplays: number
      latestOccurredAt: string | null
      unresolvedPredecessorRefs: number
      crossScopePredecessorRefs: number
      unresolvedEventRefs: number
      crossProductEventRefs: number
      unresolvedEvidenceRefs: number
      crossProductEvidenceRefs: number
    }
    byProduct: Record<TrustProduct, number>
    byPhase: Record<IncidentLineageProjectedPhase, number>
    verificationIssues: Array<{
      lineageRef: string
      reason: 'unresolved-evidence' | 'product-scope-mismatch'
    }>
    replays: IncidentReplayProjection[]
  }
  recovery: {
    summary: {
      total: number
      verified: number
      partial: number
      gaps: number
      tier0Gaps: string[]
      unresolvedEvidenceRefs: number
      crossProductEvidenceRefs: number
    }
    verificationIssues: Array<{
      service: string
      reason: 'unresolved-evidence' | 'product-scope-mismatch'
    }>
    objectives: RecoveryObjectiveProjection[]
  }
}

export interface TrustProviderAdapter<TStatus = unknown> {
  readonly adapterId: string
  readonly provider: string
  readStatus(): Promise<TStatus>
}

export interface ReadOnlyOperationsAdapter<TSnapshot = unknown> extends TrustProviderAdapter<TSnapshot> {
  readonly mode: 'read-only'
}

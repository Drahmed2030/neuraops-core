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
  evidenceId: string
  kind: string
  source: string
  integritySha256: string
  classification: DataClassification
  retentionClass: 'ephemeral' | 'operational' | 'audit' | 'regulated'
  generatedAt: string
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
  tier: 0 | 1 | 2 | 3
  rtoMinutes: number
  rpoMinutes: number
  degradedMode: string
  dependencies: string[]
}

export interface TrustProviderAdapter<TStatus = unknown> {
  readonly adapterId: string
  readonly provider: string
  readStatus(): Promise<TStatus>
}

export interface ReadOnlyOperationsAdapter<TSnapshot = unknown> extends TrustProviderAdapter<TSnapshot> {
  readonly mode: 'read-only'
}

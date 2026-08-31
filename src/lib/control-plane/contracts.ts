export const ENGAGEMENT_STATES = [
  'LEAD',
  'AUDIT_STARTED',
  'AUDIT_COMPLETED',
  'REVIEW_REQUESTED',
  'REVIEW_BOOKED',
  'REVIEW_COMPLETED',
  'PILOT_PROPOSED',
  'PAYMENT_PENDING',
  'PILOT_ACTIVE',
  'CHECKPOINT_COMPLETED',
  'OUTCOME_RECORDED',
  'RENEWED',
  'CLOSED',
] as const

export type EngagementState = (typeof ENGAGEMENT_STATES)[number]

export const CONTROL_PLANE_EVENTS = [
  'AUDIT_STARTED',
  'AUDIT_COMPLETED',
  'REVIEW_REQUESTED',
  'REVIEW_BOOKED',
  'REVIEW_COMPLETED',
  'PILOT_PROPOSED',
  'PAYMENT_REQUESTED',
  'PAYMENT_RECEIVED',
  'ENTITLEMENT_GRANTED',
  'PILOT_STARTED',
  'CHECKPOINT_COMPLETED',
  'OUTCOME_RECORDED',
  'ENGAGEMENT_RENEWED',
  'ENGAGEMENT_CLOSED',
] as const

export type ControlPlaneEventType = (typeof CONTROL_PLANE_EVENTS)[number]

export const ENTITLEMENTS = [
  'nexus.audit',
  'nexus.review',
  'nexus.pilot_workspace',
  'nexus.report_export',
  'cliniverse.core',
  'cliniverse.advanced_ai',
  'cliniverse.cardio_nexus',
] as const

export type EntitlementKey = (typeof ENTITLEMENTS)[number]

export type OrganizationRef = {
  organizationId: string
  displayName: string
}

export type EngagementRef = {
  engagementId: string
  organizationId: string
  product: 'nexus' | 'cliniverse'
  kind: 'audit' | 'review' | 'pilot' | 'subscription'
  state: EngagementState
}

export type EventActor =
  | { type: 'system'; actorId?: undefined }
  | { type: 'user'; actorId: string }
  | { type: 'operator'; actorId: string }
  | { type: 'integration'; actorId: string }

export type ControlPlaneEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  eventId: string
  type: ControlPlaneEventType
  occurredAt: string
  organizationId: string
  engagementId?: string
  actor: EventActor
  payload: TPayload
}

export type EntitlementGrant = {
  organizationId: string
  key: EntitlementKey
  status: 'active' | 'revoked' | 'expired'
  source: 'manual' | 'pilot' | 'subscription' | 'payment'
  startsAt: string
  endsAt?: string
}

export type PaymentStatus = 'not_required' | 'pending' | 'paid' | 'failed' | 'refunded'

export type PaymentRecord = {
  paymentId: string
  organizationId: string
  engagementId: string
  provider: 'manual' | 'apple' | 'web_gateway'
  amountMinor: number
  currency: string
  status: PaymentStatus
  createdAt: string
  paidAt?: string
}

// Control Plane must never be a store for clinical records or patient-identifying data.
export type OperationalAuditSnapshot = {
  referralVolumePerMonth?: number
  medianReferralResponseHours?: number
  unresolvedReferralBacklog?: number
  followUpCompletionPercent?: number
  leakagePercent?: number
  locationOrHandoffCount?: number
}

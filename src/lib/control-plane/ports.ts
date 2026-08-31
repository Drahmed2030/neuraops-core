import type {
  ControlPlaneEvent,
  EngagementRef,
  EntitlementGrant,
  PaymentRecord,
} from './contracts'

export type EngagementBundle = {
  engagement: EngagementRef
  events: ControlPlaneEvent[]
  entitlements: EntitlementGrant[]
  payments: PaymentRecord[]
  version: number
}

export type BootstrapEngagementInput = {
  sourceRef: string
  organizationId: string
  organizationName: string
  engagementId: string
  product: 'nexus' | 'cliniverse'
  kind: 'audit' | 'review' | 'pilot' | 'subscription'
  initialState: string
}

export type BootstrapEngagementResult =
  | { ok: true; created: boolean; engagementId: string; organizationId: string; version: number }
  | { ok: false; reason: string }

export type LifecycleCommit = {
  engagement: EngagementRef
  event: ControlPlaneEvent
  entitlement?: EntitlementGrant
  expectedVersion: number
}

export type LifecycleCommitResult =
  | { ok: true; version: number; duplicate: boolean }
  | { ok: false; reason: 'version_conflict'; currentVersion: number }
  | { ok: false; reason: 'persistence_failed'; domainReason?: string }

/**
 * Persistence boundary for the Control Plane.
 * Implementations may use Supabase/Postgres later, but domain code must not depend on either.
 * Bootstrap must be idempotent by sourceRef.
 * Commits must be atomic and optimistic-concurrency protected by expectedVersion.
 * Exact duplicate events are successful no-ops even when the caller retries with a stale version.
 */
export interface ControlPlanePersistencePort {
  bootstrapEngagement(input: BootstrapEngagementInput): Promise<BootstrapEngagementResult>
  loadEngagementBundle(engagementId: string): Promise<EngagementBundle | null>
  commitLifecycle(input: LifecycleCommit): Promise<LifecycleCommitResult>
}

export type CommerceProduct = 'nexus' | 'cliniverse'
export type CommerceChannel = 'web' | 'ios'
export type BuyerType = 'individual' | 'family' | 'organization'
export type OfferingType =
  | 'pilot'
  | 'professional_service'
  | 'manual_invoice'
  | 'digital_subscription'
  | 'digital_feature'

export type CommerceContext = {
  product: CommerceProduct
  channel: CommerceChannel
  buyerType: BuyerType
  offeringType: OfferingType
  enterpriseOnly?: boolean
  allowsInAppPurchase?: boolean
}

export type CommerceRail = 'apple_iap' | 'b2b_web' | 'manual_invoice'

export type CheckoutRequest = {
  organizationId: string
  engagementId: string
  amountMinor: number
  currency: string
  description: string
  idempotencyKey: string
  commerceContext: CommerceContext
  approvedRail: CommerceRail
}

export type CheckoutResult = {
  providerReference: string
  checkoutUrl?: string
  status: 'pending' | 'paid' | 'failed'
}

export type VerifiedPaymentEvent = {
  providerReference: string
  engagementId: string
  organizationId: string
  amountMinor: number
  currency: string
  status: 'paid' | 'failed' | 'refunded'
  occurredAt: string
  idempotencyKey: string
}

export interface PaymentPort {
  rail: CommerceRail
  createCheckout(input: CheckoutRequest): Promise<CheckoutResult>
  verifyWebhook(input: { rawBody: string; signature: string }): Promise<VerifiedPaymentEvent>
}

export type ReviewBookingRequest = {
  organizationId: string
  engagementId: string
  startsAt: string
  durationMinutes: number
  contactEmail?: string
}

export type ReviewBookingResult = {
  bookingId: string
  startsAt: string
  status: 'held' | 'confirmed' | 'cancelled'
}

export interface BookingPort {
  createReviewBooking(input: ReviewBookingRequest): Promise<ReviewBookingResult>
  cancelReviewBooking(bookingId: string): Promise<{ ok: boolean }>
}

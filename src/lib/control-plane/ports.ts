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
  kind: 'nexus_lifecycle' | 'subscription'
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

export type PaymentIntentCommit = {
  engagement: EngagementRef
  event: ControlPlaneEvent
  payment: PaymentRecord & { idempotencyKey?: string }
  expectedVersion: number
}

export type PaymentIntentCommitResult =
  | { ok: true; version: number; duplicate: boolean; payment: PaymentRecord & { idempotencyKey?: string } }
  | { ok: false; reason: 'version_conflict'; currentVersion: number }
  | { ok: false; reason: 'persistence_failed'; domainReason?: string }

export type CheckoutCorrelationInput = {
  engagementId: string
  paymentId: string
  providerReference: string
}

export type CheckoutCorrelationResult =
  | { ok: true; duplicate: boolean; payment: PaymentRecord & { idempotencyKey?: string } }
  | { ok: false; reason: 'payment_not_found' | 'provider_reference_conflict' | 'persistence_failed' }

export type SettleVerifiedPaymentInput = {
  engagement: EngagementRef
  expectedVersion: number
  expectedPayment: PaymentRecord & { idempotencyKey?: string }
  verifiedPayment: VerifiedPaymentEvent
  entitlement: EntitlementGrant
}

export type SettleVerifiedPaymentResult =
  | {
      ok: true
      duplicate: boolean
      version: number
      payment: PaymentRecord & { idempotencyKey?: string }
      entitlement: EntitlementGrant
      engagement: EngagementRef
    }
  | { ok: false; reason: 'version_conflict'; currentVersion: number }
  | { ok: false; reason: 'persistence_failed'; domainReason?: string }

export interface ControlPlanePersistencePort {
  bootstrapEngagement(input: BootstrapEngagementInput): Promise<BootstrapEngagementResult>
  loadEngagementBundle(engagementId: string): Promise<EngagementBundle | null>
  commitLifecycle(input: LifecycleCommit): Promise<LifecycleCommitResult>
  createPaymentIntent(input: PaymentIntentCommit): Promise<PaymentIntentCommitResult>
  linkCheckoutReference(input: CheckoutCorrelationInput): Promise<CheckoutCorrelationResult>
  settleVerifiedPayment(input: SettleVerifiedPaymentInput): Promise<SettleVerifiedPaymentResult>
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

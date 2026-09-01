import { bindWebhookTrustToPayment, validateTrustedWebhookEnvelope } from './webhook-trust.mjs'

function providerForRail(rail) {
  if (rail === 'apple_iap') return 'apple'
  if (rail === 'b2b_web') return 'web_gateway'
  if (rail === 'manual_invoice') return 'manual'
  return null
}

function entitlementForEngagement(engagement, occurredAt) {
  if (engagement.product === 'nexus' && engagement.kind === 'nexus_lifecycle') {
    return {
      organizationId: engagement.organizationId,
      key: 'nexus.pilot_workspace',
      status: 'active',
      source: 'payment',
      startsAt: occurredAt,
    }
  }
  if (engagement.product === 'cliniverse' && engagement.kind === 'subscription') {
    return {
      organizationId: engagement.organizationId,
      key: 'cliniverse.core',
      status: 'active',
      source: 'subscription',
      startsAt: occurredAt,
    }
  }
  return null
}

function paymentScopeMatches(expectedPayment, verifiedPayment) {
  return expectedPayment.engagementId === verifiedPayment.engagementId
    && expectedPayment.organizationId === verifiedPayment.organizationId
    && expectedPayment.idempotencyKey === verifiedPayment.idempotencyKey
}

export function createPaymentSettlementService({ persistence, paymentPort }) {
  if (!persistence?.loadEngagementBundle || !persistence?.settleVerifiedPayment) {
    throw new Error('invalid_persistence_port')
  }
  if (!paymentPort?.rail || typeof paymentPort.verifyWebhook !== 'function') {
    throw new Error('invalid_payment_port')
  }

  async function verifyIncomingWebhook({ rawBody, signature }) {
    let envelope
    try {
      envelope = await paymentPort.verifyWebhook({ rawBody, signature })
    } catch (error) {
      return {
        ok: false,
        reason: 'webhook_verification_failed',
        error: error instanceof Error ? error.message : String(error),
      }
    }

    const trust = validateTrustedWebhookEnvelope(envelope, rawBody)
    if (!trust.ok) return { ok: false, reason: 'webhook_trust_failed', trustReason: trust.reason }
    return { ok: true, envelope, verifiedPayment: bindWebhookTrustToPayment(envelope) }
  }

  async function settleResolvedPayment({ bundle, expectedPayment, verifiedPayment }) {
    const expectedProvider = providerForRail(paymentPort.rail)
    if (!expectedProvider || expectedPayment.provider !== expectedProvider) {
      return { ok: false, reason: 'payment_adapter_mismatch' }
    }
    if (!expectedPayment.providerReference) return { ok: false, reason: 'checkout_not_correlated' }
    if (verifiedPayment.providerReference !== expectedPayment.providerReference) {
      return { ok: false, reason: 'provider_reference_mismatch' }
    }
    if (!paymentScopeMatches(expectedPayment, verifiedPayment)) {
      return { ok: false, reason: 'verified_payment_scope_mismatch' }
    }

    const entitlement = entitlementForEngagement(bundle.engagement, verifiedPayment.occurredAt)
    if (!entitlement) return { ok: false, reason: 'unsupported_entitlement_target' }

    return persistence.settleVerifiedPayment({
      engagement: bundle.engagement,
      expectedVersion: bundle.version,
      expectedPayment,
      verifiedPayment,
      entitlement,
    })
  }

  // Backward-compatible/manual path when the caller already owns the internal IDs.
  async function settleWebhook({ engagementId, paymentId, rawBody, signature }) {
    const bundle = await persistence.loadEngagementBundle(engagementId)
    if (!bundle) return { ok: false, reason: 'engagement_not_found' }
    const expectedPayment = bundle.payments.find(item => item.paymentId === paymentId)
    if (!expectedPayment) return { ok: false, reason: 'payment_not_found' }

    const verified = await verifyIncomingWebhook({ rawBody, signature })
    if (!verified.ok) return verified
    return settleResolvedPayment({ bundle, expectedPayment, verifiedPayment: verified.verifiedPayment })
  }

  // Real provider path: never requires or trusts internal payment IDs from the HTTP request.
  async function settleProviderWebhook({ rawBody, signature }) {
    if (typeof persistence.findPaymentByProviderReference !== 'function') {
      return { ok: false, reason: 'provider_payment_lookup_unavailable' }
    }

    const verified = await verifyIncomingWebhook({ rawBody, signature })
    if (!verified.ok) return verified
    const verifiedPayment = verified.verifiedPayment

    const expectedProvider = providerForRail(paymentPort.rail)
    if (!expectedProvider) return { ok: false, reason: 'payment_adapter_mismatch' }

    let expectedPayment
    try {
      expectedPayment = await persistence.findPaymentByProviderReference({
        provider: expectedProvider,
        providerReference: verifiedPayment.providerReference,
      })
    } catch (error) {
      return {
        ok: false,
        reason: 'provider_payment_lookup_failed',
        error: error instanceof Error ? error.message : String(error),
      }
    }
    if (!expectedPayment) return { ok: false, reason: 'payment_not_found' }

    const bundle = await persistence.loadEngagementBundle(expectedPayment.engagementId)
    if (!bundle) return { ok: false, reason: 'engagement_not_found' }
    const currentPayment = bundle.payments.find(item => item.paymentId === expectedPayment.paymentId)
    if (!currentPayment) return { ok: false, reason: 'payment_not_found' }

    return settleResolvedPayment({ bundle, expectedPayment: currentPayment, verifiedPayment })
  }

  return { settleWebhook, settleProviderWebhook }
}

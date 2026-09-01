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

export function createPaymentSettlementService({ persistence, paymentPort }) {
  if (!persistence?.loadEngagementBundle || !persistence?.settleVerifiedPayment) {
    throw new Error('invalid_persistence_port')
  }
  if (!paymentPort?.rail || typeof paymentPort.verifyWebhook !== 'function') {
    throw new Error('invalid_payment_port')
  }

  async function settleWebhook({ engagementId, paymentId, rawBody, signature }) {
    const bundle = await persistence.loadEngagementBundle(engagementId)
    if (!bundle) return { ok: false, reason: 'engagement_not_found' }

    const expectedPayment = bundle.payments.find(item => item.paymentId === paymentId)
    if (!expectedPayment) return { ok: false, reason: 'payment_not_found' }

    const expectedProvider = providerForRail(paymentPort.rail)
    if (!expectedProvider || expectedPayment.provider !== expectedProvider) {
      return { ok: false, reason: 'payment_adapter_mismatch' }
    }

    if (!expectedPayment.providerReference) {
      return { ok: false, reason: 'checkout_not_correlated' }
    }

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

    const verifiedPayment = bindWebhookTrustToPayment(envelope)
    if (verifiedPayment.providerReference !== expectedPayment.providerReference) {
      return { ok: false, reason: 'provider_reference_mismatch' }
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

  return { settleWebhook }
}

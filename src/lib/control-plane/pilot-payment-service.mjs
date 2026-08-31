import { createPolicyApprovedCheckout } from './commerce-gate.mjs'

function nowIso(clock) {
  return (clock ? clock() : new Date()).toISOString()
}

function providerForRail(rail) {
  if (rail === 'apple_iap') return 'apple'
  if (rail === 'b2b_web') return 'web_gateway'
  if (rail === 'manual_invoice') return 'manual'
  return null
}

export function createPilotPaymentService({ persistence, paymentPort, clock }) {
  if (!persistence?.loadEngagementBundle || !persistence?.createPaymentIntent) {
    throw new Error('invalid_persistence_port')
  }
  if (!paymentPort?.rail || typeof paymentPort.createCheckout !== 'function') {
    throw new Error('invalid_payment_port')
  }

  async function requestPilotPayment({
    engagementId,
    paymentId,
    amountMinor,
    currency = 'SAR',
    description = 'Nexus 14-day pilot',
    idempotencyKey,
    actorId = 'system',
  }) {
    const bundle = await persistence.loadEngagementBundle(engagementId)
    if (!bundle) return { ok: false, reason: 'engagement_not_found' }
    if (bundle.engagement.product !== 'nexus' || bundle.engagement.kind !== 'nexus_lifecycle') {
      return { ok: false, reason: 'not_nexus_lifecycle' }
    }
    if (bundle.engagement.state !== 'PILOT_PROPOSED') {
      return { ok: false, reason: 'payment_not_requestable_from_current_state', state: bundle.engagement.state }
    }

    const provider = providerForRail(paymentPort.rail)
    if (!provider) return { ok: false, reason: 'unsupported_payment_rail' }

    const occurredAt = nowIso(clock)
    const event = {
      eventId: `payment:${paymentId}:requested`,
      type: 'PAYMENT_REQUESTED',
      occurredAt,
      organizationId: bundle.engagement.organizationId,
      engagementId,
      actor: actorId === 'system'
        ? { type: 'system' }
        : { type: 'operator', actorId },
      payload: {
        paymentId,
        amountMinor,
        currency,
        provider,
        idempotencyKey,
      },
    }

    const payment = {
      paymentId,
      organizationId: bundle.engagement.organizationId,
      engagementId,
      provider,
      amountMinor,
      currency,
      status: 'pending',
      idempotencyKey,
      createdAt: occurredAt,
    }

    const intent = await persistence.createPaymentIntent({
      engagement: bundle.engagement,
      event,
      payment,
      expectedVersion: bundle.version,
    })
    if (!intent.ok) return intent

    const commerceContext = {
      product: 'nexus',
      channel: 'web',
      buyerType: 'organization',
      offeringType: 'pilot',
    }

    try {
      const checkout = await createPolicyApprovedCheckout(paymentPort, {
        organizationId: bundle.engagement.organizationId,
        engagementId,
        amountMinor,
        currency,
        description,
        idempotencyKey,
        commerceContext,
      })

      if (!checkout.ok) {
        return {
          ok: false,
          reason: checkout.reason,
          paymentIntentCreated: true,
          version: intent.version,
        }
      }

      return {
        ok: true,
        paymentIntentCreated: !intent.duplicate,
        duplicateIntent: intent.duplicate,
        version: intent.version,
        payment: intent.payment,
        checkout: checkout.checkout,
        rail: checkout.rail,
        policy: checkout.policy,
      }
    } catch (error) {
      return {
        ok: false,
        reason: 'checkout_failed',
        paymentIntentCreated: true,
        version: intent.version,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  return { requestPilotPayment }
}

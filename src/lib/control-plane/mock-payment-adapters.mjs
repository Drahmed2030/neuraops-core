import { rawBodySha256 } from './webhook-trust.mjs'

function checkoutId(prefix, request) {
  return `${prefix}:${request.engagementId}:${request.idempotencyKey}`
}

function trustedEnvelope(input, prefix) {
  const payment = input.verifiedEvent ?? input.payment
  if (!payment) throw new Error('mock_verified_payment_required')
  return {
    signatureVerified: input.signature !== 'invalid',
    providerEventId: input.providerEventId ?? `${prefix}:event:${payment.providerReference}`,
    providerEventType: input.providerEventType ?? 'payment.paid',
    verifiedAt: input.verifiedAt ?? payment.occurredAt,
    rawBodyHash: rawBodySha256(input.rawBody),
    payment,
  }
}

export function createApplePaymentAdapterMock() {
  const calls = []
  return {
    rail: 'apple_iap',
    calls,
    async createCheckout(request) {
      calls.push({ type: 'createCheckout', request })
      return {
        providerReference: checkoutId('apple', request),
        status: 'pending',
      }
    },
    async verifyWebhook(input) {
      calls.push({ type: 'verifyWebhook', input })
      return trustedEnvelope(input, 'apple')
    },
  }
}

export function createB2BWebPaymentAdapterMock() {
  const calls = []
  return {
    rail: 'b2b_web',
    calls,
    async createCheckout(request) {
      calls.push({ type: 'createCheckout', request })
      return {
        providerReference: checkoutId('b2b', request),
        checkoutUrl: `https://example.invalid/pay/${request.engagementId}`,
        status: 'pending',
      }
    },
    async verifyWebhook(input) {
      calls.push({ type: 'verifyWebhook', input })
      return trustedEnvelope(input, 'b2b')
    },
  }
}

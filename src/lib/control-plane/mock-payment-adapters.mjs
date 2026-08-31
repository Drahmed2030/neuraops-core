function checkoutId(prefix, request) {
  return `${prefix}:${request.engagementId}:${request.idempotencyKey}`
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
      return input.verifiedEvent
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
      return input.verifiedEvent
    },
  }
}

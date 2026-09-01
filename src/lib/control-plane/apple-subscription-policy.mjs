const allowedEnvironments = new Set(['Sandbox', 'Production'])

export function validateAppleSubscriptionVerification(expectedPayment, verified) {
  if (!expectedPayment?.paymentId || expectedPayment.provider !== 'apple') {
    return { ok: false, reason: 'invalid_expected_apple_payment' }
  }
  if (!verified?.transactionId || !verified?.originalTransactionId || !verified?.productId) {
    return { ok: false, reason: 'invalid_apple_transaction' }
  }
  if (!allowedEnvironments.has(verified.environment)) {
    return { ok: false, reason: 'invalid_apple_environment' }
  }
  if (verified.environment === 'Production' && verified.sandboxOnly === true) {
    return { ok: false, reason: 'production_transaction_blocked_in_sandbox' }
  }
  if (verified.appAppleId && verified.expectedAppAppleId && verified.appAppleId !== verified.expectedAppAppleId) {
    return { ok: false, reason: 'apple_app_mismatch' }
  }
  if (verified.bundleId && verified.expectedBundleId && verified.bundleId !== verified.expectedBundleId) {
    return { ok: false, reason: 'apple_bundle_mismatch' }
  }
  if (verified.expectedProductId && verified.productId !== verified.expectedProductId) {
    return { ok: false, reason: 'apple_product_mismatch' }
  }
  if (verified.revocationDate) return { ok: false, reason: 'apple_transaction_revoked' }
  if (verified.expiresDate && Date.parse(verified.expiresDate) <= Date.parse(verified.verifiedAt)) {
    return { ok: false, reason: 'apple_subscription_expired' }
  }
  if (expectedPayment.providerReference && expectedPayment.providerReference !== verified.originalTransactionId) {
    return { ok: false, reason: 'apple_original_transaction_mismatch' }
  }
  return { ok: true }
}

export function normalizeAppleVerifiedPayment(expectedPayment, verified) {
  const validation = validateAppleSubscriptionVerification(expectedPayment, verified)
  if (!validation.ok) return validation

  return {
    ok: true,
    payment: {
      providerReference: verified.originalTransactionId,
      engagementId: expectedPayment.engagementId,
      organizationId: expectedPayment.organizationId,
      amountMinor: expectedPayment.amountMinor,
      currency: expectedPayment.currency,
      status: 'paid',
      occurredAt: verified.purchaseDate,
      idempotencyKey: expectedPayment.idempotencyKey,
      providerEventId: `apple:transaction:${verified.transactionId}`,
      providerEventType: 'apple.transaction.verified',
      webhookVerifiedAt: verified.verifiedAt,
      rawBodyHash: verified.signedPayloadHash,
    },
  }
}

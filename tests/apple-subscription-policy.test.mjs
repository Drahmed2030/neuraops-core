import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeAppleVerifiedPayment, validateAppleSubscriptionVerification } from '../src/lib/control-plane/apple-subscription-policy.mjs'

function expected(overrides = {}) {
  return {
    paymentId: 'pay-apple-1',
    organizationId: 'org-cliniverse-1',
    engagementId: 'eng-cliniverse-1',
    provider: 'apple',
    amountMinor: 8999,
    currency: 'SAR',
    status: 'pending',
    idempotencyKey: 'cliniverse-sub-1',
    providerReference: 'orig-apple-1',
    createdAt: '2026-09-01T00:00:00Z',
    ...overrides,
  }
}

function verified(overrides = {}) {
  return {
    transactionId: 'tx-apple-2',
    originalTransactionId: 'orig-apple-1',
    productId: 'cliniverse.core.monthly',
    expectedProductId: 'cliniverse.core.monthly',
    bundleId: 'com.cliniverse.ai',
    expectedBundleId: 'com.cliniverse.ai',
    environment: 'Sandbox',
    purchaseDate: '2026-09-01T00:05:00Z',
    expiresDate: '2026-10-01T00:05:00Z',
    verifiedAt: '2026-09-01T00:05:01Z',
    signedPayloadHash: 'sha256:apple-signed-payload',
    ...overrides,
  }
}

test('valid Apple subscription transaction normalizes to Control Plane payment identity', () => {
  const result = normalizeAppleVerifiedPayment(expected(), verified())
  assert.equal(result.ok, true)
  assert.equal(result.payment.providerReference, 'orig-apple-1')
  assert.equal(result.payment.providerEventId, 'apple:transaction:tx-apple-2')
  assert.equal(result.payment.status, 'paid')
})

test('Apple product mismatch fails closed', () => {
  const result = validateAppleSubscriptionVerification(expected(), verified({ productId: 'wrong.product' }))
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'apple_product_mismatch')
})

test('Apple bundle mismatch fails closed', () => {
  const result = validateAppleSubscriptionVerification(expected(), verified({ bundleId: 'com.attacker.app' }))
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'apple_bundle_mismatch')
})

test('revoked Apple transaction cannot grant access', () => {
  const result = validateAppleSubscriptionVerification(expected(), verified({ revocationDate: '2026-09-01T00:04:00Z' }))
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'apple_transaction_revoked')
})

test('expired Apple subscription cannot grant access', () => {
  const result = validateAppleSubscriptionVerification(expected(), verified({ expiresDate: '2026-08-31T23:59:59Z' }))
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'apple_subscription_expired')
})

test('original transaction mismatch cannot hijack another subscription record', () => {
  const result = validateAppleSubscriptionVerification(expected(), verified({ originalTransactionId: 'orig-other-user' }))
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'apple_original_transaction_mismatch')
})

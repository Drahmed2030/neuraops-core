import test from 'node:test'
import assert from 'node:assert/strict'
import { APPLE_SUBSCRIPTION_ACCESS, decideAppleSubscriptionAccess } from '../src/lib/control-plane/apple-subscription-access-policy.mjs'

const now = '2026-09-01T07:00:00Z'

test('active Apple subscription grants access', () => {
  const result = decideAppleSubscriptionAccess({ status: 1, autoRenewStatus: 1, expiresDate: '2026-10-01T00:00:00Z', now })
  assert.equal(result.ok, true)
  assert.equal(result.action, APPLE_SUBSCRIPTION_ACCESS.GRANT)
  assert.equal(result.autoRenewEnabled, true)
})

test('auto-renew disabled keeps access until paid expiration', () => {
  const result = decideAppleSubscriptionAccess({
    notificationType: 'DID_CHANGE_RENEWAL_STATUS',
    autoRenewStatus: 0,
    expiresDate: '2026-09-20T00:00:00Z',
    now,
  })
  assert.equal(result.action, APPLE_SUBSCRIPTION_ACCESS.CONTINUE)
})

test('billing grace period continues access while grace remains', () => {
  const result = decideAppleSubscriptionAccess({
    status: 4,
    gracePeriodExpiresDate: '2026-09-05T00:00:00Z',
    now,
  })
  assert.equal(result.action, APPLE_SUBSCRIPTION_ACCESS.CONTINUE)
})

test('billing retry without active grace suspends access', () => {
  const result = decideAppleSubscriptionAccess({ status: 3, notificationType: 'DID_FAIL_TO_RENEW', now })
  assert.equal(result.action, APPLE_SUBSCRIPTION_ACCESS.SUSPEND)
})

test('expired Apple subscription expires entitlement', () => {
  const result = decideAppleSubscriptionAccess({ status: 2, notificationType: 'EXPIRED', now })
  assert.equal(result.action, APPLE_SUBSCRIPTION_ACCESS.EXPIRE)
})

test('revoked Apple subscription revokes entitlement', () => {
  const result = decideAppleSubscriptionAccess({ status: 5, notificationType: 'REVOKE', now })
  assert.equal(result.action, APPLE_SUBSCRIPTION_ACCESS.REVOKE)
})

test('confirmed refund revokes access', () => {
  const result = decideAppleSubscriptionAccess({ notificationType: 'REFUND', now })
  assert.equal(result.action, APPLE_SUBSCRIPTION_ACCESS.REVOKE)
})

test('refund reversal requires current-state reconciliation instead of blind grant', () => {
  const result = decideAppleSubscriptionAccess({ notificationType: 'REFUND_REVERSED', now })
  assert.equal(result.action, APPLE_SUBSCRIPTION_ACCESS.REVIEW)
})

test('unknown Apple state fails safe to human review', () => {
  const result = decideAppleSubscriptionAccess({ notificationType: 'PRICE_INCREASE', now })
  assert.equal(result.action, APPLE_SUBSCRIPTION_ACCESS.REVIEW)
})

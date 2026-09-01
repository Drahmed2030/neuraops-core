export const APPLE_SUBSCRIPTION_ACCESS = Object.freeze({
  GRANT: 'grant',
  CONTINUE: 'continue',
  SUSPEND: 'suspend',
  EXPIRE: 'expire',
  REVOKE: 'revoke',
  REVIEW: 'human_review',
})

const STATUS = Object.freeze({
  ACTIVE: 1,
  EXPIRED: 2,
  BILLING_RETRY: 3,
  BILLING_GRACE_PERIOD: 4,
  REVOKED: 5,
})

function result(action, reason, extra = {}) {
  return { ok: true, action, reason, ...extra }
}

export function decideAppleSubscriptionAccess(input) {
  if (!input || typeof input !== 'object') {
    return { ok: false, reason: 'invalid_apple_subscription_state' }
  }

  const { notificationType, subtype, status, autoRenewStatus, gracePeriodExpiresDate, expiresDate, revocationDate, now } = input
  const referenceTime = Date.parse(now ?? new Date().toISOString())
  if (!Number.isFinite(referenceTime)) return { ok: false, reason: 'invalid_reference_time' }

  if (revocationDate || notificationType === 'REVOKE' || status === STATUS.REVOKED) {
    return result(APPLE_SUBSCRIPTION_ACCESS.REVOKE, 'apple_revoked')
  }

  if (notificationType === 'REFUND') {
    return result(APPLE_SUBSCRIPTION_ACCESS.REVOKE, 'apple_refund_confirmed')
  }

  if (notificationType === 'REFUND_REVERSED') {
    return result(APPLE_SUBSCRIPTION_ACCESS.REVIEW, 'refund_reversed_requires_current_status_reconciliation')
  }

  if (status === STATUS.BILLING_GRACE_PERIOD || subtype === 'GRACE_PERIOD') {
    if (gracePeriodExpiresDate && Date.parse(gracePeriodExpiresDate) <= referenceTime) {
      return result(APPLE_SUBSCRIPTION_ACCESS.SUSPEND, 'billing_grace_period_expired')
    }
    return result(APPLE_SUBSCRIPTION_ACCESS.CONTINUE, 'billing_grace_period_active')
  }

  if (status === STATUS.BILLING_RETRY || subtype === 'BILLING_RETRY' || notificationType === 'DID_FAIL_TO_RENEW') {
    return result(APPLE_SUBSCRIPTION_ACCESS.SUSPEND, 'billing_retry_requires_recovery_or_grace')
  }

  if (notificationType === 'GRACE_PERIOD_EXPIRED') {
    return result(APPLE_SUBSCRIPTION_ACCESS.SUSPEND, 'grace_period_expired')
  }

  if (notificationType === 'EXPIRED' || status === STATUS.EXPIRED) {
    return result(APPLE_SUBSCRIPTION_ACCESS.EXPIRE, 'apple_subscription_expired')
  }

  if (status === STATUS.ACTIVE || notificationType === 'SUBSCRIBED' || notificationType === 'DID_RENEW') {
    if (expiresDate && Date.parse(expiresDate) <= referenceTime) {
      return result(APPLE_SUBSCRIPTION_ACCESS.EXPIRE, 'verified_expiration_reached')
    }
    return result(APPLE_SUBSCRIPTION_ACCESS.GRANT, 'apple_subscription_active', {
      autoRenewEnabled: autoRenewStatus === 1,
    })
  }

  if (notificationType === 'DID_CHANGE_RENEWAL_STATUS' && autoRenewStatus === 0) {
    if (expiresDate && Date.parse(expiresDate) > referenceTime) {
      return result(APPLE_SUBSCRIPTION_ACCESS.CONTINUE, 'auto_renew_disabled_access_until_expiration')
    }
    return result(APPLE_SUBSCRIPTION_ACCESS.EXPIRE, 'auto_renew_disabled_and_expired')
  }

  return result(APPLE_SUBSCRIPTION_ACCESS.REVIEW, 'apple_state_requires_reconciliation')
}

export function validateVerifiedPayment(expected, verified) {
  if (!expected?.paymentId || !expected?.organizationId || !expected?.engagementId) {
    return { ok: false, reason: 'invalid_expected_payment' }
  }
  if (!verified?.providerReference || !verified?.organizationId || !verified?.engagementId || !verified?.occurredAt) {
    return { ok: false, reason: 'invalid_verified_payment' }
  }
  if (verified.status !== 'paid') return { ok: false, reason: 'payment_not_paid' }
  if (verified.organizationId !== expected.organizationId || verified.engagementId !== expected.engagementId) {
    return { ok: false, reason: 'payment_scope_mismatch' }
  }
  if (verified.currency !== expected.currency) return { ok: false, reason: 'currency_mismatch' }
  if (verified.amountMinor !== expected.amountMinor) return { ok: false, reason: 'amount_mismatch' }

  return { ok: true }
}

export function paymentReceivedEvent(expected, verified) {
  const validation = validateVerifiedPayment(expected, verified)
  if (!validation.ok) return validation

  const providerEventId = typeof verified.providerEventId === 'string' && verified.providerEventId
    ? verified.providerEventId
    : verified.providerReference

  return {
    ok: true,
    event: {
      eventId: `payment:${providerEventId}:paid`,
      type: 'PAYMENT_RECEIVED',
      occurredAt: verified.occurredAt,
      organizationId: expected.organizationId,
      engagementId: expected.engagementId,
      actor: { type: 'integration', actorId: expected.provider },
      payload: {
        paymentId: expected.paymentId,
        providerReference: verified.providerReference,
        providerEventId: verified.providerEventId ?? null,
        providerEventType: verified.providerEventType ?? null,
        webhookVerifiedAt: verified.webhookVerifiedAt ?? null,
        rawBodyHash: verified.rawBodyHash ?? null,
        amountMinor: verified.amountMinor,
        currency: verified.currency,
      },
    },
  }
}

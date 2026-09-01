import { createHash } from 'crypto'

export function rawBodySha256(rawBody) {
  if (typeof rawBody !== 'string') return null
  return `sha256:${createHash('sha256').update(rawBody).digest('hex')}`
}

export function validateTrustedWebhookEnvelope(envelope, rawBody) {
  if (!envelope || typeof envelope !== 'object') return { ok: false, reason: 'invalid_webhook_envelope' }
  if (envelope.signatureVerified !== true) return { ok: false, reason: 'signature_not_verified' }
  if (!envelope.providerEventId || typeof envelope.providerEventId !== 'string') {
    return { ok: false, reason: 'provider_event_id_required' }
  }
  if (!envelope.providerEventType || typeof envelope.providerEventType !== 'string') {
    return { ok: false, reason: 'provider_event_type_required' }
  }
  if (!envelope.verifiedAt || Number.isNaN(Date.parse(envelope.verifiedAt))) {
    return { ok: false, reason: 'invalid_webhook_verified_at' }
  }
  if (!envelope.rawBodyHash || !/^sha256:[a-f0-9]{64}$/.test(envelope.rawBodyHash)) {
    return { ok: false, reason: 'invalid_raw_body_hash' }
  }
  if (!envelope.payment || typeof envelope.payment !== 'object') {
    return { ok: false, reason: 'verified_payment_required' }
  }

  const actualHash = rawBodySha256(rawBody)
  if (!actualHash || actualHash !== envelope.rawBodyHash) {
    return { ok: false, reason: 'raw_body_hash_mismatch' }
  }

  return { ok: true }
}

export function bindWebhookTrustToPayment(envelope) {
  return {
    ...envelope.payment,
    providerEventId: envelope.providerEventId,
    providerEventType: envelope.providerEventType,
    webhookVerifiedAt: envelope.verifiedAt,
    rawBodyHash: envelope.rawBodyHash,
  }
}

import test from 'node:test'
import assert from 'node:assert/strict'
import { createInMemoryControlPlanePersistence } from '../src/lib/control-plane/in-memory-persistence.mjs'
import { createPaymentSettlementService } from '../src/lib/control-plane/payment-settlement-service.mjs'
import { rawBodySha256 } from '../src/lib/control-plane/webhook-trust.mjs'

function seed() {
  return {
    engagement: {
      engagementId: 'eng-1',
      organizationId: 'org-1',
      product: 'nexus',
      kind: 'nexus_lifecycle',
      state: 'PAYMENT_PENDING',
    },
    events: [{
      eventId: 'payment:pay-1:requested',
      type: 'PAYMENT_REQUESTED',
      occurredAt: '2026-09-01T00:00:00Z',
      organizationId: 'org-1',
      engagementId: 'eng-1',
      actor: { type: 'system' },
      payload: { paymentId: 'pay-1' },
    }],
    entitlements: [],
    payments: [{
      paymentId: 'pay-1',
      organizationId: 'org-1',
      engagementId: 'eng-1',
      provider: 'web_gateway',
      amountMinor: 250000,
      currency: 'SAR',
      status: 'pending',
      idempotencyKey: 'idem-1',
      providerReference: 'checkout-1',
      createdAt: '2026-09-01T00:00:00Z',
    }],
    version: 7,
  }
}

function paymentPort(paymentOverrides = {}, envelopeOverrides = {}) {
  return {
    rail: 'b2b_web',
    async verifyWebhook({ rawBody }) {
      const payment = {
        providerReference: 'checkout-1',
        engagementId: 'eng-1',
        organizationId: 'org-1',
        amountMinor: 250000,
        currency: 'SAR',
        status: 'paid',
        occurredAt: '2026-09-01T00:05:00Z',
        idempotencyKey: 'idem-1',
        ...paymentOverrides,
      }
      return {
        signatureVerified: true,
        providerEventId: 'evt-provider-1',
        providerEventType: 'payment.paid',
        verifiedAt: '2026-09-01T00:05:01Z',
        rawBodyHash: rawBodySha256(rawBody),
        payment,
        ...envelopeOverrides,
      }
    },
  }
}

async function settle(service, rawBody = '{}') {
  return service.settleWebhook({ engagementId: 'eng-1', paymentId: 'pay-1', rawBody, signature: 'sig' })
}

test('trusted Nexus payment settles atomically to PILOT_READY', async () => {
  const persistence = createInMemoryControlPlanePersistence([seed()])
  const service = createPaymentSettlementService({ persistence, paymentPort: paymentPort() })

  const result = await settle(service)
  assert.equal(result.ok, true)
  assert.equal(result.duplicate, false)
  assert.equal(result.version, 8)
  assert.equal(result.engagement.state, 'PILOT_READY')
  assert.equal(result.payment.status, 'paid')
  assert.equal(result.entitlement.key, 'nexus.pilot_workspace')

  const bundle = await persistence.loadEngagementBundle('eng-1')
  const received = bundle.events.find(event => event.type === 'PAYMENT_RECEIVED')
  assert.equal(bundle.events.filter(event => event.type === 'PAYMENT_RECEIVED').length, 1)
  assert.equal(bundle.events.filter(event => event.type === 'ENTITLEMENT_GRANTED').length, 1)
  assert.equal(bundle.entitlements.length, 1)
  assert.equal(received.eventId, 'payment:evt-provider-1:paid')
  assert.equal(received.payload.providerEventId, 'evt-provider-1')
  assert.equal(received.payload.rawBodyHash, rawBodySha256('{}'))
  assert.equal('rawBody' in received.payload, false)
})

test('exact trusted webhook retry is a successful no-op', async () => {
  const persistence = createInMemoryControlPlanePersistence([seed()])
  const service = createPaymentSettlementService({ persistence, paymentPort: paymentPort() })
  const first = await settle(service)
  const retry = await settle(service)

  assert.equal(first.ok, true)
  assert.equal(retry.ok, true)
  assert.equal(retry.duplicate, true)
  assert.equal(retry.version, 8)
})

test('amount mismatch cannot mutate paid state', async () => {
  const persistence = createInMemoryControlPlanePersistence([seed()])
  const service = createPaymentSettlementService({ persistence, paymentPort: paymentPort({ amountMinor: 249900 }) })
  const result = await settle(service)

  assert.equal(result.ok, false)
  assert.equal(result.domainReason, 'amount_mismatch')
  const bundle = await persistence.loadEngagementBundle('eng-1')
  assert.equal(bundle.engagement.state, 'PAYMENT_PENDING')
  assert.equal(bundle.payments[0].status, 'pending')
  assert.equal(bundle.entitlements.length, 0)
})

test('unverified signature is rejected before settlement', async () => {
  let settlements = 0
  const base = createInMemoryControlPlanePersistence([seed()])
  const persistence = {
    ...base,
    async settleVerifiedPayment(input) { settlements += 1; return base.settleVerifiedPayment(input) },
  }
  const service = createPaymentSettlementService({ persistence, paymentPort: paymentPort({}, { signatureVerified: false }) })
  const result = await settle(service)

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'webhook_trust_failed')
  assert.equal(result.trustReason, 'signature_not_verified')
  assert.equal(settlements, 0)
})

test('missing provider event id is rejected before settlement', async () => {
  const persistence = createInMemoryControlPlanePersistence([seed()])
  const service = createPaymentSettlementService({ persistence, paymentPort: paymentPort({}, { providerEventId: '' }) })
  const result = await settle(service)

  assert.equal(result.ok, false)
  assert.equal(result.trustReason, 'provider_event_id_required')
})

test('raw body tampering after verification is rejected', async () => {
  const persistence = createInMemoryControlPlanePersistence([seed()])
  const service = createPaymentSettlementService({
    persistence,
    paymentPort: paymentPort({}, { rawBodyHash: rawBodySha256('{"original":true}') }),
  })
  const result = await settle(service, '{"tampered":true}')

  assert.equal(result.ok, false)
  assert.equal(result.trustReason, 'raw_body_hash_mismatch')
  const bundle = await persistence.loadEngagementBundle('eng-1')
  assert.equal(bundle.engagement.state, 'PAYMENT_PENDING')
})

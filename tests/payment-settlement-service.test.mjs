import test from 'node:test'
import assert from 'node:assert/strict'
import { createInMemoryControlPlanePersistence } from '../src/lib/control-plane/in-memory-persistence.mjs'
import { createPaymentSettlementService } from '../src/lib/control-plane/payment-settlement-service.mjs'

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

function paymentPort(overrides = {}) {
  return {
    rail: 'b2b_web',
    async verifyWebhook() {
      return {
        providerReference: 'checkout-1',
        engagementId: 'eng-1',
        organizationId: 'org-1',
        amountMinor: 250000,
        currency: 'SAR',
        status: 'paid',
        occurredAt: '2026-09-01T00:05:00Z',
        idempotencyKey: 'idem-1',
        ...overrides,
      }
    },
  }
}

test('verified Nexus payment settles atomically to PILOT_READY', async () => {
  const persistence = createInMemoryControlPlanePersistence([seed()])
  const service = createPaymentSettlementService({ persistence, paymentPort: paymentPort() })

  const result = await service.settleWebhook({ engagementId: 'eng-1', paymentId: 'pay-1', rawBody: '{}', signature: 'sig' })
  assert.equal(result.ok, true)
  assert.equal(result.duplicate, false)
  assert.equal(result.version, 8)
  assert.equal(result.engagement.state, 'PILOT_READY')
  assert.equal(result.payment.status, 'paid')
  assert.equal(result.entitlement.key, 'nexus.pilot_workspace')

  const bundle = await persistence.loadEngagementBundle('eng-1')
  assert.equal(bundle.events.filter(event => event.type === 'PAYMENT_RECEIVED').length, 1)
  assert.equal(bundle.events.filter(event => event.type === 'ENTITLEMENT_GRANTED').length, 1)
  assert.equal(bundle.entitlements.length, 1)
})

test('exact webhook retry is a successful no-op', async () => {
  const persistence = createInMemoryControlPlanePersistence([seed()])
  const service = createPaymentSettlementService({ persistence, paymentPort: paymentPort() })
  const first = await service.settleWebhook({ engagementId: 'eng-1', paymentId: 'pay-1', rawBody: '{}', signature: 'sig' })
  const retry = await service.settleWebhook({ engagementId: 'eng-1', paymentId: 'pay-1', rawBody: '{}', signature: 'sig' })

  assert.equal(first.ok, true)
  assert.equal(retry.ok, true)
  assert.equal(retry.duplicate, true)
  assert.equal(retry.version, 8)
})

test('amount mismatch cannot mutate paid state', async () => {
  const persistence = createInMemoryControlPlanePersistence([seed()])
  const service = createPaymentSettlementService({ persistence, paymentPort: paymentPort({ amountMinor: 249900 }) })
  const result = await service.settleWebhook({ engagementId: 'eng-1', paymentId: 'pay-1', rawBody: '{}', signature: 'sig' })

  assert.equal(result.ok, false)
  assert.equal(result.domainReason, 'amount_mismatch')
  const bundle = await persistence.loadEngagementBundle('eng-1')
  assert.equal(bundle.engagement.state, 'PAYMENT_PENDING')
  assert.equal(bundle.payments[0].status, 'pending')
  assert.equal(bundle.entitlements.length, 0)
})

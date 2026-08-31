import test from 'node:test'
import assert from 'node:assert/strict'
import { createInMemoryControlPlanePersistence } from '../src/lib/control-plane/in-memory-persistence.mjs'
import { createB2BWebPaymentAdapterMock } from '../src/lib/control-plane/mock-payment-adapters.mjs'
import { createPilotPaymentService } from '../src/lib/control-plane/pilot-payment-service.mjs'

const clock = () => new Date('2026-09-01T01:30:00Z')

function seed(state = 'PILOT_PROPOSED') {
  return {
    engagement: {
      engagementId: 'eng-pilot-1',
      organizationId: 'org-pilot-1',
      product: 'nexus',
      kind: 'nexus_lifecycle',
      state,
    },
    events: [],
    entitlements: [],
    payments: [],
    version: 6,
  }
}

test('pilot payment creates pending intent before policy-approved checkout', async () => {
  const persistence = createInMemoryControlPlanePersistence([seed()])
  const paymentPort = createB2BWebPaymentAdapterMock()
  const service = createPilotPaymentService({ persistence, paymentPort, clock })

  const result = await service.requestPilotPayment({
    engagementId: 'eng-pilot-1',
    paymentId: 'pay-pilot-1',
    amountMinor: 250000,
    currency: 'SAR',
    idempotencyKey: 'pilot-pay-1',
  })

  assert.equal(result.ok, true)
  assert.equal(result.rail, 'b2b_web')
  assert.equal(result.payment.status, 'pending')
  assert.equal(paymentPort.calls.length, 1)

  const bundle = await persistence.loadEngagementBundle('eng-pilot-1')
  assert.equal(bundle.engagement.state, 'PAYMENT_PENDING')
  assert.equal(bundle.version, 7)
  assert.equal(bundle.payments.length, 1)
  assert.equal(bundle.payments[0].paymentId, 'pay-pilot-1')
  assert.equal(bundle.events[0].type, 'PAYMENT_REQUESTED')
})

test('exact retry reuses payment intent and deterministic checkout identity', async () => {
  const persistence = createInMemoryControlPlanePersistence([seed()])
  const paymentPort = createB2BWebPaymentAdapterMock()
  const service = createPilotPaymentService({ persistence, paymentPort, clock })
  const request = {
    engagementId: 'eng-pilot-1',
    paymentId: 'pay-pilot-1',
    amountMinor: 250000,
    currency: 'SAR',
    idempotencyKey: 'pilot-pay-1',
  }

  const first = await service.requestPilotPayment(request)
  assert.equal(first.ok, true)

  // A request service retry must be performed against the same business intent.
  // The lifecycle state has already moved to PAYMENT_PENDING, so use persistence
  // idempotency directly to prove the exact intent remains one record.
  const bundle = await persistence.loadEngagementBundle('eng-pilot-1')
  const duplicate = await persistence.createPaymentIntent({
    engagement: bundle.engagement,
    event: bundle.events[0],
    payment: bundle.payments[0],
    expectedVersion: 6,
  })

  assert.equal(duplicate.ok, true)
  assert.equal(duplicate.duplicate, true)
  assert.equal(duplicate.version, 7)
  const after = await persistence.loadEngagementBundle('eng-pilot-1')
  assert.equal(after.payments.length, 1)
  assert.equal(after.events.length, 1)
})

test('invalid payment intent does not advance lifecycle', async () => {
  const persistence = createInMemoryControlPlanePersistence([seed()])
  const paymentPort = createB2BWebPaymentAdapterMock()
  const service = createPilotPaymentService({ persistence, paymentPort, clock })

  const result = await service.requestPilotPayment({
    engagementId: 'eng-pilot-1',
    paymentId: 'pay-pilot-bad',
    amountMinor: -1,
    currency: 'SAR',
    idempotencyKey: 'pilot-pay-bad',
  })

  assert.equal(result.ok, false)
  const bundle = await persistence.loadEngagementBundle('eng-pilot-1')
  assert.equal(bundle.engagement.state, 'PILOT_PROPOSED')
  assert.equal(bundle.payments.length, 0)
  assert.equal(paymentPort.calls.length, 0)
})

test('payment cannot be requested before pilot proposal', async () => {
  const persistence = createInMemoryControlPlanePersistence([seed('REVIEW_COMPLETED')])
  const paymentPort = createB2BWebPaymentAdapterMock()
  const service = createPilotPaymentService({ persistence, paymentPort, clock })

  const result = await service.requestPilotPayment({
    engagementId: 'eng-pilot-1',
    paymentId: 'pay-pilot-1',
    amountMinor: 250000,
    currency: 'SAR',
    idempotencyKey: 'pilot-pay-1',
  })

  assert.equal(result.ok, false)
  assert.equal(paymentPort.calls.length, 0)
})

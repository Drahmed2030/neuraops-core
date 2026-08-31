import test from 'node:test'
import assert from 'node:assert/strict'
import { createPolicyApprovedCheckout } from '../src/lib/control-plane/commerce-gate.mjs'
import { fulfillVerifiedPayment } from '../src/lib/control-plane/fulfillment.mjs'
import { createApplePaymentAdapterMock, createB2BWebPaymentAdapterMock } from '../src/lib/control-plane/mock-payment-adapters.mjs'

test('Cliniverse consumer iOS uses Apple rail and grants Cliniverse entitlement after verified payment', async () => {
  const apple = createApplePaymentAdapterMock()
  const commerceContext = {
    product: 'cliniverse',
    channel: 'ios',
    buyerType: 'individual',
    offeringType: 'digital_subscription',
  }
  const checkout = await createPolicyApprovedCheckout(apple, {
    organizationId: 'org-cliniverse-1',
    engagementId: 'eng-cliniverse-1',
    amountMinor: 8999,
    currency: 'SAR',
    description: 'Cliniverse subscription',
    idempotencyKey: 'cliniverse-sub-1',
    commerceContext,
  })

  assert.equal(checkout.ok, true)
  assert.equal(checkout.rail, 'apple_iap')
  assert.equal(apple.calls.length, 1)

  const expectedPayment = {
    paymentId: 'pay-cliniverse-1',
    organizationId: 'org-cliniverse-1',
    engagementId: 'eng-cliniverse-1',
    provider: 'apple',
    amountMinor: 8999,
    currency: 'SAR',
    status: 'pending',
    createdAt: '2026-09-01T00:00:00Z',
  }
  const verifiedPayment = {
    providerReference: 'apple-tx-1',
    organizationId: 'org-cliniverse-1',
    engagementId: 'eng-cliniverse-1',
    amountMinor: 8999,
    currency: 'SAR',
    status: 'paid',
    occurredAt: '2026-09-01T00:05:00Z',
    idempotencyKey: 'cliniverse-sub-1',
  }
  const entitlementGrant = {
    organizationId: 'org-cliniverse-1',
    key: 'cliniverse.core',
    status: 'active',
    source: 'subscription',
    startsAt: '2026-09-01T00:05:00Z',
  }
  const engagement = {
    engagementId: 'eng-cliniverse-1',
    organizationId: 'org-cliniverse-1',
    state: 'PAYMENT_PENDING',
  }

  const fulfilled = fulfillVerifiedPayment({
    engagement,
    events: [],
    grants: [],
    expectedPayment,
    verifiedPayment,
    entitlementGrant,
  })

  assert.equal(fulfilled.ok, true)
  assert.equal(fulfilled.entitlementApplied, true)
  assert.equal(fulfilled.engagement.state, 'PILOT_READY')
  assert.equal(fulfilled.grants[0].key, 'cliniverse.core')
})

test('Nexus pilot uses B2B web rail and reaches PILOT_READY after verified payment and entitlement', async () => {
  const b2b = createB2BWebPaymentAdapterMock()
  const commerceContext = {
    product: 'nexus',
    channel: 'web',
    buyerType: 'organization',
    offeringType: 'pilot',
  }
  const checkout = await createPolicyApprovedCheckout(b2b, {
    organizationId: 'org-nexus-1',
    engagementId: 'eng-nexus-1',
    amountMinor: 250000,
    currency: 'SAR',
    description: 'Nexus 14-day pilot',
    idempotencyKey: 'nexus-pilot-1',
    commerceContext,
  })

  assert.equal(checkout.ok, true)
  assert.equal(checkout.rail, 'b2b_web')
  assert.equal(b2b.calls.length, 1)

  const expectedPayment = {
    paymentId: 'pay-nexus-1',
    organizationId: 'org-nexus-1',
    engagementId: 'eng-nexus-1',
    provider: 'web_gateway',
    amountMinor: 250000,
    currency: 'SAR',
    status: 'pending',
    createdAt: '2026-09-01T00:00:00Z',
  }
  const verifiedPayment = {
    providerReference: 'web-pay-1',
    organizationId: 'org-nexus-1',
    engagementId: 'eng-nexus-1',
    amountMinor: 250000,
    currency: 'SAR',
    status: 'paid',
    occurredAt: '2026-09-01T00:08:00Z',
    idempotencyKey: 'nexus-pilot-1',
  }
  const entitlementGrant = {
    organizationId: 'org-nexus-1',
    key: 'nexus.pilot_workspace',
    status: 'active',
    source: 'payment',
    startsAt: '2026-09-01T00:08:00Z',
  }
  const engagement = {
    engagementId: 'eng-nexus-1',
    organizationId: 'org-nexus-1',
    state: 'PAYMENT_PENDING',
  }

  const fulfilled = fulfillVerifiedPayment({
    engagement,
    events: [],
    grants: [],
    expectedPayment,
    verifiedPayment,
    entitlementGrant,
  })

  assert.equal(fulfilled.ok, true)
  assert.equal(fulfilled.engagement.state, 'PILOT_READY')
  assert.equal(fulfilled.grants[0].key, 'nexus.pilot_workspace')
  assert.equal(fulfilled.events.map(event => event.type).join(','), 'PAYMENT_RECEIVED,ENTITLEMENT_GRANTED')
})

test('commerce gate prevents the wrong adapter from being called', async () => {
  const b2b = createB2BWebPaymentAdapterMock()
  const result = await createPolicyApprovedCheckout(b2b, {
    organizationId: 'org-cliniverse-1',
    engagementId: 'eng-cliniverse-1',
    amountMinor: 8999,
    currency: 'SAR',
    description: 'Cliniverse subscription',
    idempotencyKey: 'blocked-1',
    commerceContext: {
      product: 'cliniverse',
      channel: 'ios',
      buyerType: 'individual',
      offeringType: 'digital_subscription',
    },
  })

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'commerce_rail_mismatch')
  assert.equal(b2b.calls.length, 0)
})

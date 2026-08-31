import test from 'node:test'
import assert from 'node:assert/strict'
import { createPolicyApprovedCheckout } from '../src/lib/control-plane/commerce-gate.mjs'

test('web payment adapter is never called for Cliniverse consumer iOS purchase', async () => {
  let calls = 0
  const webPort = {
    rail: 'b2b_web',
    createCheckout: async () => {
      calls += 1
      return { providerReference: 'web-1', status: 'pending' }
    },
  }

  const result = await createPolicyApprovedCheckout(webPort, {
    organizationId: 'org-1',
    engagementId: 'eng-1',
    amountMinor: 8999,
    currency: 'SAR',
    description: 'Cliniverse Pro',
    idempotencyKey: 'idem-cliniverse-1',
    commerceContext: {
      product: 'cliniverse',
      channel: 'ios',
      buyerType: 'individual',
      offeringType: 'digital_subscription',
    },
    approvedRail: 'b2b_web',
  })

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'commerce_rail_mismatch')
  assert.equal(result.requiredRail, 'apple_iap')
  assert.equal(calls, 0)
})

test('Apple adapter is never called for Nexus organization pilot', async () => {
  let calls = 0
  const applePort = {
    rail: 'apple_iap',
    createCheckout: async () => {
      calls += 1
      return { providerReference: 'apple-1', status: 'pending' }
    },
  }

  const result = await createPolicyApprovedCheckout(applePort, {
    organizationId: 'org-1',
    engagementId: 'eng-1',
    amountMinor: 250000,
    currency: 'SAR',
    description: 'Nexus 14-day pilot',
    idempotencyKey: 'idem-nexus-1',
    commerceContext: {
      product: 'nexus',
      channel: 'web',
      buyerType: 'organization',
      offeringType: 'pilot',
    },
    approvedRail: 'apple_iap',
  })

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'commerce_rail_mismatch')
  assert.equal(result.requiredRail, 'b2b_web')
  assert.equal(calls, 0)
})

test('approved B2B rail reaches payment adapter exactly once', async () => {
  let calls = 0
  const webPort = {
    rail: 'b2b_web',
    createCheckout: async input => {
      calls += 1
      assert.equal(input.approvedRail, 'b2b_web')
      return { providerReference: 'web-accepted', checkoutUrl: 'https://example.invalid/pay', status: 'pending' }
    },
  }

  const result = await createPolicyApprovedCheckout(webPort, {
    organizationId: 'org-1',
    engagementId: 'eng-1',
    amountMinor: 250000,
    currency: 'SAR',
    description: 'Nexus 14-day pilot',
    idempotencyKey: 'idem-nexus-2',
    commerceContext: {
      product: 'nexus',
      channel: 'web',
      buyerType: 'organization',
      offeringType: 'pilot',
    },
    approvedRail: 'b2b_web',
  })

  assert.equal(result.ok, true)
  assert.equal(result.rail, 'b2b_web')
  assert.equal(result.policy, 'nexus_b2b_service')
  assert.equal(result.checkout.providerReference, 'web-accepted')
  assert.equal(calls, 1)
})

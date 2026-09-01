import test from 'node:test'
import assert from 'node:assert/strict'
import { createMoyasarSandboxAdapter } from '../src/lib/control-plane/moyasar-sandbox-adapter.mjs'

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return structuredClone(body) },
  }
}

const request = {
  organizationId: 'org-1',
  engagementId: 'eng-1',
  amountMinor: 250000,
  currency: 'SAR',
  description: 'Nexus 14-day pilot',
  idempotencyKey: 'pilot-intent-1',
  approvedRail: 'b2b_web',
}

function invoice(overrides = {}) {
  return {
    id: 'inv-1',
    status: 'initiated',
    amount: 250000,
    currency: 'SAR',
    url: 'https://checkout.moyasar.example/invoices/inv-1',
    metadata: {
      engagement_id: 'eng-1',
      organization_id: 'org-1',
      idempotency_key: 'pilot-intent-1',
      control_plane: 'nexus_b2b_v1',
    },
    ...overrides,
  }
}

function paidPayment(overrides = {}) {
  return {
    id: 'pay-1',
    invoice_id: 'inv-1',
    status: 'paid',
    amount: 250000,
    currency: 'SAR',
    ...overrides,
  }
}

function webhook(overrides = {}) {
  return {
    id: 'evt-1',
    type: 'payment_paid',
    created_at: '2026-09-01T04:30:00Z',
    secret_token: 'whsec-test',
    account_name: 'NeuraOps Test',
    live: false,
    data: paidPayment(),
    ...overrides,
  }
}

function adapterWithFetch(fetchFn) {
  return createMoyasarSandboxAdapter({
    secretKey: 'sk_test_example',
    webhookSecret: 'whsec-test',
    fetchFn,
    clock: () => new Date('2026-09-01T04:31:00Z'),
    callbackUrl: 'https://example.invalid/api/moyasar/webhook',
    successUrl: 'https://example.invalid/nexus/success',
    backUrl: 'https://example.invalid/nexus',
  })
}

test('Moyasar checkout reuses a matching invoice by idempotency metadata', async () => {
  const calls = []
  const adapter = adapterWithFetch(async (url, init) => {
    calls.push({ url, init })
    return response({ invoices: [invoice()] })
  })

  const result = await adapter.createCheckout(request)
  assert.equal(result.providerReference, 'inv-1')
  assert.equal(result.status, 'pending')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].init.method, 'GET')
})

test('Moyasar checkout creates hosted invoice without cardholder data', async () => {
  const calls = []
  const adapter = adapterWithFetch(async (url, init) => {
    calls.push({ url, init })
    if (init.method === 'GET') return response({ invoices: [] })
    return response(invoice(), 201)
  })

  const result = await adapter.createCheckout(request)
  assert.equal(result.checkoutUrl, 'https://checkout.moyasar.example/invoices/inv-1')
  assert.equal(calls.length, 2)
  const body = JSON.parse(calls[1].init.body)
  assert.equal(body.amount, 250000)
  assert.equal(body.metadata.engagement_id, 'eng-1')
  assert.equal(body.metadata.idempotency_key, 'pilot-intent-1')
  assert.equal('source' in body, false)
  assert.equal(JSON.stringify(body).includes('card'), false)
})

test('Moyasar checkout reconciles an uncertain create outcome before retrying POST', async () => {
  let listCount = 0
  let postCount = 0
  const adapter = adapterWithFetch(async (_url, init) => {
    if (init.method === 'GET') {
      listCount += 1
      return response({ invoices: listCount === 1 ? [] : [invoice()] })
    }
    postCount += 1
    throw new Error('network_timeout')
  })

  const result = await adapter.createCheckout(request)
  assert.equal(result.providerReference, 'inv-1')
  assert.equal(postCount, 1)
  assert.equal(listCount, 2)
})

test('Moyasar webhook rejects forged shared secret before provider API reconciliation', async () => {
  let fetchCalls = 0
  const adapter = adapterWithFetch(async () => { fetchCalls += 1; return response({}) })
  const rawBody = JSON.stringify(webhook({ secret_token: 'wrong' }))

  await assert.rejects(() => adapter.verifyWebhook({ rawBody, signature: '' }), /moyasar_webhook_secret_mismatch/)
  assert.equal(fetchCalls, 0)
})

test('Moyasar sandbox adapter rejects live-mode webhook', async () => {
  const adapter = adapterWithFetch(async () => response({}))
  const rawBody = JSON.stringify(webhook({ live: true }))
  await assert.rejects(() => adapter.verifyWebhook({ rawBody, signature: '' }), /moyasar_live_webhook_rejected_in_sandbox/)
})

test('Moyasar webhook performs server-side payment and invoice reconciliation', async () => {
  const calls = []
  const adapter = adapterWithFetch(async (url, init) => {
    calls.push({ url, init })
    if (url.includes('/payments/pay-1')) return response(paidPayment())
    if (url.includes('/invoices/inv-1')) return response(invoice({ status: 'paid' }))
    throw new Error('unexpected_url')
  })
  const rawBody = JSON.stringify(webhook())

  const envelope = await adapter.verifyWebhook({ rawBody, signature: '' })
  assert.equal(envelope.signatureVerified, true)
  assert.equal(envelope.verificationMethod, 'moyasar_shared_secret+server_reconciliation')
  assert.equal(envelope.providerEventId, 'evt-1')
  assert.equal(envelope.providerEventType, 'payment_paid')
  assert.match(envelope.rawBodyHash, /^sha256:[0-9a-f]{64}$/)
  assert.equal(envelope.payment.providerReference, 'inv-1')
  assert.equal(envelope.payment.engagementId, 'eng-1')
  assert.equal(envelope.payment.organizationId, 'org-1')
  assert.equal(envelope.payment.amountMinor, 250000)
  assert.equal(envelope.payment.currency, 'SAR')
  assert.equal(envelope.payment.idempotencyKey, 'pilot-intent-1')
  assert.equal(calls.length, 2)
})

test('Moyasar webhook rejects payment/invoice amount disagreement', async () => {
  const adapter = adapterWithFetch(async (url) => {
    if (url.includes('/payments/pay-1')) return response(paidPayment({ amount: 249900 }))
    if (url.includes('/invoices/inv-1')) return response(invoice({ status: 'paid' }))
    throw new Error('unexpected_url')
  })
  const rawBody = JSON.stringify(webhook())

  await assert.rejects(() => adapter.verifyWebhook({ rawBody, signature: '' }), /moyasar_reconciliation_amount_mismatch/)
})

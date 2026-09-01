import { createHash, timingSafeEqual } from 'crypto'

const API_BASE = 'https://api.moyasar.com/v1'

function basicAuth(secretKey) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`
}

function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function rawBodyHash(rawBody) {
  return `sha256:${createHash('sha256').update(rawBody).digest('hex')}`
}

function statusForInvoice(status) {
  if (status === 'paid') return 'paid'
  if (['failed', 'refunded', 'canceled', 'expired', 'voided'].includes(status)) return 'failed'
  return 'pending'
}

async function readJson(response, operation) {
  let body
  try {
    body = await response.json()
  } catch {
    throw new Error(`${operation}_invalid_json`)
  }
  if (!response.ok) {
    throw new Error(`${operation}_http_${response.status}:${body?.message ?? body?.error ?? 'unknown'}`)
  }
  return body
}

export function createMoyasarSandboxAdapter({
  secretKey,
  webhookSecret,
  callbackUrl,
  successUrl,
  backUrl,
  fetchFn = globalThis.fetch,
  clock = () => new Date(),
} = {}) {
  if (!secretKey || !secretKey.startsWith('sk_test_')) throw new Error('moyasar_test_secret_key_required')
  if (!webhookSecret) throw new Error('moyasar_webhook_secret_required')
  if (typeof fetchFn !== 'function') throw new Error('fetch_required')

  const authHeaders = {
    Authorization: basicAuth(secretKey),
    Accept: 'application/json',
  }

  async function listByIdempotencyKey(idempotencyKey) {
    const url = `${API_BASE}/invoices?metadata%5Bidempotency_key%5D=${encodeURIComponent(idempotencyKey)}`
    const response = await fetchFn(url, { method: 'GET', headers: authHeaders })
    const body = await readJson(response, 'moyasar_list_invoices')
    return Array.isArray(body.invoices) ? body.invoices : []
  }

  function matchesRequest(invoice, request) {
    return invoice?.amount === request.amountMinor
      && invoice?.currency === request.currency
      && invoice?.metadata?.engagement_id === request.engagementId
      && invoice?.metadata?.organization_id === request.organizationId
      && invoice?.metadata?.idempotency_key === request.idempotencyKey
  }

  async function findReusableInvoice(request) {
    const invoices = await listByIdempotencyKey(request.idempotencyKey)
    if (invoices.length === 0) return null
    const matches = invoices.filter(invoice => matchesRequest(invoice, request))
    if (matches.length === 1) return matches[0]
    throw new Error(matches.length > 1 ? 'moyasar_invoice_duplicate_conflict' : 'moyasar_invoice_idempotency_conflict')
  }

  async function createInvoice(request) {
    const payload = {
      amount: request.amountMinor,
      currency: request.currency,
      description: request.description,
      metadata: {
        engagement_id: request.engagementId,
        organization_id: request.organizationId,
        idempotency_key: request.idempotencyKey,
        control_plane: 'nexus_b2b_v1',
      },
    }
    if (callbackUrl) payload.callback_url = callbackUrl
    if (successUrl) payload.success_url = successUrl
    if (backUrl) payload.back_url = backUrl

    const response = await fetchFn(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return readJson(response, 'moyasar_create_invoice')
  }

  async function createCheckout(request) {
    if (request.approvedRail !== 'b2b_web') throw new Error('moyasar_b2b_web_only')
    if (!request.idempotencyKey || !request.engagementId || !request.organizationId) throw new Error('invalid_checkout_request')
    if (!Number.isInteger(request.amountMinor) || request.amountMinor < 100) throw new Error('invalid_checkout_amount')
    if (request.currency !== 'SAR') throw new Error('moyasar_sandbox_currency_not_supported')

    let invoice = await findReusableInvoice(request)
    if (!invoice) {
      try {
        invoice = await createInvoice(request)
      } catch (error) {
        // Reconcile uncertain network/5xx outcomes by looking up the stable metadata key.
        invoice = await findReusableInvoice(request)
        if (!invoice) throw error
      }
    }

    if (!invoice?.id || !invoice?.url) throw new Error('moyasar_invoice_invalid_response')
    if (!matchesRequest(invoice, request)) throw new Error('moyasar_invoice_scope_mismatch')

    return {
      providerReference: invoice.id,
      checkoutUrl: invoice.url,
      status: statusForInvoice(invoice.status),
    }
  }

  async function fetchPayment(paymentId) {
    const response = await fetchFn(`${API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
      method: 'GET', headers: authHeaders,
    })
    return readJson(response, 'moyasar_fetch_payment')
  }

  async function fetchInvoice(invoiceId) {
    const response = await fetchFn(`${API_BASE}/invoices/${encodeURIComponent(invoiceId)}`, {
      method: 'GET', headers: authHeaders,
    })
    return readJson(response, 'moyasar_fetch_invoice')
  }

  async function verifyWebhook({ rawBody }) {
    if (typeof rawBody !== 'string') throw new Error('moyasar_raw_body_required')

    let event
    try {
      event = JSON.parse(rawBody)
    } catch {
      throw new Error('moyasar_webhook_invalid_json')
    }

    if (!safeEqual(event?.secret_token, webhookSecret)) throw new Error('moyasar_webhook_secret_mismatch')
    if (event?.live !== false) throw new Error('moyasar_live_webhook_rejected_in_sandbox')
    if (event?.type !== 'payment_paid') throw new Error('moyasar_webhook_event_not_settleable')
    if (!event?.id || !event?.created_at || !event?.data?.id || !event?.data?.invoice_id) {
      throw new Error('moyasar_webhook_missing_identity')
    }

    const [payment, invoice] = await Promise.all([
      fetchPayment(event.data.id),
      fetchInvoice(event.data.invoice_id),
    ])

    if (payment?.id !== event.data.id || payment?.invoice_id !== invoice?.id) throw new Error('moyasar_reconciliation_identity_mismatch')
    if (payment?.status !== 'paid' || invoice?.status !== 'paid') throw new Error('moyasar_reconciliation_not_paid')
    if (payment?.amount !== invoice?.amount || payment?.currency !== invoice?.currency) throw new Error('moyasar_reconciliation_amount_mismatch')

    const metadata = invoice?.metadata
    if (!metadata?.engagement_id || !metadata?.organization_id || !metadata?.idempotency_key) {
      throw new Error('moyasar_invoice_metadata_incomplete')
    }

    return {
      signatureVerified: true,
      verificationMethod: 'moyasar_shared_secret+server_reconciliation',
      providerEventId: event.id,
      providerEventType: event.type,
      verifiedAt: clock().toISOString(),
      rawBodyHash: rawBodyHash(rawBody),
      payment: {
        providerReference: invoice.id,
        engagementId: metadata.engagement_id,
        organizationId: metadata.organization_id,
        amountMinor: payment.amount,
        currency: payment.currency,
        status: 'paid',
        occurredAt: event.created_at,
        idempotencyKey: metadata.idempotency_key,
      },
    }
  }

  return {
    rail: 'b2b_web',
    provider: 'moyasar',
    environment: 'sandbox',
    createCheckout,
    verifyWebhook,
  }
}

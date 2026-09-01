import { NextRequest, NextResponse } from 'next/server'
import { getControlPlaneServerPersistence } from '@/lib/control-plane/server-persistence'
import { createMoyasarSandboxAdapter } from '@/lib/control-plane/moyasar-sandbox-adapter.mjs'
import { createPaymentSettlementService } from '@/lib/control-plane/payment-settlement-service.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`missing_${name.toLowerCase()}`)
  return value
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.CONTROL_PLANE_ENV !== 'development') {
      return NextResponse.json({ error: 'Not available.' }, { status: 404 })
    }

    const appUrl = requiredEnv('NEXT_PUBLIC_APP_URL').replace(/\/$/, '')
    const adapter = createMoyasarSandboxAdapter({
      secretKey: requiredEnv('MOYASAR_TEST_SECRET_KEY'),
      webhookSecret: requiredEnv('MOYASAR_WEBHOOK_SECRET'),
      callbackUrl: `${appUrl}/api/payments/moyasar/webhook`,
      successUrl: `${appUrl}/nexus/pilot-preview?payment=success`,
      backUrl: `${appUrl}/nexus/pilot-preview`,
    })

    // Preserve the exact raw body. Never call req.json() before provider verification.
    const rawBody = await req.text()
    if (!rawBody || rawBody.length > 256_000) {
      return NextResponse.json({ error: 'Invalid webhook body.' }, { status: 400 })
    }

    const persistence = getControlPlaneServerPersistence()
    const settlement = createPaymentSettlementService({ persistence, paymentPort: adapter })
    const result = await settlement.settleProviderWebhook({
      rawBody,
      signature: req.headers.get('x-moyasar-signature') ?? '',
    })

    if (!result.ok) {
      const clientFailure = [
        'webhook_verification_failed',
        'webhook_trust_failed',
        'payment_not_found',
        'verified_payment_scope_mismatch',
        'provider_reference_mismatch',
      ].includes(result.reason)
      return NextResponse.json(
        { ok: false, reason: result.reason },
        { status: clientFailure ? 400 : 503 },
      )
    }

    return NextResponse.json({
      ok: true,
      duplicate: result.duplicate,
      state: result.engagement?.state ?? null,
    })
  } catch (error) {
    console.error('[moyasar-webhook] controlled failure:', error)
    return NextResponse.json({ error: 'Webhook processing unavailable.' }, { status: 503 })
  }
}

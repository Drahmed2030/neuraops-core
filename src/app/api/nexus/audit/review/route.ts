import { NextRequest, NextResponse } from 'next/server'
import { requestNexusReview } from '@/lib/control-plane/nexus-audit-service.mjs'
import { getControlPlaneServerPersistence } from '@/lib/control-plane/server-persistence'
import { consumeRateLimit, requestIp } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  if (process.env.CONTROL_PLANE_ENV !== 'development') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const allowed = await consumeRateLimit(`nexus-review:${requestIp(req)}`, 5, 600)
  if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const payload = body as { engagementId?: unknown; auditRef?: unknown; contactRoute?: unknown }
  const engagementId = typeof payload.engagementId === 'string' ? payload.engagementId.trim() : ''
  const auditRef = typeof payload.auditRef === 'string' ? payload.auditRef.trim() : ''
  const contactRoute = payload.contactRoute === 'email' || payload.contactRoute === 'phone'
    ? payload.contactRoute
    : 'email'

  if (!uuidPattern.test(engagementId) || !auditRef.startsWith('nexus-audit:') || auditRef.length > 80) {
    return NextResponse.json({ error: 'invalid_audit_reference' }, { status: 400 })
  }

  let persistence
  try {
    persistence = getControlPlaneServerPersistence()
  } catch {
    return NextResponse.json({ error: 'control_plane_not_configured' }, { status: 503 })
  }

  const bundle = await persistence.loadEngagementBundle(engagementId)
  if (!bundle) return NextResponse.json({ error: 'audit_not_found' }, { status: 404 })

  const auditStarted = bundle.events.find(event =>
    event.type === 'AUDIT_STARTED' && event.payload?.sourceRef === auditRef
  )
  if (!auditStarted) {
    return NextResponse.json({ error: 'audit_reference_mismatch' }, { status: 403 })
  }

  const result = await requestNexusReview(persistence, {
    sourceRef: auditRef,
    organizationId: bundle.engagement.organizationId,
    engagementId,
    occurredAt: new Date().toISOString(),
    contactRoute,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? 'review_request_failed' }, { status: 409 })
  }

  return NextResponse.json({
    engagementId,
    state: 'REVIEW_REQUESTED',
    version: result.version,
    duplicate: result.duplicate,
  })
}

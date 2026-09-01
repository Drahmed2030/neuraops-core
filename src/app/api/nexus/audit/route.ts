import { createHash, randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { evaluateNexusAudit } from '@/lib/control-plane/nexus-audit-evaluator'
import { completeNexusAudit, startNexusAudit } from '@/lib/control-plane/nexus-audit-service.mjs'
import { getControlPlaneServerPersistence } from '@/lib/control-plane/server-persistence'
import { consumeRateLimit, requestIp } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sourceRefFromIdempotencyKey(key: string) {
  const digest = createHash('sha256').update(key).digest('hex').slice(0, 40)
  return `nexus-audit:${digest}`
}

function loadAuditPolicy(): unknown {
  const raw = process.env.NEXUS_AUDIT_POLICY_JSON
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  if (process.env.CONTROL_PLANE_ENV !== 'development') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const ip = requestIp(req)
  const allowed = await consumeRateLimit(`nexus-audit:${ip}`, 5, 600)
  if (!allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const idempotencyKey = req.headers.get('idempotency-key')?.trim()
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    return NextResponse.json({ error: 'idempotency_key_required' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const payload = body as { organizationName?: unknown; metrics?: unknown }
  const organizationName = typeof payload.organizationName === 'string' ? payload.organizationName.trim() : ''
  if (organizationName.length < 2 || organizationName.length > 160) {
    return NextResponse.json({ error: 'invalid_organization_name' }, { status: 400 })
  }

  const policy = loadAuditPolicy()
  if (!policy) {
    return NextResponse.json({ error: 'audit_policy_not_configured' }, { status: 503 })
  }

  const evaluation = evaluateNexusAudit(payload.metrics, policy)
  if (!evaluation.ok) {
    return NextResponse.json({ error: evaluation.reason, metric: evaluation.metric }, { status: 400 })
  }

  let persistence
  try {
    persistence = getControlPlaneServerPersistence()
  } catch {
    return NextResponse.json({ error: 'control_plane_not_configured' }, { status: 503 })
  }

  const sourceRef = sourceRefFromIdempotencyKey(idempotencyKey)
  const occurredAt = new Date().toISOString()
  const started = await startNexusAudit(persistence, {
    sourceRef,
    organizationId: randomUUID(),
    organizationName,
    engagementId: randomUUID(),
    occurredAt,
  })

  if (!started.ok || !started.engagementId || !started.organizationId) {
    return NextResponse.json({ error: started.reason ?? 'audit_start_failed' }, { status: 409 })
  }

  const completed = await completeNexusAudit(persistence, {
    sourceRef,
    organizationId: started.organizationId,
    engagementId: started.engagementId,
    occurredAt: new Date().toISOString(),
    result: evaluation.result,
    priorityGaps: evaluation.priorityGaps,
  })

  if (!completed.ok) {
    return NextResponse.json({
      error: completed.reason ?? 'audit_completion_failed',
      engagementId: started.engagementId,
      retryable: true,
    }, { status: 409 })
  }

  return NextResponse.json({
    engagementId: started.engagementId,
    auditRef: sourceRef,
    result: evaluation.result,
    priorityGaps: evaluation.priorityGaps,
    version: completed.version,
  })
}

import crypto from 'node:crypto'

const SECRET_KEYS = /authorization|cookie|token|password|secret|api[-_]?key|session|payload|prompt|message|body|email|phone/i

function redact(value) {
  if (Array.isArray(value)) return value.map(redact)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, SECRET_KEYS.test(key) ? '[REDACTED]' : redact(item)])
  )
}

export function classifyIncident(input = {}) {
  const status = Number(input.status || 0)
  const type = String(input.type || '').toLowerCase()
  const repeated = Number(input.occurrences || 1)

  if (type.includes('security') || type.includes('auth') || type.includes('payment')) return 'critical'
  if (status >= 500 || type.includes('provider_timeout') || type.includes('persistence')) return repeated >= 3 ? 'high' : 'medium'
  if (status === 429 || type.includes('rate_limit')) return 'medium'
  return 'low'
}

export function buildIncidentEnvelope(input = {}) {
  const occurredAt = input.occurredAt || new Date().toISOString()
  const fingerprintSource = [input.service, input.operation, input.type, input.status, input.errorCode].filter(Boolean).join('|')
  return {
    schemaVersion: 1,
    incidentId: input.incidentId || crypto.randomUUID(),
    fingerprint: crypto.createHash('sha256').update(fingerprintSource || 'unknown').digest('hex'),
    occurredAt,
    service: String(input.service || 'neuraops-core'),
    operation: String(input.operation || 'unknown'),
    type: String(input.type || 'unknown'),
    severity: classifyIncident(input),
    correlationId: input.correlationId || null,
    traceId: input.traceId || null,
    status: Number.isFinite(Number(input.status)) ? Number(input.status) : null,
    errorCode: input.errorCode ? String(input.errorCode) : null,
    occurrences: Math.max(1, Number(input.occurrences || 1)),
    context: redact(input.context || {}),
  }
}

export function remediationDisposition(incident) {
  const severity = incident?.severity || classifyIncident(incident)
  if (severity === 'critical') return { action: 'human-escalation', autoMerge: false, autoDeploy: false }
  if (severity === 'high') return { action: 'open-fix-pr', autoMerge: false, autoDeploy: false }
  if (severity === 'medium' && Number(incident?.occurrences || 1) >= 3) {
    return { action: 'open-fix-pr', autoMerge: false, autoDeploy: false }
  }
  return { action: 'observe', autoMerge: false, autoDeploy: false }
}

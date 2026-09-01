import { buildIncidentEnvelope, remediationDisposition } from './incidents.mjs'

function errorCode(error) {
  if (!error || typeof error !== 'object') return null
  return error.code || error.name || null
}

function classifyRuntimeType(error, fallbackType = 'runtime_failure') {
  const code = String(errorCode(error) || '').toLowerCase()
  const message = String(error?.message || '').toLowerCase()
  if (code.includes('timeout') || code === 'aborterror' || message.includes('timeout')) return 'provider_timeout'
  return fallbackType
}

export function captureRuntimeIncident(input = {}) {
  const incident = buildIncidentEnvelope({
    service: input.service || 'neuraops-core',
    operation: input.operation || 'unknown',
    type: input.type || classifyRuntimeType(input.error),
    status: input.status || 500,
    occurrences: input.occurrences || 1,
    correlationId: input.correlationId || null,
    errorCode: errorCode(input.error),
    context: {
      route: input.route || null,
      provider: input.provider || null,
      phase: input.phase || null,
      errorName: input.error?.name || null,
      ...input.context,
    },
  })

  return { incident, remediation: remediationDisposition(incident) }
}

export function emitRuntimeIncident(input = {}, logger = console) {
  const captured = captureRuntimeIncident(input)
  logger.error('NEURAOPS_INCIDENT', JSON.stringify(captured))
  return captured
}

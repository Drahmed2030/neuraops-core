import { RECOVERY_MATRIX, recoverySummary } from './recovery-matrix.mjs'

const RUNTIME_STATES = new Set(['HEALTHY', 'DEGRADED', 'INCIDENT', 'UNKNOWN'])
const TRUST_POSTURES = new Set(['HEALTHY', 'DEGRADED', 'ACTION_REQUIRED'])

function normalizeServiceStatus(item = {}) {
  const runtimeStatus = RUNTIME_STATES.has(item.runtimeStatus) ? item.runtimeStatus : 'UNKNOWN'
  return {
    service: String(item.service || 'unknown'),
    product: String(item.product || 'shared'),
    runtimeStatus,
    measuredAt: item.measuredAt || null,
    source: item.source || null,
    incidentRef: item.incidentRef || null,
    detailCode: item.detailCode || null,
  }
}

export function deriveRuntimeStatus(serviceStatuses = []) {
  if (!serviceStatuses.length) return 'UNKNOWN'
  if (serviceStatuses.some((item) => item.runtimeStatus === 'INCIDENT')) return 'INCIDENT'
  if (serviceStatuses.some((item) => item.runtimeStatus === 'DEGRADED')) return 'DEGRADED'
  if (serviceStatuses.every((item) => item.runtimeStatus === 'HEALTHY')) return 'HEALTHY'
  return 'UNKNOWN'
}

export function deriveTrustPosture({ recovery = recoverySummary(), openIncidents = [] } = {}) {
  if (openIncidents.some((incident) => incident.severity === 'critical' || incident.severity === 'high')) {
    return 'ACTION_REQUIRED'
  }
  if (recovery.tier0Gaps?.length > 0 || recovery.gaps > 0) return 'ACTION_REQUIRED'
  if (recovery.partial > 0 || openIncidents.length > 0) return 'DEGRADED'
  return 'HEALTHY'
}

export function createOperationsSnapshot(input = {}) {
  const services = (input.services || []).map(normalizeServiceStatus)
  const recovery = input.recovery || recoverySummary(RECOVERY_MATRIX)
  const openIncidents = Array.isArray(input.openIncidents) ? input.openIncidents.map((incident) => ({
    incidentRef: incident.incidentRef || null,
    severity: incident.severity || 'low',
    state: incident.state || 'open',
    service: incident.service || null,
  })) : []

  const runtimeStatus = deriveRuntimeStatus(services)
  const trustPosture = deriveTrustPosture({ recovery, openIncidents })

  if (!RUNTIME_STATES.has(runtimeStatus)) throw new TypeError('Invalid runtime status')
  if (!TRUST_POSTURES.has(trustPosture)) throw new TypeError('Invalid trust posture')

  return {
    schemaVersion: 1,
    generatedAt: input.generatedAt || new Date().toISOString(),
    mode: 'read-only',
    runtimeStatus,
    trustPosture,
    services,
    incidents: {
      openCount: openIncidents.length,
      items: openIncidents,
    },
    recovery,
    authority: {
      canMutateProduction: false,
      canMerge: false,
      canDeploy: false,
      canGrantEntitlement: false,
      canRotateCredentials: false,
    },
  }
}

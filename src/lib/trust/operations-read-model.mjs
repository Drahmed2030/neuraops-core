import { indexEvidenceRecords } from './evidence.mjs'
import { buildIncidentLineageProjection } from './incident-lineage.mjs'
import { RECOVERY_MATRIX, validateRecoveryMatrix } from './recovery-matrix.mjs'
import { hashRef, TRUST_EVENT_ENUMS, validateTrustEvent } from './trust-event.mjs'

function emptyCounts(values) {
  return Object.fromEntries(values.map((value) => [value, 0]))
}

function increment(counts, key) {
  counts[key] = (counts[key] || 0) + 1
}

function latestTimestamp(values) {
  if (values.length === 0) return null
  return values.reduce((latest, value) => (Date.parse(value) > Date.parse(latest) ? value : latest))
}

function assertGeneratedAt(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new TypeError('Invalid read model generatedAt')
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.freeze(value)
  Object.values(value).forEach(deepFreeze)
  return value
}

function evidenceMatchesProduct(objectiveProduct, evidenceProduct) {
  if (objectiveProduct === 'shared') return evidenceProduct === 'shared'
  return evidenceProduct === objectiveProduct || evidenceProduct === 'shared'
}

function trustProjection(events) {
  if (!Array.isArray(events)) throw new TypeError('Trust events must be an array')

  const byDomain = emptyCounts(TRUST_EVENT_ENUMS.domains)
  const byProduct = emptyCounts(TRUST_EVENT_ENUMS.products)
  const byEnvironment = emptyCounts(TRUST_EVENT_ENUMS.environments)
  const byClassification = emptyCounts(TRUST_EVENT_ENUMS.classifications)
  const eventIds = new Set()
  const eventIndex = new Map()

  for (const event of events) {
    validateTrustEvent(event)
    if (eventIds.has(event.eventId)) throw new TypeError(`Duplicate trust event: ${event.eventId}`)
    eventIds.add(event.eventId)
    eventIndex.set(hashRef(event.eventId), event)
    increment(byDomain, event.domain)
    increment(byProduct, event.context.product)
    increment(byEnvironment, event.context.environment)
    increment(byClassification, event.classification)
  }

  return {
    index: eventIndex,
    projection: {
      totalEvents: events.length,
      latestOccurredAt: latestTimestamp(events.map((event) => event.context.occurredAt)),
      byDomain,
      byProduct,
      byEnvironment,
      byClassification,
    },
  }
}

function evidenceProjection(evidenceRecords) {
  const index = indexEvidenceRecords(evidenceRecords)
  const byProduct = emptyCounts(TRUST_EVENT_ENUMS.products)
  const byClassification = emptyCounts(TRUST_EVENT_ENUMS.classifications)
  const byRetentionClass = Object.create(null)
  const byKind = Object.create(null)

  for (const record of index.values()) {
    increment(byProduct, record.product)
    increment(byClassification, record.classification)
    increment(byRetentionClass, record.retentionClass)
    increment(byKind, record.kind)
  }

  return {
    index,
    projection: {
      total: index.size,
      latestGeneratedAt: latestTimestamp([...index.values()].map((record) => record.generatedAt)),
      byProduct,
      byClassification,
      byRetentionClass,
      byKind,
    },
  }
}

function recoveryProjection(recoveryMatrix, evidenceIndex) {
  validateRecoveryMatrix(recoveryMatrix)

  let unresolvedEvidenceRefs = 0
  let crossProductEvidenceRefs = 0
  const verificationIssues = []

  const objectives = recoveryMatrix.map((objective) => {
    const evidenceRefs = [...new Set(objective.evidenceRefs)]
    const unresolved = evidenceRefs.filter((ref) => !evidenceIndex.has(ref))
    const scopeMismatch = evidenceRefs.filter((ref) => {
      const record = evidenceIndex.get(ref)
      return record && !evidenceMatchesProduct(objective.product, record.product)
    })
    const resolved = evidenceRefs.length - unresolved.length - scopeMismatch.length
    const evidenceBacked = evidenceRefs.length > 0 && unresolved.length === 0 && scopeMismatch.length === 0
    const verified = objective.objectiveStatus === 'verified' && objective.readiness === 'verified' && evidenceBacked

    unresolvedEvidenceRefs += unresolved.length
    crossProductEvidenceRefs += scopeMismatch.length

    if (objective.readiness === 'verified' && !verified) {
      verificationIssues.push({
        service: objective.service,
        reason: unresolved.length > 0 ? 'unresolved-evidence' : 'product-scope-mismatch',
      })
    }

    return {
      service: objective.service,
      product: objective.product,
      tier: objective.tier,
      rtoMinutes: objective.rtoMinutes,
      rpoMinutes: objective.rpoMinutes,
      degradedMode: objective.degradedMode,
      dependencies: [...objective.dependencies],
      readiness: verified ? 'verified' : objective.readiness === 'verified' ? 'partial' : objective.readiness,
      objectiveStatus: verified ? 'verified' : 'target',
      declaredReadiness: objective.readiness,
      declaredObjectiveStatus: objective.objectiveStatus,
      evidence: {
        referenced: evidenceRefs.length,
        resolved,
        unresolved: unresolved.length,
        scopeMismatch: scopeMismatch.length,
      },
      recoveryOwner: objective.recoveryOwner,
      restoreDrillCadenceDays: objective.restoreDrillCadenceDays,
    }
  })

  return {
    summary: {
      total: objectives.length,
      verified: objectives.filter((item) => item.readiness === 'verified').length,
      partial: objectives.filter((item) => item.readiness === 'partial').length,
      gaps: objectives.filter((item) => item.readiness === 'gap').length,
      tier0Gaps: objectives.filter((item) => item.tier === 0 && item.readiness === 'gap').map((item) => item.service),
      unresolvedEvidenceRefs,
      crossProductEvidenceRefs,
    },
    verificationIssues,
    objectives,
  }
}

export function buildOperationsReadModel({
  events = [],
  evidenceRecords = [],
  lineageRecords = [],
  recoveryMatrix = RECOVERY_MATRIX,
  generatedAt = new Date().toISOString(),
} = {}) {
  assertGeneratedAt(generatedAt)
  const trust = trustProjection(events)
  const evidence = evidenceProjection(evidenceRecords)
  const incidentLineage = buildIncidentLineageProjection(lineageRecords, evidence.index, trust.index)
  const recovery = recoveryProjection(recoveryMatrix, evidence.index)

  return deepFreeze({
    schemaVersion: 1,
    generatedAt,
    mode: 'read-only',
    privacy: {
      rawPayloadsIncluded: false,
      eventAttributesIncluded: false,
      directIdentifiersIncluded: false,
      clinicalDataIncluded: false,
    },
    trust: trust.projection,
    evidence: evidence.projection,
    incidentLineage,
    recovery,
  })
}

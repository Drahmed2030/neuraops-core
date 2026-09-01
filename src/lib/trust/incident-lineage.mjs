import crypto from 'node:crypto'
import { hashRef, TRUST_EVENT_ENUMS } from './trust-event.mjs'

const PHASES = new Set(['detected', 'triaged', 'contained', 'recovered', 'verified'])
const OUTCOMES = new Set(['observed', 'degraded', 'restored', 'verified', 'unresolved'])
const PROJECTED_PHASES = [...PHASES, 'verification-pending']
const SAFE_LABEL = /^[a-z0-9][a-z0-9._:/-]*$/i
const SHA256_REF = /^[a-f0-9]{64}$/
const MAX_EVIDENCE_REFS = 20

const PRODUCTS = new Set(TRUST_EVENT_ENUMS.products)
const ENVIRONMENTS = new Set(TRUST_EVENT_ENUMS.environments)
const CLASSIFICATIONS = new Set(TRUST_EVENT_ENUMS.classifications)
const ALLOWED_FIELDS = new Set([
  'schemaVersion',
  'lineageRef',
  'incidentRef',
  'predecessorRef',
  'eventRef',
  'evidenceRefs',
  'phase',
  'outcome',
  'sequence',
  'occurredAt',
  'source',
  'product',
  'environment',
  'classification',
])

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function assertAllowedFields(record) {
  for (const key of Object.keys(record)) {
    if (!ALLOWED_FIELDS.has(key)) throw new TypeError(`Unsupported incident lineage field: ${key}`)
  }
}

function assertSafeLabel(name, value, maxLength) {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length > maxLength
    || !SAFE_LABEL.test(value)
  ) {
    throw new TypeError(`Invalid incident lineage ${name}`)
  }
}

function assertIsoTimestamp(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new TypeError('Invalid incident lineage occurredAt')
  }
}

function opaqueRef(value, { required = false, fallback = null } = {}) {
  const candidate = value || fallback
  if (candidate === null || candidate === undefined || candidate === '') {
    if (required) throw new TypeError('Incident lineage reference is required')
    return null
  }
  if (typeof candidate !== 'string' || candidate.length > 512) {
    throw new TypeError('Invalid incident lineage reference')
  }
  return SHA256_REF.test(candidate) ? candidate : hashRef(candidate)
}

function validateEvidenceRefs(value) {
  if (!Array.isArray(value) || value.length > MAX_EVIDENCE_REFS) {
    throw new TypeError('Invalid incident lineage evidenceRefs')
  }
  for (const ref of value) assertSafeLabel('evidenceRef', ref, 160)
  if (new Set(value).size !== value.length) {
    throw new TypeError('Duplicate incident lineage evidence reference')
  }
}

function referenceMatchesProduct(lineageProduct, referencedProduct) {
  if (lineageProduct === 'shared') return referencedProduct === 'shared'
  return referencedProduct === lineageProduct || referencedProduct === 'shared'
}

function emptyCounts(values) {
  return Object.fromEntries(values.map((value) => [value, 0]))
}

function latestTimestamp(values) {
  if (values.length === 0) return null
  return values.reduce((latest, value) => (Date.parse(value) > Date.parse(latest) ? value : latest))
}

export function validateIncidentLineageRecord(record) {
  if (!isPlainObject(record)) throw new TypeError('Incident lineage record must be an object')
  assertAllowedFields(record)
  if (record.schemaVersion !== 1) throw new TypeError('Invalid incident lineage schemaVersion')
  if (!SHA256_REF.test(record.lineageRef)) throw new TypeError('Incident lineage lineageRef must be opaque')
  if (!SHA256_REF.test(record.incidentRef)) throw new TypeError('Incident lineage incidentRef must be opaque')
  if (record.predecessorRef !== null && !SHA256_REF.test(record.predecessorRef)) {
    throw new TypeError('Incident lineage predecessorRef must be opaque')
  }
  if (record.eventRef !== null && !SHA256_REF.test(record.eventRef)) {
    throw new TypeError('Incident lineage eventRef must be opaque')
  }

  validateEvidenceRefs(record.evidenceRefs)
  if (!PHASES.has(record.phase)) throw new TypeError(`Invalid incident lineage phase: ${String(record.phase)}`)
  if (!OUTCOMES.has(record.outcome)) throw new TypeError(`Invalid incident lineage outcome: ${String(record.outcome)}`)
  if (!Number.isInteger(record.sequence) || record.sequence < 1 || record.sequence > 1000) {
    throw new TypeError('Invalid incident lineage sequence')
  }
  assertIsoTimestamp(record.occurredAt)
  assertSafeLabel('source', record.source, 160)

  if (!PRODUCTS.has(record.product)) throw new TypeError(`Invalid incident lineage product: ${String(record.product)}`)
  if (!ENVIRONMENTS.has(record.environment)) {
    throw new TypeError(`Invalid incident lineage environment: ${String(record.environment)}`)
  }
  if (!CLASSIFICATIONS.has(record.classification)) {
    throw new TypeError(`Invalid incident lineage classification: ${String(record.classification)}`)
  }

  const declaresVerification = record.phase === 'verified' || record.outcome === 'verified'
  if (declaresVerification && (record.phase !== 'verified' || record.outcome !== 'verified')) {
    throw new TypeError('Verified incident lineage phase and outcome must agree')
  }
  if (declaresVerification && record.evidenceRefs.length === 0) {
    throw new TypeError('Verified incident lineage records require evidence')
  }
  return true
}

export function createIncidentLineageRecord(input = {}) {
  if (!isPlainObject(input)) throw new TypeError('Incident lineage input must be an object')
  assertAllowedFields(input)
  if (input.schemaVersion !== undefined && input.schemaVersion !== 1) {
    throw new TypeError('Invalid incident lineage schemaVersion')
  }

  const record = {
    schemaVersion: 1,
    lineageRef: opaqueRef(input.lineageRef, {
      required: true,
      fallback: `lineage:${crypto.randomUUID()}`,
    }),
    incidentRef: opaqueRef(input.incidentRef, { required: true }),
    predecessorRef: opaqueRef(input.predecessorRef),
    eventRef: opaqueRef(input.eventRef),
    evidenceRefs: Object.freeze([...(input.evidenceRefs || [])]),
    phase: input.phase,
    outcome: input.outcome,
    sequence: input.sequence,
    occurredAt: input.occurredAt || new Date().toISOString(),
    source: input.source,
    product: input.product,
    environment: input.environment,
    classification: input.classification,
  }

  validateIncidentLineageRecord(record)
  return Object.freeze(record)
}

export function indexIncidentLineageRecords(records = []) {
  if (!Array.isArray(records)) throw new TypeError('Incident lineage records must be an array')
  const index = new Map()

  for (const record of records) {
    validateIncidentLineageRecord(record)
    if (index.has(record.lineageRef)) {
      throw new TypeError(`Duplicate incident lineage record: ${record.lineageRef}`)
    }
    index.set(record.lineageRef, record)
  }
  return index
}

export function buildIncidentLineageProjection(records = [], evidenceIndex = new Map(), eventIndex = new Map()) {
  if (!(evidenceIndex instanceof Map) || !(eventIndex instanceof Map)) {
    throw new TypeError('Incident lineage indexes must be maps')
  }

  const recordIndex = indexIncidentLineageRecords(records)
  const byProduct = emptyCounts(TRUST_EVENT_ENUMS.products)
  const byPhase = emptyCounts(PROJECTED_PHASES)
  const incidentGroups = new Map()

  for (const record of recordIndex.values()) {
    const group = incidentGroups.get(record.incidentRef) || []
    group.push(record)
    incidentGroups.set(record.incidentRef, group)
  }

  let unresolvedPredecessorRefs = 0
  let crossScopePredecessorRefs = 0
  let unresolvedEventRefs = 0
  let crossProductEventRefs = 0
  let unresolvedEvidenceRefs = 0
  let crossProductEvidenceRefs = 0
  const verificationIssues = []

  const replays = [...incidentGroups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([incidentRef, group]) => {
      const recordsBySequence = [...group].sort((a, b) => (
        a.sequence - b.sequence
        || Date.parse(a.occurredAt) - Date.parse(b.occurredAt)
        || a.lineageRef.localeCompare(b.lineageRef)
      ))
      const first = recordsBySequence[0]

      if (recordsBySequence.some((record) => (
        record.product !== first.product || record.environment !== first.environment
      ))) {
        throw new TypeError('Incident lineage scope boundary violation')
      }
      if (new Set(recordsBySequence.map((record) => record.sequence)).size !== recordsBySequence.length) {
        throw new TypeError('Duplicate incident lineage sequence')
      }

      let timelineReferencedEvidence = 0
      let timelineResolvedEvidence = 0
      let timelineUnresolvedEvidence = 0
      let timelineScopeMismatchEvidence = 0
      let chainComplete = true

      const steps = recordsBySequence.map((record, index) => {
        const previous = recordsBySequence[index - 1] || null
        const sequenceContinuous = record.sequence === index + 1
        let predecessorStatus = 'root'

        if (index === 0) {
          if (record.predecessorRef !== null || !sequenceContinuous) {
            const predecessor = record.predecessorRef
              ? recordIndex.get(record.predecessorRef)
              : null
            const crossesScope = predecessor && (
              predecessor.incidentRef !== record.incidentRef
              || predecessor.product !== record.product
              || predecessor.environment !== record.environment
            )
            predecessorStatus = crossesScope ? 'scope-mismatch' : 'unresolved'
            if (crossesScope) crossScopePredecessorRefs += 1
            else unresolvedPredecessorRefs += 1
            chainComplete = false
          }
        } else if (!sequenceContinuous || record.predecessorRef !== previous.lineageRef) {
          const predecessor = record.predecessorRef
            ? recordIndex.get(record.predecessorRef)
            : null
          const crossesScope = predecessor && (
            predecessor.incidentRef !== record.incidentRef
            || predecessor.product !== record.product
            || predecessor.environment !== record.environment
          )
          predecessorStatus = crossesScope ? 'scope-mismatch' : 'unresolved'
          if (crossesScope) crossScopePredecessorRefs += 1
          else unresolvedPredecessorRefs += 1
          chainComplete = false
        } else {
          predecessorStatus = 'linked'
        }

        let eventStatus = 'not-referenced'
        if (record.eventRef) {
          const event = eventIndex.get(record.eventRef)
          if (!event) {
            eventStatus = 'unresolved'
            unresolvedEventRefs += 1
          } else if (
            !referenceMatchesProduct(record.product, event.context.product)
            || record.environment !== event.context.environment
          ) {
            eventStatus = 'scope-mismatch'
            crossProductEventRefs += 1
          } else {
            eventStatus = 'resolved'
          }
        }

        const unresolved = record.evidenceRefs.filter((ref) => !evidenceIndex.has(ref))
        const scopeMismatch = record.evidenceRefs.filter((ref) => {
          const evidence = evidenceIndex.get(ref)
          return evidence && (
            !referenceMatchesProduct(record.product, evidence.product)
            || record.environment !== evidence.environment
          )
        })
        const resolved = record.evidenceRefs.length - unresolved.length - scopeMismatch.length
        const evidenceBacked = record.evidenceRefs.length > 0
          && unresolved.length === 0
          && scopeMismatch.length === 0
        const declaresVerification = record.phase === 'verified' && record.outcome === 'verified'
        const verified = declaresVerification && evidenceBacked
        const phase = declaresVerification && !verified ? 'verification-pending' : record.phase
        const outcome = declaresVerification && !verified ? 'unresolved' : record.outcome

        timelineReferencedEvidence += record.evidenceRefs.length
        timelineResolvedEvidence += resolved
        timelineUnresolvedEvidence += unresolved.length
        timelineScopeMismatchEvidence += scopeMismatch.length
        unresolvedEvidenceRefs += unresolved.length
        crossProductEvidenceRefs += scopeMismatch.length
        incrementCount(byProduct, record.product)
        incrementCount(byPhase, phase)

        if (declaresVerification && !verified) {
          verificationIssues.push({
            lineageRef: record.lineageRef,
            reason: unresolved.length > 0 ? 'unresolved-evidence' : 'product-scope-mismatch',
          })
        }

        return {
          lineageRef: record.lineageRef,
          sequence: record.sequence,
          phase,
          outcome,
          declaredPhase: record.phase,
          declaredOutcome: record.outcome,
          occurredAt: record.occurredAt,
          source: record.source,
          product: record.product,
          environment: record.environment,
          classification: record.classification,
          predecessor: predecessorStatus,
          event: eventStatus,
          evidence: {
            referenced: record.evidenceRefs.length,
            resolved,
            unresolved: unresolved.length,
            scopeMismatch: scopeMismatch.length,
          },
        }
      })

      const terminal = steps.at(-1)
      const terminalComplete = terminal?.phase === 'recovered' || terminal?.phase === 'verified'
      const referencesComplete = steps.every((step) => (
        !['unresolved', 'scope-mismatch'].includes(step.event)
        && step.evidence.unresolved === 0
        && step.evidence.scopeMismatch === 0
      ))
      const status = chainComplete && terminalComplete && referencesComplete ? 'complete' : 'partial'
      const verificationStatus = status === 'complete' && terminal?.phase === 'verified'
        ? 'verified'
        : 'unverified'

      return {
        incidentRef,
        product: first.product,
        environment: first.environment,
        startedAt: recordsBySequence[0].occurredAt,
        latestOccurredAt: latestTimestamp(recordsBySequence.map((record) => record.occurredAt)),
        status,
        verificationStatus,
        evidence: {
          referenced: timelineReferencedEvidence,
          resolved: timelineResolvedEvidence,
          unresolved: timelineUnresolvedEvidence,
          scopeMismatch: timelineScopeMismatchEvidence,
        },
        steps,
      }
    })

  return {
    replayMode: 'metadata-only',
    executionAllowed: false,
    summary: {
      totalIncidents: replays.length,
      totalSteps: recordIndex.size,
      completeReplays: replays.filter((replay) => replay.status === 'complete').length,
      verifiedReplays: replays.filter((replay) => replay.verificationStatus === 'verified').length,
      partialReplays: replays.filter((replay) => replay.status === 'partial').length,
      latestOccurredAt: latestTimestamp([...recordIndex.values()].map((record) => record.occurredAt)),
      unresolvedPredecessorRefs,
      crossScopePredecessorRefs,
      unresolvedEventRefs,
      crossProductEventRefs,
      unresolvedEvidenceRefs,
      crossProductEvidenceRefs,
    },
    byProduct,
    byPhase,
    verificationIssues,
    replays,
  }
}

function incrementCount(counts, key) {
  counts[key] = (counts[key] || 0) + 1
}

export const INCIDENT_LINEAGE_ENUMS = Object.freeze({
  phases: Object.freeze([...PHASES]),
  outcomes: Object.freeze([...OUTCOMES]),
  projectedPhases: Object.freeze([...PROJECTED_PHASES]),
})

import crypto from 'node:crypto'
import { validateRecoveryMatrix } from './recovery-matrix.mjs'
import { hashRef, TRUST_EVENT_ENUMS } from './trust-event.mjs'

const DRILL_STATES = ['planned', 'running', 'completed', 'cancelled']
const DRILL_OUTCOMES = ['not-assessed', 'passed', 'partial', 'failed']
const EXERCISE_TYPES = ['restore', 'failover', 'redeploy', 'access-recovery', 'dependency-outage']
const OBJECTIVE_DRILL_STATUSES = [
  'not-run',
  'scheduled',
  'verified',
  'overdue',
  'verification-pending',
  'needs-remediation',
]
const SHA256 = /^[a-f0-9]{64}$/
const SAFE_LABEL = /^[a-z0-9][a-z0-9._:/-]*$/i
const ALLOWED_FIELDS = new Set([
  'schemaVersion',
  'drillRef',
  'service',
  'objectiveVersion',
  'exerciseType',
  'state',
  'outcome',
  'startedAt',
  'completedAt',
  'achievedRtoMinutes',
  'achievedRpoMinutes',
  'evidenceRefs',
  'approvalRef',
  'source',
  'product',
  'environment',
  'classification',
])

const STATES = new Set(DRILL_STATES)
const OUTCOMES = new Set(DRILL_OUTCOMES)
const TYPES = new Set(EXERCISE_TYPES)
const PRODUCTS = new Set(TRUST_EVENT_ENUMS.products)
const ENVIRONMENTS = new Set(TRUST_EVENT_ENUMS.environments)
const CLASSIFICATIONS = new Set(TRUST_EVENT_ENUMS.classifications)

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function assertAllowedFields(record) {
  for (const key of Object.keys(record)) {
    if (!ALLOWED_FIELDS.has(key)) throw new TypeError(`Unsupported recovery drill field: ${key}`)
  }
}

function assertSafeLabel(name, value, maxLength = 160) {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length > maxLength
    || !SAFE_LABEL.test(value)
  ) {
    throw new TypeError(`Invalid recovery drill ${name}`)
  }
}

function assertTimestamp(name, value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`Invalid recovery drill ${name}`)
  }
}

function assertNullableMinutes(name, value) {
  if (value !== null && (!Number.isInteger(value) || value < 0)) {
    throw new TypeError(`Invalid recovery drill ${name}`)
  }
}

function opaqueRef(name, value, { required = false } = {}) {
  if (value === null || value === undefined || value === '') {
    if (required) throw new TypeError(`Recovery drill ${name} is required`)
    return null
  }
  if (typeof value !== 'string' || value.length > 200) {
    throw new TypeError(`Invalid recovery drill ${name}`)
  }
  return SHA256.test(value) ? value : hashRef(value)
}

function normalizeEvidenceRefs(value) {
  if (!Array.isArray(value) || value.length > 20) {
    throw new TypeError('Invalid recovery drill evidenceRefs')
  }
  value.forEach((ref) => assertSafeLabel('evidence reference', ref))
  if (new Set(value).size !== value.length) {
    throw new TypeError('Duplicate recovery drill evidence reference')
  }
  return Object.freeze([...value])
}

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

function evidenceMatchesProduct(product, evidenceProduct) {
  if (product === 'shared') return evidenceProduct === 'shared'
  return evidenceProduct === product || evidenceProduct === 'shared'
}

function addDays(value, days) {
  return new Date(Date.parse(value) + days * 86_400_000).toISOString()
}

function drillRiskRank(drill) {
  if (drill.verificationStatus === 'verified') return 0
  if (drill.verificationStatus === 'verification-pending') return 1
  return 2
}

export function validateRecoveryDrillRecord(record) {
  if (!isPlainObject(record)) throw new TypeError('Recovery drill record must be an object')
  assertAllowedFields(record)
  if (record.schemaVersion !== 1) throw new TypeError('Invalid recovery drill schemaVersion')
  if (!SHA256.test(record.drillRef)) throw new TypeError('Recovery drill drillRef must be opaque')
  assertSafeLabel('service', record.service)
  assertSafeLabel('objectiveVersion', record.objectiveVersion, 80)
  assertSafeLabel('source', record.source)

  if (!TYPES.has(record.exerciseType)) {
    throw new TypeError(`Invalid recovery drill exerciseType: ${String(record.exerciseType)}`)
  }
  if (!STATES.has(record.state)) {
    throw new TypeError(`Invalid recovery drill state: ${String(record.state)}`)
  }
  if (!OUTCOMES.has(record.outcome)) {
    throw new TypeError(`Invalid recovery drill outcome: ${String(record.outcome)}`)
  }
  if (!PRODUCTS.has(record.product)) {
    throw new TypeError(`Invalid recovery drill product: ${String(record.product)}`)
  }
  if (!ENVIRONMENTS.has(record.environment)) {
    throw new TypeError(`Invalid recovery drill environment: ${String(record.environment)}`)
  }
  if (!CLASSIFICATIONS.has(record.classification)) {
    throw new TypeError(`Invalid recovery drill classification: ${String(record.classification)}`)
  }

  assertTimestamp('startedAt', record.startedAt)
  if (record.completedAt !== null) assertTimestamp('completedAt', record.completedAt)
  if (record.completedAt !== null && Date.parse(record.completedAt) < Date.parse(record.startedAt)) {
    throw new TypeError('Recovery drill completedAt cannot precede startedAt')
  }
  assertNullableMinutes('achievedRtoMinutes', record.achievedRtoMinutes)
  assertNullableMinutes('achievedRpoMinutes', record.achievedRpoMinutes)
  normalizeEvidenceRefs(record.evidenceRefs)
  if (record.approvalRef !== null && !SHA256.test(record.approvalRef)) {
    throw new TypeError('Recovery drill approvalRef must be opaque')
  }

  const completed = record.state === 'completed'
  const cancelled = record.state === 'cancelled'
  if (completed) {
    if (record.completedAt === null) throw new TypeError('Completed recovery drills require completedAt')
    if (record.outcome === 'not-assessed') throw new TypeError('Completed recovery drills require an assessed outcome')
    if (record.achievedRtoMinutes === null || record.achievedRpoMinutes === null) {
      throw new TypeError('Completed recovery drills require achieved RTO and RPO')
    }
    if (record.evidenceRefs.length === 0) {
      throw new TypeError('Completed recovery drills require evidence')
    }
    if (record.outcome === 'passed' && record.approvalRef === null) {
      throw new TypeError('Passed recovery drills require opaque approval')
    }
  } else {
    if (!cancelled && record.completedAt !== null) {
      throw new TypeError('Incomplete recovery drills cannot declare completedAt')
    }
    if (record.outcome !== 'not-assessed') {
      throw new TypeError('Incomplete recovery drills cannot declare an assessed outcome')
    }
    if (record.achievedRtoMinutes !== null || record.achievedRpoMinutes !== null) {
      throw new TypeError('Incomplete recovery drills cannot declare achieved RTO or RPO')
    }
    if (record.approvalRef !== null) {
      throw new TypeError('Incomplete recovery drills cannot declare approval')
    }
  }
  if (cancelled && record.completedAt === null) {
    throw new TypeError('Cancelled recovery drills require completedAt')
  }
  return true
}

export function createRecoveryDrillRecord(input = {}) {
  if (!isPlainObject(input)) throw new TypeError('Recovery drill input must be an object')
  assertAllowedFields(input)
  if (input.schemaVersion !== undefined && input.schemaVersion !== 1) {
    throw new TypeError('Invalid recovery drill schemaVersion')
  }

  const record = {
    schemaVersion: 1,
    drillRef: opaqueRef('drillRef', input.drillRef || `recovery-drill:${crypto.randomUUID()}`, { required: true }),
    service: input.service,
    objectiveVersion: input.objectiveVersion || 'v1',
    exerciseType: input.exerciseType,
    state: input.state || 'planned',
    outcome: input.outcome || 'not-assessed',
    startedAt: input.startedAt || new Date().toISOString(),
    completedAt: input.completedAt || null,
    achievedRtoMinutes: input.achievedRtoMinutes ?? null,
    achievedRpoMinutes: input.achievedRpoMinutes ?? null,
    evidenceRefs: normalizeEvidenceRefs(input.evidenceRefs || []),
    approvalRef: opaqueRef('approvalRef', input.approvalRef),
    source: input.source,
    product: input.product,
    environment: input.environment,
    classification: input.classification,
  }

  validateRecoveryDrillRecord(record)
  return Object.freeze(record)
}

export function buildRecoveryDrillProjection(
  records = [],
  recoveryMatrix = [],
  evidenceIndex = new Map(),
  generatedAt = new Date().toISOString(),
) {
  if (!Array.isArray(records)) throw new TypeError('Recovery drill records must be an array')
  if (!(evidenceIndex instanceof Map)) throw new TypeError('Recovery drill evidence index must be a Map')
  assertTimestamp('generatedAt', generatedAt)
  validateRecoveryMatrix(recoveryMatrix)

  const objectiveIndex = new Map(recoveryMatrix.map((objective) => [objective.service, objective]))
  const seen = new Set()
  const byProduct = emptyCounts(TRUST_EVENT_ENUMS.products)
  const byExerciseType = emptyCounts(EXERCISE_TYPES)
  const byState = emptyCounts(DRILL_STATES)
  const byOutcome = emptyCounts(DRILL_OUTCOMES)
  const verificationIssues = []
  let unresolvedEvidenceRefs = 0
  let invalidEvidenceRefs = 0
  let crossProductEvidenceRefs = 0
  let crossEnvironmentEvidenceRefs = 0

  const drills = records.map((record) => {
    validateRecoveryDrillRecord(record)
    if (seen.has(record.drillRef)) throw new TypeError(`Duplicate recovery drill record: ${record.drillRef}`)
    seen.add(record.drillRef)

    const objective = objectiveIndex.get(record.service)
    if (!objective) throw new TypeError(`Unknown recovery drill service: ${record.service}`)
    if (objective.product !== record.product) {
      throw new TypeError(`Recovery drill product boundary violation: ${record.service}`)
    }
    if (record.completedAt !== null && Date.parse(record.completedAt) > Date.parse(generatedAt)) {
      throw new TypeError('Recovery drill completion cannot be after generatedAt')
    }

    increment(byProduct, record.product)
    increment(byExerciseType, record.exerciseType)
    increment(byState, record.state)
    increment(byOutcome, record.outcome)

    const evidenceCounts = {
      resolved: 0,
      unresolved: 0,
      invalid: 0,
      crossProduct: 0,
      crossEnvironment: 0,
    }
    for (const ref of record.evidenceRefs) {
      const evidence = evidenceIndex.get(ref)
      if (!evidence) {
        evidenceCounts.unresolved += 1
      } else if (
        evidence.kind !== 'recovery-drill'
        || evidence.retentionClass !== 'audit'
        || Date.parse(evidence.generatedAt) < Date.parse(record.startedAt)
        || Date.parse(evidence.generatedAt) > Date.parse(generatedAt)
      ) {
        evidenceCounts.invalid += 1
      } else if (!evidenceMatchesProduct(record.product, evidence.product)) {
        evidenceCounts.crossProduct += 1
      } else if (evidence.environment !== record.environment) {
        evidenceCounts.crossEnvironment += 1
      } else {
        evidenceCounts.resolved += 1
      }
    }
    const evidenceBacked = record.evidenceRefs.length > 0
      && evidenceCounts.resolved === record.evidenceRefs.length
    const declaresSuccess = record.state === 'completed' && record.outcome === 'passed'
    const objectiveMet = declaresSuccess
      && record.achievedRtoMinutes <= objective.rtoMinutes
      && record.achievedRpoMinutes <= objective.rpoMinutes
    const verified = declaresSuccess && objectiveMet && evidenceBacked && record.approvalRef !== null

    unresolvedEvidenceRefs += evidenceCounts.unresolved
    invalidEvidenceRefs += evidenceCounts.invalid
    crossProductEvidenceRefs += evidenceCounts.crossProduct
    crossEnvironmentEvidenceRefs += evidenceCounts.crossEnvironment

    if (declaresSuccess && !verified) {
      const reason = evidenceCounts.unresolved > 0
        ? 'unresolved-evidence'
        : evidenceCounts.invalid > 0
          ? 'invalid-evidence-contract'
          : evidenceCounts.crossProduct > 0
            ? 'product-scope-mismatch'
            : evidenceCounts.crossEnvironment > 0
              ? 'environment-scope-mismatch'
              : 'objective-missed'
      verificationIssues.push({ drillRef: record.drillRef, service: record.service, reason })
    }

    return {
      drillRef: record.drillRef,
      service: record.service,
      objectiveVersion: record.objectiveVersion,
      exerciseType: record.exerciseType,
      state: record.state,
      outcome: record.outcome,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      achievedRtoMinutes: record.achievedRtoMinutes,
      achievedRpoMinutes: record.achievedRpoMinutes,
      source: record.source,
      product: record.product,
      environment: record.environment,
      classification: record.classification,
      approvalPresent: record.approvalRef !== null,
      objectiveResult: record.state !== 'completed' ? 'not-assessed' : objectiveMet ? 'met' : 'missed',
      verificationStatus: !declaresSuccess
        ? 'not-applicable'
        : verified
          ? 'verified'
          : objectiveMet
            ? 'verification-pending'
            : 'unverified',
      evidence: {
        referenced: record.evidenceRefs.length,
        resolved: evidenceCounts.resolved,
        unresolved: evidenceCounts.unresolved,
        invalid: evidenceCounts.invalid,
        scopeMismatch: evidenceCounts.crossProduct + evidenceCounts.crossEnvironment,
      },
    }
  }).sort((a, b) => {
    const aTime = Date.parse(a.completedAt || a.startedAt)
    const bTime = Date.parse(b.completedAt || b.startedAt)
    return bTime - aTime || a.drillRef.localeCompare(b.drillRef)
  })

  const objectiveDrills = recoveryMatrix.map((objective) => {
    const serviceDrills = drills.filter((drill) => drill.service === objective.service)
    const completed = serviceDrills
      .filter((drill) => drill.state === 'completed')
      .sort((a, b) => {
        const timeDifference = Date.parse(b.completedAt) - Date.parse(a.completedAt)
        return timeDifference || drillRiskRank(b) - drillRiskRank(a) || a.drillRef.localeCompare(b.drillRef)
      })
    const verified = completed.filter((drill) => drill.verificationStatus === 'verified')
    const latestCompletedAt = latestTimestamp(completed.map((drill) => drill.completedAt))
    const latestVerifiedAt = latestTimestamp(verified.map((drill) => drill.completedAt))
    const latestCompleted = completed[0] || null
    const nextDueAt = latestVerifiedAt === null
      ? null
      : addDays(latestVerifiedAt, objective.restoreDrillCadenceDays)

    let status = 'not-run'
    if (completed.length === 0 && serviceDrills.length > 0) {
      status = 'scheduled'
    } else if (latestCompleted?.verificationStatus === 'verified') {
      status = Date.parse(generatedAt) > Date.parse(nextDueAt) ? 'overdue' : 'verified'
    } else if (latestCompleted?.outcome === 'passed' && latestCompleted.objectiveResult === 'met') {
      status = 'verification-pending'
    } else if (latestCompleted) {
      status = 'needs-remediation'
    }

    return {
      service: objective.service,
      product: objective.product,
      cadenceDays: objective.restoreDrillCadenceDays,
      status,
      totalDrills: serviceDrills.length,
      completedDrills: completed.length,
      verifiedDrills: verified.length,
      lastCompletedAt: latestCompletedAt,
      lastVerifiedAt: latestVerifiedAt,
      nextDueAt,
    }
  })

  const objectiveStatusCounts = emptyCounts(OBJECTIVE_DRILL_STATUSES)
  objectiveDrills.forEach((objective) => increment(objectiveStatusCounts, objective.status))

  return {
    drillMode: 'evidence-records-only',
    executionAllowed: false,
    persistenceEnabled: false,
    summary: {
      totalDrills: drills.length,
      completedDrills: drills.filter((drill) => drill.state === 'completed').length,
      declaredPassedDrills: drills.filter((drill) => drill.outcome === 'passed').length,
      verifiedDrills: drills.filter((drill) => drill.verificationStatus === 'verified').length,
      verificationPendingDrills: drills.filter((drill) => drill.verificationStatus === 'verification-pending').length,
      objectiveMissedDrills: drills.filter((drill) => drill.verificationStatus === 'unverified').length,
      failedOrPartialDrills: drills.filter((drill) => ['failed', 'partial'].includes(drill.outcome)).length,
      latestCompletedAt: latestTimestamp(
        drills.filter((drill) => drill.completedAt !== null).map((drill) => drill.completedAt),
      ),
      unresolvedEvidenceRefs,
      invalidEvidenceRefs,
      crossProductEvidenceRefs,
      crossEnvironmentEvidenceRefs,
      objectivesVerified: objectiveStatusCounts.verified,
      objectivesOverdue: objectiveStatusCounts.overdue,
      objectivesVerificationPending: objectiveStatusCounts['verification-pending'],
      objectivesNeedingRemediation: objectiveStatusCounts['needs-remediation'],
      objectivesScheduled: objectiveStatusCounts.scheduled,
      objectivesNotRun: objectiveStatusCounts['not-run'],
    },
    byProduct,
    byExerciseType,
    byState,
    byOutcome,
    verificationIssues,
    objectives: objectiveDrills,
    drills,
  }
}

export const RECOVERY_DRILL_ENUMS = Object.freeze({
  states: Object.freeze([...DRILL_STATES]),
  outcomes: Object.freeze([...DRILL_OUTCOMES]),
  exerciseTypes: Object.freeze([...EXERCISE_TYPES]),
  objectiveStatuses: Object.freeze([...OBJECTIVE_DRILL_STATUSES]),
})

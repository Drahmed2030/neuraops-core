import crypto from 'node:crypto'
import { hashRef, TRUST_EVENT_ENUMS } from './trust-event.mjs'

const RETENTION_CLASSES = new Set(['ephemeral', 'operational', 'audit', 'regulated'])
const SHA256 = /^[a-f0-9]{64}$/
const SAFE_LABEL = /^[a-z0-9][a-z0-9._:/-]*$/i
const ALLOWED_FIELDS = new Set([
  'schemaVersion',
  'evidenceId',
  'kind',
  'source',
  'product',
  'environment',
  'integritySha256',
  'classification',
  'retentionClass',
  'generatedAt',
  'locationRef',
])

const PRODUCTS = new Set(TRUST_EVENT_ENUMS.products)
const ENVIRONMENTS = new Set(TRUST_EVENT_ENUMS.environments)
const CLASSIFICATIONS = new Set(TRUST_EVENT_ENUMS.classifications)

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function assertAllowedFields(record) {
  for (const key of Object.keys(record)) {
    if (!ALLOWED_FIELDS.has(key)) throw new TypeError(`Unsupported evidence field: ${key}`)
  }
}

function assertSafeLabel(name, value, maxLength) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maxLength ||
    !SAFE_LABEL.test(value)
  ) {
    throw new TypeError(`Invalid evidence ${name}`)
  }
}

function assertIsoTimestamp(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new TypeError('Invalid evidence generatedAt')
  }
}

function opaqueLocationRef(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') throw new TypeError('Invalid evidence locationRef')
  return SHA256.test(value) ? value : hashRef(value)
}

export function validateEvidenceRecord(record) {
  if (!isPlainObject(record)) throw new TypeError('Evidence record must be an object')
  assertAllowedFields(record)
  if (record.schemaVersion !== 1) throw new TypeError('Invalid evidence schemaVersion')
  assertSafeLabel('evidenceId', record.evidenceId, 160)
  assertSafeLabel('kind', record.kind, 120)
  assertSafeLabel('source', record.source, 160)

  if (!PRODUCTS.has(record.product)) throw new TypeError(`Invalid evidence product: ${String(record.product)}`)
  if (!ENVIRONMENTS.has(record.environment)) {
    throw new TypeError(`Invalid evidence environment: ${String(record.environment)}`)
  }
  if (!CLASSIFICATIONS.has(record.classification)) {
    throw new TypeError(`Invalid evidence classification: ${String(record.classification)}`)
  }
  if (!RETENTION_CLASSES.has(record.retentionClass)) {
    throw new TypeError(`Invalid evidence retentionClass: ${String(record.retentionClass)}`)
  }
  if (typeof record.integritySha256 !== 'string' || !SHA256.test(record.integritySha256)) {
    throw new TypeError('Invalid evidence integritySha256')
  }
  if (record.locationRef !== null && !SHA256.test(record.locationRef)) {
    throw new TypeError('Evidence locationRef must be opaque')
  }
  assertIsoTimestamp(record.generatedAt)
  return true
}

export function createEvidenceRecord(input = {}) {
  if (!isPlainObject(input)) throw new TypeError('Evidence input must be an object')
  assertAllowedFields(input)
  if (input.schemaVersion !== undefined && input.schemaVersion !== 1) {
    throw new TypeError('Invalid evidence schemaVersion')
  }

  const record = {
    schemaVersion: 1,
    evidenceId: input.evidenceId || `evidence:${crypto.randomUUID()}`,
    kind: input.kind,
    source: input.source,
    product: input.product,
    environment: input.environment,
    integritySha256: String(input.integritySha256 || '').toLowerCase(),
    classification: input.classification,
    retentionClass: input.retentionClass,
    generatedAt: input.generatedAt || new Date().toISOString(),
    locationRef: opaqueLocationRef(input.locationRef),
  }

  validateEvidenceRecord(record)
  return Object.freeze(record)
}

export function indexEvidenceRecords(records = []) {
  if (!Array.isArray(records)) throw new TypeError('Evidence records must be an array')
  const index = new Map()

  for (const record of records) {
    validateEvidenceRecord(record)
    if (index.has(record.evidenceId)) {
      throw new TypeError(`Duplicate evidence record: ${record.evidenceId}`)
    }
    index.set(record.evidenceId, record)
  }

  return index
}

export const EVIDENCE_ENUMS = Object.freeze({
  retentionClasses: Object.freeze([...RETENTION_CLASSES]),
})

import crypto from 'node:crypto'

const TRUST_DOMAINS = new Set([
  'identity',
  'policy',
  'evidence',
  'observability',
  'incident',
  'entitlement',
  'recovery',
])

const CLASSIFICATIONS = new Set([
  'public',
  'internal',
  'account',
  'sensitive',
  'clinical-restricted',
])

const PRODUCTS = new Set(['neuraops', 'cliniverse', 'shared'])
const ENVIRONMENTS = new Set(['development', 'preview', 'production'])

const REDACT_KEYS = /authorization|cookie|token|password|secret|api[-_]?key|session|payload|prompt|message|body|email|phone|patient|diagnosis|clinical[_-]?note|note[_-]?text/i
const SHA256_REF = /^[a-f0-9]{64}$/

function assertAllowed(name, value, allowed) {
  if (!allowed.has(value)) throw new TypeError(`Invalid ${name}: ${String(value)}`)
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function assertOptionalText(name, value, maxLength = 256) {
  if (value === null || value === undefined) return
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    throw new TypeError(`Invalid ${name}`)
  }
}

function assertIsoTimestamp(name, value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`Invalid ${name}`)
  }
}

function assertSanitized(value) {
  if (Array.isArray(value)) {
    value.forEach(assertSanitized)
    return
  }
  if (!isPlainObject(value)) return

  for (const [key, item] of Object.entries(value)) {
    if (REDACT_KEYS.test(key) && item !== '[REDACTED]') {
      throw new TypeError(`Unsanitized trust attribute: ${key}`)
    }
    if (!REDACT_KEYS.test(key)) assertSanitized(item)
  }
}

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      REDACT_KEYS.test(key) ? '[REDACTED]' : sanitize(item),
    ])
  )
}

export function hashRef(value) {
  if (value === null || value === undefined || value === '') return null
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

export function validateTrustEvent(event) {
  if (!isPlainObject(event)) throw new TypeError('Trust event must be an object')
  if (event.schemaVersion !== 1) throw new TypeError('Invalid trust event schemaVersion')
  assertOptionalText('eventId', event.eventId, 160)
  assertAllowed('domain', event.domain, TRUST_DOMAINS)
  assertOptionalText('eventType', event.eventType, 120)
  assertOptionalText('source', event.source, 160)
  assertAllowed('classification', event.classification, CLASSIFICATIONS)

  if (event.subjectRef !== null && event.subjectRef !== undefined && !SHA256_REF.test(event.subjectRef)) {
    throw new TypeError('Invalid trust event subjectRef')
  }

  if (!isPlainObject(event.context)) throw new TypeError('Invalid trust event context')
  assertOptionalText('correlationId', event.context.correlationId)
  assertOptionalText('traceId', event.context.traceId)
  assertAllowed('product', event.context.product, PRODUCTS)
  assertAllowed('environment', event.context.environment, ENVIRONMENTS)
  assertIsoTimestamp('occurredAt', event.context.occurredAt)

  if (!isPlainObject(event.attributes)) throw new TypeError('Invalid trust event attributes')
  assertSanitized(event.attributes)
  return true
}

export function createTrustEvent(input = {}) {
  const domain = String(input.domain || '')
  const classification = String(input.classification || '')
  const product = String(input.product || '')
  const environment = String(input.environment || '')
  const eventType = String(input.eventType || '').trim()
  const source = String(input.source || '').trim()

  assertAllowed('domain', domain, TRUST_DOMAINS)
  assertAllowed('classification', classification, CLASSIFICATIONS)
  assertAllowed('product', product, PRODUCTS)
  assertAllowed('environment', environment, ENVIRONMENTS)

  if (!eventType || eventType.length > 120) throw new TypeError('Invalid eventType')
  if (!source || source.length > 160) throw new TypeError('Invalid source')

  const event = {
    schemaVersion: 1,
    eventId: input.eventId || crypto.randomUUID(),
    domain,
    eventType,
    source,
    subjectRef: input.subjectRef ? hashRef(input.subjectRef) : null,
    classification,
    context: {
      correlationId: input.correlationId || null,
      traceId: input.traceId || null,
      product,
      environment,
      occurredAt: input.occurredAt || new Date().toISOString(),
    },
    attributes: sanitize(input.attributes || {}),
  }

  validateTrustEvent(event)
  return event
}

export const TRUST_EVENT_ENUMS = Object.freeze({
  domains: Object.freeze([...TRUST_DOMAINS]),
  classifications: Object.freeze([...CLASSIFICATIONS]),
  products: Object.freeze([...PRODUCTS]),
  environments: Object.freeze([...ENVIRONMENTS]),
})

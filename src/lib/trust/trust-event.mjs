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

function assertAllowed(name, value, allowed) {
  if (!allowed.has(value)) throw new TypeError(`Invalid ${name}: ${String(value)}`)
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

  return {
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
}

export const TRUST_EVENT_ENUMS = Object.freeze({
  domains: Object.freeze([...TRUST_DOMAINS]),
  classifications: Object.freeze([...CLASSIFICATIONS]),
  products: Object.freeze([...PRODUCTS]),
  environments: Object.freeze([...ENVIRONMENTS]),
})

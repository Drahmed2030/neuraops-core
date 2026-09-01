import test from 'node:test'
import assert from 'node:assert/strict'
import { createTrustEvent, hashRef } from '../src/lib/trust/trust-event.mjs'

test('trust event constructs a provider-independent event envelope', () => {
  const event = createTrustEvent({
    eventId: 'evt-1',
    occurredAt: '2026-09-01T18:30:00.000Z',
    domain: 'observability',
    eventType: 'service.health.updated',
    source: 'neuraops-core',
    product: 'neuraops',
    environment: 'preview',
    classification: 'internal',
    subjectRef: 'service:leadops',
    correlationId: 'corr-1',
    attributes: { provider: 'example-provider', state: 'healthy', count: 3 },
  })

  assert.equal(event.schemaVersion, 1)
  assert.equal(event.domain, 'observability')
  assert.equal(event.context.product, 'neuraops')
  assert.equal(event.context.environment, 'preview')
  assert.equal(event.attributes.provider, 'example-provider')
  assert.match(event.subjectRef, /^[a-f0-9]{64}$/)
})

test('hashRef is deterministic and does not expose raw identifiers', () => {
  const a = hashRef('user-123')
  const b = hashRef('user-123')
  assert.equal(a, b)
  assert.notEqual(a, 'user-123')
  assert.match(a, /^[a-f0-9]{64}$/)
})

test('trust event rejects unknown domains and execution context values', () => {
  const base = {
    eventType: 'x', source: 'test', classification: 'internal',
    product: 'neuraops', environment: 'preview',
  }
  assert.throws(() => createTrustEvent({ ...base, domain: 'billing' }), /Invalid domain/)
  assert.throws(() => createTrustEvent({ ...base, domain: 'policy', product: 'unknown' }), /Invalid product/)
  assert.throws(() => createTrustEvent({ ...base, domain: 'policy', environment: 'staging' }), /Invalid environment/)
  assert.throws(() => createTrustEvent({ ...base, domain: 'policy', classification: 'phi' }), /Invalid classification/)
})

test('trust event redacts credentials, PII and raw clinical text recursively', () => {
  const event = createTrustEvent({
    domain: 'evidence',
    eventType: 'evidence.created',
    source: 'cliniverse-adapter',
    product: 'cliniverse',
    environment: 'preview',
    classification: 'clinical-restricted',
    attributes: {
      provider: 'apple',
      authorization: 'Bearer secret',
      email: 'person@example.com',
      patient: 'Jane Doe',
      diagnosis: 'raw diagnosis',
      nested: {
        token: 'secret-token',
        clinical_note: 'raw clinical narrative',
        note_text: 'another clinical narrative',
        version: 2,
      },
    },
  })

  assert.equal(event.attributes.authorization, '[REDACTED]')
  assert.equal(event.attributes.email, '[REDACTED]')
  assert.equal(event.attributes.patient, '[REDACTED]')
  assert.equal(event.attributes.diagnosis, '[REDACTED]')
  assert.equal(event.attributes.nested.token, '[REDACTED]')
  assert.equal(event.attributes.nested.clinical_note, '[REDACTED]')
  assert.equal(event.attributes.nested.note_text, '[REDACTED]')
  assert.equal(event.attributes.nested.version, 2)
  assert.doesNotMatch(JSON.stringify(event), /Jane Doe|raw diagnosis|raw clinical narrative|person@example\.com|secret-token/)
})

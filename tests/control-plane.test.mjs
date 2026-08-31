import test from 'node:test'
import assert from 'node:assert/strict'
import { appendEvent, eventsForEngagement, latestEvent } from '../src/lib/control-plane/event-ledger.mjs'
import { grantEntitlement, hasEntitlement, revokeEntitlement } from '../src/lib/control-plane/entitlements.mjs'
import { applyLifecycleEvent } from '../src/lib/control-plane/lifecycle.mjs'
import { paymentReceivedEvent, validateVerifiedPayment } from '../src/lib/control-plane/payment-policy.mjs'
import { allowedEvents, canTransition, transitionEngagement } from '../src/lib/control-plane/state-machine.mjs'

test('pilot lifecycle requires payment confirmation, entitlement, and explicit start', () => {
  assert.deepEqual(transitionEngagement('PAYMENT_PENDING', 'PAYMENT_RECEIVED'), {
    ok: true,
    from: 'PAYMENT_PENDING',
    to: 'PAYMENT_CONFIRMED',
    event: 'PAYMENT_RECEIVED',
  })
  assert.equal(canTransition('PAYMENT_CONFIRMED', 'PILOT_STARTED'), false)
  assert.equal(transitionEngagement('PAYMENT_CONFIRMED', 'ENTITLEMENT_GRANTED').to, 'PILOT_READY')
  assert.equal(transitionEngagement('PILOT_READY', 'PILOT_STARTED').to, 'PILOT_ACTIVE')
})

test('invalid lifecycle jumps are rejected', () => {
  assert.deepEqual(transitionEngagement('AUDIT_COMPLETED', 'PILOT_STARTED'), {
    ok: false,
    from: 'AUDIT_COMPLETED',
    event: 'PILOT_STARTED',
    reason: 'transition_not_allowed',
  })
  assert.deepEqual(allowedEvents('AUDIT_COMPLETED'), ['REVIEW_REQUESTED'])
})

test('event ledger is idempotent by eventId and ordered by occurredAt', () => {
  const e1 = { eventId: 'evt-1', type: 'AUDIT_STARTED', occurredAt: '2026-09-01T00:00:00Z', organizationId: 'org-1', engagementId: 'eng-1', actor: { type: 'system' }, payload: {} }
  const e2 = { eventId: 'evt-2', type: 'AUDIT_COMPLETED', occurredAt: '2026-09-01T00:05:00Z', organizationId: 'org-1', engagementId: 'eng-1', actor: { type: 'system' }, payload: {} }

  const first = appendEvent([], e2)
  const second = appendEvent(first.events, e1)
  const duplicate = appendEvent(second.events, e1)

  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  assert.equal(duplicate.created, false)
  assert.equal(duplicate.events.length, 2)
  assert.deepEqual(eventsForEngagement(duplicate.events, 'eng-1').map(event => event.eventId), ['evt-1', 'evt-2'])
  assert.equal(latestEvent(duplicate.events, 'AUDIT_COMPLETED', 'eng-1').eventId, 'evt-2')
})

test('same eventId with different content is rejected', () => {
  const original = { eventId: 'evt-1', type: 'AUDIT_STARTED', occurredAt: '2026-09-01T00:00:00Z', organizationId: 'org-1', engagementId: 'eng-1', actor: { type: 'system' }, payload: {} }
  const conflicting = { ...original, type: 'AUDIT_COMPLETED' }
  const first = appendEvent([], original)
  const second = appendEvent(first.events, conflicting)

  assert.equal(second.ok, false)
  assert.equal(second.reason, 'event_id_conflict')
})

test('entitlement grants are idempotent and revocation removes access', () => {
  const grant = {
    organizationId: 'org-1',
    key: 'nexus.pilot_workspace',
    status: 'active',
    source: 'payment',
    startsAt: '2026-09-01T00:00:00Z',
  }

  const first = grantEntitlement([], grant)
  const duplicate = grantEntitlement(first.grants, grant)

  assert.equal(first.created, true)
  assert.equal(duplicate.created, false)
  assert.equal(duplicate.grants.length, 1)
  assert.equal(hasEntitlement(duplicate.grants, 'org-1', 'nexus.pilot_workspace', '2026-09-02T00:00:00Z'), true)

  const revoked = revokeEntitlement(duplicate.grants, 'org-1', 'nexus.pilot_workspace')
  assert.equal(revoked.changed, true)
  assert.equal(hasEntitlement(revoked.grants, 'org-1', 'nexus.pilot_workspace', '2026-09-02T00:00:00Z'), false)
})

test('lifecycle orchestration scopes events and requires entitlement data before pilot readiness', () => {
  const engagement = { engagementId: 'eng-1', organizationId: 'org-1', state: 'PAYMENT_CONFIRMED' }
  const event = { eventId: 'evt-ent-1', type: 'ENTITLEMENT_GRANTED', occurredAt: '2026-09-01T00:10:00Z', organizationId: 'org-1', engagementId: 'eng-1', actor: { type: 'system' }, payload: {} }

  const missingGrant = applyLifecycleEvent({ engagement, events: [], grants: [], event })
  assert.equal(missingGrant.ok, false)
  assert.equal(missingGrant.reason, 'entitlement_grant_required')

  const grant = { organizationId: 'org-1', key: 'nexus.pilot_workspace', status: 'active', source: 'payment', startsAt: '2026-09-01T00:10:00Z' }
  const applied = applyLifecycleEvent({ engagement, events: [], grants: [], event, entitlementGrant: grant })
  assert.equal(applied.ok, true)
  assert.equal(applied.engagement.state, 'PILOT_READY')
  assert.equal(applied.events.length, 1)
  assert.equal(applied.grants.length, 1)

  const wrongScope = applyLifecycleEvent({
    engagement,
    events: [],
    grants: [],
    event: { ...event, eventId: 'evt-ent-2', organizationId: 'org-2' },
    entitlementGrant: grant,
  })
  assert.equal(wrongScope.ok, false)
  assert.equal(wrongScope.reason, 'event_scope_mismatch')
})

test('lifecycle retry with exact same event is a successful no-op', () => {
  const engagement = { engagementId: 'eng-1', organizationId: 'org-1', state: 'AUDIT_STARTED' }
  const event = { eventId: 'evt-audit-1', type: 'AUDIT_COMPLETED', occurredAt: '2026-09-01T00:05:00Z', organizationId: 'org-1', engagementId: 'eng-1', actor: { type: 'system' }, payload: { score: 81 } }

  const first = applyLifecycleEvent({ engagement, events: [], grants: [], event })
  assert.equal(first.ok, true)
  assert.equal(first.engagement.state, 'AUDIT_COMPLETED')

  const retry = applyLifecycleEvent({ engagement: first.engagement, events: first.events, grants: first.grants, event })
  assert.equal(retry.ok, true)
  assert.equal(retry.duplicate, true)
  assert.equal(retry.eventCreated, false)
  assert.equal(retry.engagement.state, 'AUDIT_COMPLETED')
  assert.equal(retry.events.length, 1)
})

test('lifecycle retry rejects eventId reuse with conflicting payload', () => {
  const engagement = { engagementId: 'eng-1', organizationId: 'org-1', state: 'AUDIT_STARTED' }
  const event = { eventId: 'evt-audit-1', type: 'AUDIT_COMPLETED', occurredAt: '2026-09-01T00:05:00Z', organizationId: 'org-1', engagementId: 'eng-1', actor: { type: 'system' }, payload: { score: 81 } }
  const first = applyLifecycleEvent({ engagement, events: [], grants: [], event })
  const conflicting = { ...event, payload: { score: 42 } }

  const retry = applyLifecycleEvent({ engagement: first.engagement, events: first.events, grants: first.grants, event: conflicting })
  assert.equal(retry.ok, false)
  assert.equal(retry.reason, 'event_id_conflict')
})

test('verified payment must match expected organization, engagement, amount and currency', () => {
  const expected = {
    paymentId: 'pay-1', organizationId: 'org-1', engagementId: 'eng-1', provider: 'web_gateway', amountMinor: 250000, currency: 'SAR', status: 'pending', createdAt: '2026-09-01T00:00:00Z',
  }
  const verified = {
    providerReference: 'gw-123', organizationId: 'org-1', engagementId: 'eng-1', amountMinor: 250000, currency: 'SAR', status: 'paid', occurredAt: '2026-09-01T00:20:00Z', idempotencyKey: 'idem-1',
  }

  assert.deepEqual(validateVerifiedPayment(expected, verified), { ok: true })
  assert.equal(validateVerifiedPayment(expected, { ...verified, amountMinor: 249900 }).reason, 'amount_mismatch')
  assert.equal(validateVerifiedPayment(expected, { ...verified, currency: 'USD' }).reason, 'currency_mismatch')
  assert.equal(validateVerifiedPayment(expected, { ...verified, organizationId: 'org-2' }).reason, 'payment_scope_mismatch')
})

test('validated payment produces deterministic PAYMENT_RECEIVED event', () => {
  const expected = {
    paymentId: 'pay-1', organizationId: 'org-1', engagementId: 'eng-1', provider: 'web_gateway', amountMinor: 250000, currency: 'SAR', status: 'pending', createdAt: '2026-09-01T00:00:00Z',
  }
  const verified = {
    providerReference: 'gw-123', organizationId: 'org-1', engagementId: 'eng-1', amountMinor: 250000, currency: 'SAR', status: 'paid', occurredAt: '2026-09-01T00:20:00Z', idempotencyKey: 'idem-1',
  }
  const result = paymentReceivedEvent(expected, verified)

  assert.equal(result.ok, true)
  assert.equal(result.event.eventId, 'payment:gw-123:paid')
  assert.equal(result.event.type, 'PAYMENT_RECEIVED')
  assert.equal(result.event.payload.amountMinor, 250000)
})

test('invalid events and entitlements are rejected', () => {
  assert.deepEqual(appendEvent([], { eventId: 'evt-x' }), { ok: false, reason: 'invalid_event' })
  assert.deepEqual(grantEntitlement([], { organizationId: 'org-1' }), { ok: false, reason: 'invalid_entitlement' })
})

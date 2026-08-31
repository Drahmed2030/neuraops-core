import test from 'node:test'
import assert from 'node:assert/strict'
import { appendEvent, eventsForEngagement, latestEvent } from '../src/lib/control-plane/event-ledger.mjs'
import { grantEntitlement, hasEntitlement, revokeEntitlement } from '../src/lib/control-plane/entitlements.mjs'
import { allowedEvents, canTransition, transitionEngagement } from '../src/lib/control-plane/state-machine.mjs'

test('pilot lifecycle requires payment confirmation, entitlement, and explicit start', () => {
  assert.deepEqual(transitionEngagement('PAYMENT_PENDING', 'PAYMENT_RECEIVED'), {
    ok: true,
    from: 'PAYMENT_PENDING',
    to: 'PAYMENT_CONFIRMED',
    event: 'PAYMENT_RECEIVED',
  })
  assert.equal(canTransition('PAYMENT_CONFIRMED', 'PILOT_STARTED'), false)
  assert.deepEqual(transitionEngagement('PAYMENT_CONFIRMED', 'ENTITLEMENT_GRANTED').to, 'PILOT_READY')
  assert.deepEqual(transitionEngagement('PILOT_READY', 'PILOT_STARTED').to, 'PILOT_ACTIVE')
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

test('invalid events and entitlements are rejected', () => {
  assert.deepEqual(appendEvent([], { eventId: 'evt-x' }), { ok: false, reason: 'invalid_event' })
  assert.deepEqual(grantEntitlement([], { organizationId: 'org-1' }), { ok: false, reason: 'invalid_entitlement' })
})

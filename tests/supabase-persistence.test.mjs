import test from 'node:test'
import assert from 'node:assert/strict'
import { createSupabaseControlPlanePersistence } from '../src/lib/control-plane/supabase-persistence.mjs'

function bundle(state = 'AUDIT_STARTED', version = 0, events = [], payments = []) {
  return {
    engagement: {
      engagementId: '11111111-1111-1111-1111-111111111111',
      organizationId: '22222222-2222-2222-2222-222222222222',
      product: 'nexus',
      kind: 'nexus_lifecycle',
      state,
    },
    events,
    entitlements: [],
    payments,
    version,
  }
}

function auditEvent(overrides = {}) {
  return {
    eventId: 'evt-audit-1',
    type: 'AUDIT_COMPLETED',
    occurredAt: '2026-09-01T02:00:00Z',
    organizationId: '22222222-2222-2222-2222-222222222222',
    engagementId: '11111111-1111-1111-1111-111111111111',
    actor: { type: 'system' },
    payload: { score: 81 },
    ...overrides,
  }
}

function paymentEvent() {
  return {
    eventId: 'payment:pay-1:requested',
    type: 'PAYMENT_REQUESTED',
    occurredAt: '2026-09-01T02:10:00Z',
    organizationId: '22222222-2222-2222-2222-222222222222',
    engagementId: '11111111-1111-1111-1111-111111111111',
    actor: { type: 'system' },
    payload: { paymentId: 'pay-1', amountMinor: 250000, currency: 'SAR' },
  }
}

function paymentRecord() {
  return {
    paymentId: 'pay-1',
    organizationId: '22222222-2222-2222-2222-222222222222',
    engagementId: '11111111-1111-1111-1111-111111111111',
    provider: 'web_gateway',
    amountMinor: 250000,
    currency: 'SAR',
    status: 'pending',
    idempotencyKey: 'pilot-pay-1',
    createdAt: '2026-09-01T02:10:00Z',
  }
}

function fakeSupabase({
  loaded = bundle(),
  commitData = { ok: true, version: 1, duplicate: false },
  commitError = null,
  intentData = { ok: true, version: 7, duplicate: false, payment: paymentRecord() },
  intentError = null,
} = {}) {
  const calls = []
  return {
    calls,
    async rpc(name, args) {
      calls.push({ name, args })
      if (name === 'control_plane_load_engagement_bundle') {
        return { data: loaded, error: null }
      }
      if (name === 'control_plane_commit_lifecycle') {
        return { data: commitData, error: commitError }
      }
      if (name === 'control_plane_create_payment_intent') {
        return { data: intentData, error: intentError }
      }
      return { data: null, error: { message: 'unknown_rpc' } }
    },
  }
}

test('Supabase adapter loads engagement bundle through the restricted RPC', async () => {
  const supabase = fakeSupabase()
  const adapter = createSupabaseControlPlanePersistence(supabase)
  const result = await adapter.loadEngagementBundle('11111111-1111-1111-1111-111111111111')

  assert.equal(result.version, 0)
  assert.deepEqual(supabase.calls, [{
    name: 'control_plane_load_engagement_bundle',
    args: { p_engagement_id: '11111111-1111-1111-1111-111111111111' },
  }])
})

test('Supabase adapter validates domain transition before atomic commit RPC', async () => {
  const supabase = fakeSupabase()
  const adapter = createSupabaseControlPlanePersistence(supabase)
  const current = await adapter.loadEngagementBundle('11111111-1111-1111-1111-111111111111')

  const result = await adapter.commitLifecycle({
    engagement: current.engagement,
    event: auditEvent(),
    expectedVersion: current.version,
  })

  assert.deepEqual(result, { ok: true, version: 1, duplicate: false })
  assert.equal(supabase.calls.length, 3)
  assert.equal(supabase.calls[2].name, 'control_plane_commit_lifecycle')
  assert.equal(supabase.calls[2].args.p_next_state, 'AUDIT_COMPLETED')
  assert.equal(supabase.calls[2].args.p_expected_version, 0)
})

test('exact duplicate is accepted before commit RPC and does not write again', async () => {
  const event = auditEvent()
  const supabase = fakeSupabase({ loaded: bundle('AUDIT_COMPLETED', 1, [event]) })
  const adapter = createSupabaseControlPlanePersistence(supabase)

  const result = await adapter.commitLifecycle({
    engagement: bundle('AUDIT_COMPLETED', 1, [event]).engagement,
    event,
    expectedVersion: 0,
  })

  assert.deepEqual(result, { ok: true, version: 1, duplicate: true })
  assert.equal(supabase.calls.length, 1)
})

test('invalid domain transition never reaches commit RPC', async () => {
  const supabase = fakeSupabase({ loaded: bundle('AUDIT_COMPLETED', 1) })
  const adapter = createSupabaseControlPlanePersistence(supabase)

  const result = await adapter.commitLifecycle({
    engagement: bundle('AUDIT_COMPLETED', 1).engagement,
    event: auditEvent({ eventId: 'evt-invalid', type: 'PILOT_STARTED' }),
    expectedVersion: 1,
  })

  assert.equal(result.ok, false)
  assert.equal(result.domainReason, 'transition_not_allowed')
  assert.equal(supabase.calls.length, 1)
})

test('version conflict from RPC preserves current version', async () => {
  const supabase = fakeSupabase({
    commitData: { ok: false, reason: 'version_conflict', currentVersion: 4 },
  })
  const adapter = createSupabaseControlPlanePersistence(supabase)

  const result = await adapter.commitLifecycle({
    engagement: bundle().engagement,
    event: auditEvent(),
    expectedVersion: 0,
  })

  assert.deepEqual(result, { ok: false, reason: 'version_conflict', currentVersion: 4 })
})

test('conflicting event id returned by RPC is surfaced as persistence domain failure', async () => {
  const supabase = fakeSupabase({
    commitData: { ok: false, reason: 'event_id_conflict' },
  })
  const adapter = createSupabaseControlPlanePersistence(supabase)

  const result = await adapter.commitLifecycle({
    engagement: bundle().engagement,
    event: auditEvent(),
    expectedVersion: 0,
  })

  assert.deepEqual(result, {
    ok: false,
    reason: 'persistence_failed',
    domainReason: 'event_id_conflict',
  })
})

test('Supabase adapter sends validated payment intent to atomic RPC', async () => {
  const loaded = bundle('PILOT_PROPOSED', 6)
  const supabase = fakeSupabase({ loaded })
  const adapter = createSupabaseControlPlanePersistence(supabase)

  const result = await adapter.createPaymentIntent({
    engagement: loaded.engagement,
    event: paymentEvent(),
    payment: paymentRecord(),
    expectedVersion: 6,
  })

  assert.equal(result.ok, true)
  assert.equal(result.version, 7)
  const call = supabase.calls.at(-1)
  assert.equal(call.name, 'control_plane_create_payment_intent')
  assert.equal(call.args.p_next_state, 'PAYMENT_PENDING')
  assert.equal(call.args.p_expected_version, 6)
  assert.equal(call.args.p_payment.paymentId, 'pay-1')
})

test('payment intent conflict from RPC is surfaced safely', async () => {
  const loaded = bundle('PILOT_PROPOSED', 6)
  const supabase = fakeSupabase({
    loaded,
    intentData: { ok: false, reason: 'payment_intent_conflict' },
  })
  const adapter = createSupabaseControlPlanePersistence(supabase)

  const result = await adapter.createPaymentIntent({
    engagement: loaded.engagement,
    event: paymentEvent(),
    payment: paymentRecord(),
    expectedVersion: 6,
  })

  assert.deepEqual(result, {
    ok: false,
    reason: 'persistence_failed',
    domainReason: 'payment_intent_conflict',
  })
})

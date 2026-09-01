import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  evaluateOperationsAccess,
  parseOperatorUserIds,
} from '../src/lib/trust/operations-access.mjs'
import {
  buildOperationsApiResponse,
  OPERATIONS_RESPONSE_HEADERS,
} from '../src/lib/trust/operations-api.mjs'

const OPERATOR_ID = '123e4567-e89b-42d3-a456-426614174000'
const OTHER_ID = '123e4567-e89b-42d3-a456-426614174001'

test('operator allowlist accepts UUIDs only and fails closed on malformed configuration', () => {
  assert.deepEqual([...parseOperatorUserIds(`${OPERATOR_ID},${OTHER_ID}`)], [OPERATOR_ID, OTHER_ID])
  assert.throws(() => parseOperatorUserIds(''), /not configured/)
  assert.throws(() => parseOperatorUserIds('operator@example.com'), /invalid user ID/)
  assert.throws(() => parseOperatorUserIds(`${OPERATOR_ID},${OPERATOR_ID}`), /duplicates/)
})

test('operations authorization verifies identity before evaluating operator configuration', () => {
  const unauthenticated = evaluateOperationsAccess({
    user: null,
    authError: new Error('invalid session'),
    operatorUserIds: undefined,
  })
  assert.deepEqual(unauthenticated, {
    ok: false,
    status: 401,
    code: 'authentication_required',
  })

  const unavailable = evaluateOperationsAccess({
    user: { id: OPERATOR_ID },
    operatorUserIds: undefined,
  })
  assert.equal(unavailable.status, 503)
  assert.equal(unavailable.code, 'operations_unavailable')
})

test('user metadata cannot grant operations access and raw operator IDs are never returned', () => {
  const denied = evaluateOperationsAccess({
    user: { id: OTHER_ID, user_metadata: { role: 'admin' } },
    operatorUserIds: OPERATOR_ID,
  })
  assert.equal(denied.status, 403)

  const allowed = evaluateOperationsAccess({
    user: { id: OPERATOR_ID, user_metadata: { role: 'user' } },
    operatorUserIds: OPERATOR_ID,
  })
  assert.equal(allowed.ok, true)
  assert.match(allowed.principalRef, /^[a-f0-9]{64}$/)
  assert.doesNotMatch(JSON.stringify(allowed), new RegExp(OPERATOR_ID))
})

test('authorized API response is read-only, non-cacheable, and privacy-safe', () => {
  const access = evaluateOperationsAccess({
    user: { id: OPERATOR_ID },
    operatorUserIds: OPERATOR_ID,
  })
  const response = buildOperationsApiResponse({
    access,
    generatedAt: '2026-09-01T19:30:00.000Z',
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers['Cache-Control'], 'private, no-store, max-age=0')
  assert.equal(response.headers['Surrogate-Control'], 'no-store')
  assert.equal(response.headers.Vary, 'Cookie')
  assert.equal(response.body.apiVersion, 'v1')
  assert.equal(response.body.data.mode, 'read-only')
  assert.equal(response.body.data.privacy.clinicalDataIncluded, false)
  assert.equal(response.body.data.trust.totalEvents, 0)
  assert.equal(response.body.data.evidence.total, 0)
  assert.equal(response.body.data.incidentLineage.replayMode, 'metadata-only')
  assert.equal(response.body.data.incidentLineage.executionAllowed, false)
  assert.equal(response.body.data.incidentLineage.summary.totalIncidents, 0)
  assert.equal(response.body.data.recoveryDrills.drillMode, 'evidence-records-only')
  assert.equal(response.body.data.recoveryDrills.executionAllowed, false)
  assert.equal(response.body.data.recoveryDrills.persistenceEnabled, false)
  assert.equal(response.body.data.recoveryDrills.summary.totalDrills, 0)
  assert.ok(response.body.data.recovery.summary.total > 0)
  assert.doesNotMatch(JSON.stringify(response.body), /attributes|patient|clinical_note|operator@example\.com/)
})

test('API failures return a generic unavailable response without leaking the exception', () => {
  const observed = []
  const denied = buildOperationsApiResponse({
    access: { ok: false, status: 403, code: 'private authorization detail' },
  })
  const response = buildOperationsApiResponse({
    access: { ok: true },
    readModelFactory: () => { throw new Error('private provider failure') },
    onError: (error) => observed.push(error),
  })

  assert.deepEqual(denied.body, { error: { code: 'operations_access_denied' } })
  assert.doesNotMatch(JSON.stringify(denied), /private authorization detail/)
  assert.equal(response.status, 503)
  assert.deepEqual(response.body, { error: { code: 'operations_unavailable' } })
  assert.equal(observed.length, 1)
  assert.doesNotMatch(JSON.stringify(response), /private provider failure/)
})

test('route contract exposes GET only and never imports the privileged Supabase client', () => {
  const source = readFileSync(
    new URL('../src/app/api/operations/v1/snapshot/route.ts', import.meta.url),
    'utf8'
  )

  assert.match(source, /export async function GET\(\)/)
  assert.match(source, /requireOperationsAccess/)
  assert.doesNotMatch(source, /export async function (POST|PUT|PATCH|DELETE)/)
  assert.doesNotMatch(source, /supabaseAdmin|SUPABASE_SERVICE_ROLE_KEY/)
  assert.equal(OPERATIONS_RESPONSE_HEADERS['X-Content-Type-Options'], 'nosniff')
})

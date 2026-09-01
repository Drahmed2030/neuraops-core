import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildOperationsConsoleView } from '../src/lib/trust/operations-console.mjs'
import { buildOperationsReadModel } from '../src/lib/trust/operations-read-model.mjs'

const GENERATED_AT = '2026-09-01T20:30:00.000Z'

test('authorized console uses the privacy-safe read model without an HTTP round trip', () => {
  const view = buildOperationsConsoleView({
    access: { ok: true },
    generatedAt: GENERATED_AT,
  })

  assert.equal(view.kind, 'ready')
  assert.equal(view.snapshot.generatedAt, GENERATED_AT)
  assert.equal(view.snapshot.mode, 'read-only')
  assert.deepEqual(view.snapshot.privacy, {
    rawPayloadsIncluded: false,
    eventAttributesIncluded: false,
    directIdentifiersIncluded: false,
    clinicalDataIncluded: false,
  })
  assert.equal(view.snapshot.incidentLineage.replayMode, 'metadata-only')
  assert.equal(view.snapshot.incidentLineage.executionAllowed, false)
  assert.equal(view.snapshot.recoveryDrills.drillMode, 'evidence-records-only')
  assert.equal(view.snapshot.recoveryDrills.executionAllowed, false)
  assert.equal(view.snapshot.recoveryDrills.persistenceEnabled, false)
})

test('console fails closed before projection when operator authorization is denied', () => {
  let projections = 0
  const view = buildOperationsConsoleView({
    access: { ok: false, status: 403, code: 'private-detail' },
    readModelFactory: () => {
      projections += 1
      return {}
    },
  })

  assert.deepEqual(view, { kind: 'access-denied' })
  assert.equal(projections, 0)
  assert.doesNotMatch(JSON.stringify(view), /private-detail/)
})

test('console rejects a projection that violates any display privacy boundary', () => {
  const observed = []
  const view = buildOperationsConsoleView({
    access: { ok: true },
    generatedAt: GENERATED_AT,
    readModelFactory: ({ generatedAt }) => ({
      generatedAt,
      mode: 'read-only',
      privacy: {
        rawPayloadsIncluded: false,
        eventAttributesIncluded: false,
        directIdentifiersIncluded: false,
        clinicalDataIncluded: true,
      },
      patient: 'must-not-render',
    }),
    onError: (error) => observed.push(error),
  })

  assert.deepEqual(view, { kind: 'unavailable' })
  assert.equal(observed.length, 1)
  assert.doesNotMatch(JSON.stringify(view), /must-not-render|patient/)
})

test('console rejects a snapshot that could execute incident replay', () => {
  const safe = buildOperationsReadModel({ generatedAt: GENERATED_AT })
  const observed = []
  const view = buildOperationsConsoleView({
    access: { ok: true },
    readModelFactory: () => ({
      ...safe,
      incidentLineage: {
        ...safe.incidentLineage,
        replayMode: 'executable',
        executionAllowed: true,
      },
    }),
    onError: (error) => observed.push(error),
  })

  assert.deepEqual(view, { kind: 'unavailable' })
  assert.equal(observed.length, 1)
})

test('console rejects executable or persistence-enabled recovery drills', () => {
  const safe = buildOperationsReadModel({ generatedAt: GENERATED_AT })
  const observed = []
  const view = buildOperationsConsoleView({
    access: { ok: true },
    readModelFactory: () => ({
      ...safe,
      recoveryDrills: {
        ...safe.recoveryDrills,
        executionAllowed: true,
        persistenceEnabled: true,
      },
    }),
    onError: (error) => observed.push(error),
  })

  assert.deepEqual(view, { kind: 'unavailable' })
  assert.equal(observed.length, 1)
})

test('console route remains server-authorized, dynamic, and mutation-free', () => {
  const route = readFileSync(
    new URL('../src/app/dashboard/operations/page.tsx', import.meta.url),
    'utf8'
  )
  const component = readFileSync(
    new URL('../src/components/operations/OperationsConsole.tsx', import.meta.url),
    'utf8'
  )

  assert.match(route, /requireOperationsAccess/)
  assert.match(route, /buildOperationsConsoleView/)
  assert.match(route, /dynamic = 'force-dynamic'/)
  assert.doesNotMatch(route, /fetch\(|supabaseAdmin|SUPABASE_SERVICE_ROLE_KEY/)
  assert.doesNotMatch(component, /fetch\(|<form|method=["'](?:POST|PUT|PATCH|DELETE)/i)
})

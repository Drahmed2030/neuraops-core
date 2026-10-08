import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createGraphPersistencePort,
  createMemoryGraphPersistence,
} from '../src/lib/graph/graph-persistence-port.mjs'
import { createCapabilityRegistry } from '../src/lib/graph/capability-registry.mjs'

const RUN_REF = 'a'.repeat(64)

test('memory persistence saves and reloads graph runs by opaque run reference', async () => {
  const port = createMemoryGraphPersistence()
  const run = { runRef: RUN_REF, revision: 0, currentNodeId: 'start' }

  assert.deepEqual(await port.saveRun({ run, expectedRevision: 0 }), {
    saved: true,
    reason: null,
  })
  assert.equal(await port.loadRun({ runRef: RUN_REF }), run)
})

test('persistence port rejects stale revisions', async () => {
  const port = createMemoryGraphPersistence()
  const run0 = { runRef: RUN_REF, revision: 0 }
  const run1 = { runRef: RUN_REF, revision: 1 }

  await port.saveRun({ run: run0, expectedRevision: 0 })

  assert.deepEqual(await port.saveRun({ run: run1, expectedRevision: 1 }), {
    saved: false,
    reason: 'revision-conflict',
  })
})

test('persistence adapter contract validates results', async () => {
  const port = createGraphPersistencePort({
    async loadRun() { return null },
    async saveRun() { return { saved: false, reason: 'unexpected' } },
  })

  await assert.rejects(
    () => port.saveRun({ run: { runRef: RUN_REF }, expectedRevision: 0 }),
    /revision-conflict/,
  )
})

test('capability registry prevents agent execute authority', () => {
  assert.throws(() => createCapabilityRegistry([{
    id: 'research',
    kind: 'agent',
    authority: 'execute',
    invoke: async () => null,
  }]), /Agent capability cannot execute/)
})

test('capability registry exposes metadata without exposing implementation', () => {
  const registry = createCapabilityRegistry([
    {
      id: 'research',
      kind: 'agent',
      authority: 'propose',
      invoke: async () => ({ ok: true }),
    },
    {
      id: 'dispatch-email',
      kind: 'action',
      authority: 'execute',
      invoke: async () => ({ receiptRef: 'example' }),
    },
  ])

  assert.equal(registry.has('research'), true)
  assert.equal(typeof registry.get('research').invoke, 'function')
  assert.deepEqual(registry.list(), [
    { id: 'research', kind: 'agent', authority: 'propose' },
    { id: 'dispatch-email', kind: 'action', authority: 'execute' },
  ])
  assert.throws(() => registry.get('missing'), /Unknown capability/)
})

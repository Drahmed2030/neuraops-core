import test from 'node:test'
import assert from 'node:assert/strict'

import { COMPANY_OPPORTUNITY_GRAPH_V1 } from '../src/lib/graph/company-opportunity-graph.mjs'
import {
  advanceGraphRunState,
  createGraphRunState,
  getGraphNodeExecutionPlan,
  resumeGraphRunState,
  validateGraphRunState,
} from '../src/lib/graph/graph-runtime.mjs'

const START = '2026-10-02T00:00:00.000Z'

function startRun() {
  return createGraphRunState(COMPANY_OPPORTUNITY_GRAPH_V1, {
    runRef: 'run:company-opportunity-001',
    idempotencyKey: 'idempotency:company-opportunity-001',
    startedAt: START,
  })
}

function step(run, input) {
  return advanceGraphRunState(COMPANY_OPPORTUNITY_GRAPH_V1, run, {
    occurredAt: new Date(Date.parse(START) + (run.revision + 1) * 1_000).toISOString(),
    expectedRevision: run.revision,
    commandRef: `command:${run.revision + 1}`,
    ...input,
  })
}

test('graph run starts at the declared start node with opaque run and idempotency refs', () => {
  const run = startRun()

  assert.equal(validateGraphRunState(COMPANY_OPPORTUNITY_GRAPH_V1, run), true)
  assert.equal(run.status, 'active')
  assert.equal(run.currentNodeId, 'opportunity-event')
  assert.equal(run.revision, 0)
  assert.equal(run.stepCount, 0)
  assert.match(run.runRef, /^[a-f0-9]{64}$/)
  assert.match(run.idempotencyKey, /^[a-f0-9]{64}$/)
})

test('execution plan exposes bounded node runtime metadata only', () => {
  let run = startRun()
  run = step(run, { outcome: 'accepted' })

  const plan = getGraphNodeExecutionPlan(COMPANY_OPPORTUNITY_GRAPH_V1, run)

  assert.deepEqual(plan, {
    graphId: 'company-opportunity',
    graphVersion: 'v1',
    runRef: run.runRef,
    revision: 1,
    nodeId: 'research',
    kind: 'agent',
    authority: 'propose',
    risk: 'low',
    timeoutMs: 120000,
    maxAttempts: 2,
    retryBackoffMs: 2000,
    requiresApproval: false,
  })
})

test('run can resume only with the original idempotency key', () => {
  const run = startRun()

  assert.equal(
    resumeGraphRunState(COMPANY_OPPORTUNITY_GRAPH_V1, run, {
      idempotencyKey: 'idempotency:company-opportunity-001',
    }),
    run,
  )

  assert.throws(() => resumeGraphRunState(COMPANY_OPPORTUNITY_GRAPH_V1, run, {
    idempotencyKey: 'wrong-key',
  }), /idempotency mismatch/)
})

test('same command replay is idempotent while stale revisions fail closed', () => {
  const run = startRun()
  const first = advanceGraphRunState(COMPANY_OPPORTUNITY_GRAPH_V1, run, {
    outcome: 'accepted',
    occurredAt: '2026-10-02T00:00:01.000Z',
    expectedRevision: 0,
    commandRef: 'command:first',
  })

  const replay = advanceGraphRunState(COMPANY_OPPORTUNITY_GRAPH_V1, first, {
    outcome: 'accepted',
    occurredAt: '2026-10-02T00:00:02.000Z',
    expectedRevision: 0,
    commandRef: 'command:first',
  })

  assert.equal(replay, first)

  assert.throws(() => advanceGraphRunState(COMPANY_OPPORTUNITY_GRAPH_V1, first, {
    outcome: 'success',
    occurredAt: '2026-10-02T00:00:02.000Z',
    expectedRevision: 0,
    commandRef: 'command:stale',
  }), /revision conflict/)
})

test('policy approval must carry an opaque decision reference', () => {
  let run = startRun()
  run = step(run, { outcome: 'accepted' })
  run = step(run, { outcome: 'success' })
  run = step(run, { outcome: 'qualified' })

  assert.equal(run.currentNodeId, 'compliance-gate')

  assert.throws(() => step(run, { outcome: 'approved' }), /policyDecisionRef/)

  run = step(run, {
    outcome: 'approved',
    policyDecisionRef: 'policy:company-opportunity-approved',
  })

  assert.equal(run.currentNodeId, 'draft')
  assert.match(run.approvals.policy, /^[a-f0-9]{64}$/)
})

test('human approval is required before the dispatch action becomes executable', () => {
  let run = startRun()
  run = step(run, { outcome: 'accepted' })
  run = step(run, { outcome: 'success' })
  run = step(run, { outcome: 'qualified' })
  run = step(run, {
    outcome: 'approved',
    policyDecisionRef: 'policy:company-opportunity-approved',
  })
  run = step(run, { outcome: 'ready' })

  assert.equal(run.currentNodeId, 'founder-approval')
  assert.throws(() => step(run, { outcome: 'approved' }), /humanApprovalRef/)

  run = step(run, {
    outcome: 'approved',
    humanApprovalRef: 'approval:founder-company-opportunity-001',
  })

  assert.equal(run.currentNodeId, 'dispatch')
  assert.match(run.approvals.human, /^[a-f0-9]{64}$/)
})

test('action transitions require execution evidence and complete only at a terminal evidence node', () => {
  let run = startRun()
  run = step(run, { outcome: 'accepted' })
  run = step(run, { outcome: 'success' })
  run = step(run, { outcome: 'qualified' })
  run = step(run, {
    outcome: 'approved',
    policyDecisionRef: 'policy:company-opportunity-approved',
  })
  run = step(run, { outcome: 'ready' })
  run = step(run, {
    outcome: 'approved',
    humanApprovalRef: 'approval:founder-company-opportunity-001',
  })

  assert.throws(() => step(run, { outcome: 'success' }), /actionExecutionRef/)

  run = step(run, {
    outcome: 'success',
    actionExecutionRef: 'email:dispatch-receipt-001',
  })

  assert.equal(run.currentNodeId, 'record-evidence')
  assert.equal(run.status, 'completed')
  assert.equal(run.revision, 7)
  assert.equal(run.stepCount, 7)
  assert.match(run.execution.lastActionRef, /^[a-f0-9]{64}$/)
  assert.ok(run.completedAt)
})

test('rejected founder decision terminates without action execution metadata', () => {
  let run = startRun()
  run = step(run, { outcome: 'accepted' })
  run = step(run, { outcome: 'success' })
  run = step(run, { outcome: 'qualified' })
  run = step(run, {
    outcome: 'approved',
    policyDecisionRef: 'policy:company-opportunity-approved',
  })
  run = step(run, { outcome: 'ready' })
  run = step(run, { outcome: 'rejected' })

  assert.equal(run.status, 'completed')
  assert.equal(run.currentNodeId, 'closed-no-action')
  assert.equal(run.execution.lastActionRef, null)
})

test('completed graph runs cannot advance again', () => {
  let run = startRun()
  run = step(run, { outcome: 'accepted' })
  run = step(run, { outcome: 'failed' })

  assert.equal(run.status, 'completed')
  assert.throws(() => step(run, { outcome: 'anything' }), /cannot advance/)
})

test('run timestamps cannot move backwards', () => {
  const run = startRun()

  assert.throws(() => advanceGraphRunState(COMPANY_OPPORTUNITY_GRAPH_V1, run, {
    outcome: 'accepted',
    occurredAt: '2026-10-01T23:59:59.999Z',
    expectedRevision: 0,
    commandRef: 'command:past',
  }), /cannot precede/)
})

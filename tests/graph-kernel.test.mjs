import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createGraphDefinition,
  createGraphEvidenceReceipt,
  planGraphTransition,
  validateGraphDefinition,
} from '../src/lib/graph/graph-kernel.mjs'
import { COMPANY_OPPORTUNITY_GRAPH_V1 } from '../src/lib/graph/company-opportunity-graph.mjs'

test('company opportunity graph validates as a bounded deterministic graph', () => {
  assert.equal(validateGraphDefinition(COMPANY_OPPORTUNITY_GRAPH_V1), true)
  assert.equal(COMPANY_OPPORTUNITY_GRAPH_V1.domain, 'company-operations')
  assert.equal(COMPANY_OPPORTUNITY_GRAPH_V1.startNodeId, 'opportunity-event')
})

test('agent nodes cannot silently gain execute authority', () => {
  assert.throws(() => createGraphDefinition({
    id: 'invalid-agent-executor',
    version: 'v1',
    domain: 'company-operations',
    startNodeId: 'agent',
    nodes: [
      {
        id: 'agent',
        kind: 'agent',
        authority: 'execute',
        risk: 'low',
      },
      {
        id: 'done',
        kind: 'evidence',
        authority: 'read',
        risk: 'low',
        terminal: true,
      },
    ],
    transitions: [{ from: 'agent', outcome: 'success', to: 'done' }],
  }), /Agent nodes cannot hold execute authority/)
})

test('action nodes require an explicit incoming policy or human gate', () => {
  assert.throws(() => createGraphDefinition({
    id: 'invalid-ungated-action',
    version: 'v1',
    domain: 'company-operations',
    startNodeId: 'start',
    nodes: [
      {
        id: 'start',
        kind: 'deterministic',
        authority: 'read',
        risk: 'low',
      },
      {
        id: 'dispatch',
        kind: 'action',
        authority: 'execute',
        risk: 'moderate',
        requiresApproval: true,
      },
      {
        id: 'done',
        kind: 'evidence',
        authority: 'read',
        risk: 'low',
        terminal: true,
      },
    ],
    transitions: [
      { from: 'start', outcome: 'go', to: 'dispatch' },
      { from: 'dispatch', outcome: 'success', to: 'done' },
    ],
  }), /Approved action must be entered from a gate/)
})

test('graph transitions are explicit and outcome-specific', () => {
  const first = planGraphTransition(
    COMPANY_OPPORTUNITY_GRAPH_V1,
    'opportunity-event',
    'accepted',
  )
  const qualified = planGraphTransition(
    COMPANY_OPPORTUNITY_GRAPH_V1,
    'qualify',
    'qualified',
  )
  const approved = planGraphTransition(
    COMPANY_OPPORTUNITY_GRAPH_V1,
    'founder-approval',
    'approved',
  )

  assert.equal(first.nextNodeId, 'research')
  assert.equal(qualified.nextNodeId, 'compliance-gate')
  assert.equal(approved.nextNodeId, 'dispatch')
  assert.throws(
    () => planGraphTransition(COMPANY_OPPORTUNITY_GRAPH_V1, 'qualify', 'invented'),
    /No graph transition/,
  )
})

test('terminal evidence nodes cannot transition further', () => {
  const result = planGraphTransition(
    COMPANY_OPPORTUNITY_GRAPH_V1,
    'record-evidence',
    'anything',
  )

  assert.deepEqual(result, {
    terminal: true,
    currentNodeId: 'record-evidence',
    nextNodeId: null,
    outcome: null,
  })
})

test('duplicate outcomes and unreachable nodes are rejected', () => {
  assert.throws(() => createGraphDefinition({
    id: 'invalid-duplicates',
    version: 'v1',
    domain: 'company-operations',
    startNodeId: 'start',
    nodes: [
      { id: 'start', kind: 'event', authority: 'read', risk: 'low' },
      { id: 'one', kind: 'evidence', authority: 'read', risk: 'low', terminal: true },
      { id: 'two', kind: 'evidence', authority: 'read', risk: 'low', terminal: true },
    ],
    transitions: [
      { from: 'start', outcome: 'accepted', to: 'one' },
      { from: 'start', outcome: 'accepted', to: 'two' },
    ],
  }), /Duplicate graph transition outcome/)

  assert.throws(() => createGraphDefinition({
    id: 'invalid-unreachable',
    version: 'v1',
    domain: 'company-operations',
    startNodeId: 'start',
    nodes: [
      { id: 'start', kind: 'event', authority: 'read', risk: 'low' },
      { id: 'done', kind: 'evidence', authority: 'read', risk: 'low', terminal: true },
      { id: 'orphan', kind: 'evidence', authority: 'read', risk: 'low', terminal: true },
    ],
    transitions: [{ from: 'start', outcome: 'accepted', to: 'done' }],
  }), /unreachable nodes/)
})

test('evidence receipts contain bounded metadata and opaque references only', () => {
  const receipt = createGraphEvidenceReceipt({
    receiptRef: 'receipt:company-opportunity-1',
    graphId: 'company-opportunity',
    graphVersion: 'v1',
    runRef: 'run:company-opportunity-1',
    nodeId: 'dispatch',
    nodeKind: 'action',
    status: 'completed',
    outcome: 'success',
    occurredAt: '2026-10-02T00:00:00.000Z',
    attempt: 1,
    actorClass: 'human',
    policyGate: 'policy:company-outreach-v1',
    humanGate: 'approval:founder-1',
    evidenceRefs: ['email:thread-1'],
  })

  assert.match(receipt.receiptRef, /^[a-f0-9]{64}$/)
  assert.match(receipt.runRef, /^[a-f0-9]{64}$/)
  assert.match(receipt.policyGate, /^[a-f0-9]{64}$/)
  assert.match(receipt.humanGate, /^[a-f0-9]{64}$/)
  assert.match(receipt.evidenceRefs[0], /^[a-f0-9]{64}$/)

  const serialized = JSON.stringify(receipt)
  assert.doesNotMatch(serialized, /thread-1|founder-1|company-outreach-v1/)

  assert.throws(() => createGraphEvidenceReceipt({
    ...receipt,
    prompt: 'must never enter evidence',
  }), /Unsupported graph evidence receipt field/)
})

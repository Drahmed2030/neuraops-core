import crypto from 'node:crypto'
import { planGraphTransition, validateGraphDefinition } from './graph-kernel.mjs'

const RUN_STATUSES = new Set(['active', 'completed'])
const SHA256 = /^[a-f0-9]{64}$/

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hashRef(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

function commandFingerprint(run, input) {
  return hashRef(JSON.stringify({
    nodeId: run.currentNodeId,
    outcome: input.outcome ?? null,
    policyDecisionRef: input.policyDecisionRef ?? null,
    humanApprovalRef: input.humanApprovalRef ?? null,
    actionExecutionRef: input.actionExecutionRef ?? null,
  }))
}

function assertTimestamp(name, value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`Invalid graph run ${name}`)
  }
}

function assertOpaque(name, value) {
  if (typeof value !== 'string' || !SHA256.test(value)) {
    throw new TypeError(`Invalid graph run ${name}`)
  }
}

function getNode(definition, nodeId) {
  const node = definition.nodes.find((candidate) => candidate.id === nodeId)
  if (!node) throw new TypeError(`Graph run references unknown node: ${nodeId}`)
  return node
}

function freezeRun(run) {
  return Object.freeze({
    ...run,
    approvals: Object.freeze({ ...run.approvals }),
    execution: Object.freeze({ ...run.execution }),
  })
}

export function validateGraphRunState(definition, run) {
  validateGraphDefinition(definition)
  if (!isPlainObject(run)) throw new TypeError('Graph run state must be an object')
  if (run.schemaVersion !== 1) throw new TypeError('Invalid graph run schemaVersion')
  if (run.graphId !== definition.id || run.graphVersion !== definition.version) {
    throw new TypeError('Graph run definition/version mismatch')
  }
  assertOpaque('runRef', run.runRef)
  assertOpaque('idempotencyKey', run.idempotencyKey)
  if (!RUN_STATUSES.has(run.status)) throw new TypeError('Invalid graph run status')
  if (!Number.isInteger(run.revision) || run.revision < 0) throw new TypeError('Invalid graph run revision')
  if (!Number.isInteger(run.stepCount) || run.stepCount < 0) throw new TypeError('Invalid graph run stepCount')
  assertTimestamp('startedAt', run.startedAt)
  assertTimestamp('updatedAt', run.updatedAt)
  if (Date.parse(run.updatedAt) < Date.parse(run.startedAt)) {
    throw new TypeError('Graph run updatedAt cannot precede startedAt')
  }

  const currentNode = getNode(definition, run.currentNodeId)

  if (!isPlainObject(run.approvals)) throw new TypeError('Invalid graph run approvals')
  if (run.approvals.policy !== null) assertOpaque('policy approval', run.approvals.policy)
  if (run.approvals.human !== null) assertOpaque('human approval', run.approvals.human)

  if (!isPlainObject(run.execution)) throw new TypeError('Invalid graph run execution metadata')
  if (run.execution.lastCommandRef !== null) assertOpaque('lastCommandRef', run.execution.lastCommandRef)
  if (run.execution.lastCommandFingerprint !== null) assertOpaque('lastCommandFingerprint', run.execution.lastCommandFingerprint)
  if ((run.execution.lastCommandRef === null) !== (run.execution.lastCommandFingerprint === null)) {
    throw new TypeError('Graph run command idempotency metadata is incomplete')
  }
  if (run.execution.lastActionRef !== null) assertOpaque('lastActionRef', run.execution.lastActionRef)

  if (run.status === 'completed') {
    if (!currentNode.terminal) throw new TypeError('Completed graph run must be on a terminal node')
    if (run.completedAt === null) throw new TypeError('Completed graph run requires completedAt')
    assertTimestamp('completedAt', run.completedAt)
    if (Date.parse(run.completedAt) < Date.parse(run.startedAt)) {
      throw new TypeError('Graph run completedAt cannot precede startedAt')
    }
  } else {
    if (currentNode.terminal) throw new TypeError('Active graph run cannot be on a terminal node')
    if (run.completedAt !== null) throw new TypeError('Active graph run cannot declare completedAt')
  }

  return true
}

export function createGraphRunState(definition, input = {}) {
  validateGraphDefinition(definition)
  if (!isPlainObject(input)) throw new TypeError('Graph run input must be an object')

  const startedAt = input.startedAt || new Date().toISOString()
  assertTimestamp('startedAt', startedAt)

  const run = freezeRun({
    schemaVersion: 1,
    graphId: definition.id,
    graphVersion: definition.version,
    runRef: hashRef(input.runRef || `graph-run:${crypto.randomUUID()}`),
    idempotencyKey: hashRef(input.idempotencyKey || `graph-idempotency:${crypto.randomUUID()}`),
    status: 'active',
    currentNodeId: definition.startNodeId,
    revision: 0,
    stepCount: 0,
    startedAt,
    updatedAt: startedAt,
    completedAt: null,
    approvals: {
      policy: null,
      human: null,
    },
    execution: {
      lastCommandRef: null,
      lastCommandFingerprint: null,
      lastActionRef: null,
    },
  })

  validateGraphRunState(definition, run)
  return run
}

export function getGraphNodeExecutionPlan(definition, run) {
  validateGraphRunState(definition, run)
  const node = getNode(definition, run.currentNodeId)

  return Object.freeze({
    graphId: definition.id,
    graphVersion: definition.version,
    runRef: run.runRef,
    revision: run.revision,
    nodeId: node.id,
    kind: node.kind,
    authority: node.authority,
    risk: node.risk,
    timeoutMs: node.timeoutMs,
    maxAttempts: node.retry.maxAttempts,
    retryBackoffMs: node.retry.backoffMs,
    requiresApproval: node.requiresApproval,
  })
}

export function resumeGraphRunState(definition, snapshot, input = {}) {
  validateGraphRunState(definition, snapshot)
  if (!isPlainObject(input)) throw new TypeError('Graph resume input must be an object')
  if (!input.idempotencyKey) throw new TypeError('Graph resume requires idempotencyKey')

  const suppliedKey = hashRef(input.idempotencyKey)
  if (suppliedKey !== snapshot.idempotencyKey) {
    throw new TypeError('Graph resume idempotency mismatch')
  }

  return snapshot
}

export function advanceGraphRunState(definition, run, input = {}) {
  validateGraphRunState(definition, run)
  if (!isPlainObject(input)) throw new TypeError('Graph advance input must be an object')
  if (run.status !== 'active') throw new TypeError('Completed graph run cannot advance')
  if (!input.commandRef) throw new TypeError('Graph advance requires commandRef')
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) {
    throw new TypeError('Graph advance requires expectedRevision')
  }

  const commandRef = hashRef(input.commandRef)
  const fingerprint = commandFingerprint(run, input)
  if (run.execution.lastCommandRef === commandRef) {
    if (run.execution.lastCommandFingerprint !== fingerprint) {
      throw new TypeError('Graph command idempotency conflict')
    }
    return run
  }
  if (input.expectedRevision !== run.revision) {
    throw new TypeError('Graph advance revision conflict')
  }

  const currentNode = getNode(definition, run.currentNodeId)
  const occurredAt = input.occurredAt || new Date().toISOString()
  assertTimestamp('occurredAt', occurredAt)
  if (Date.parse(occurredAt) < Date.parse(run.updatedAt)) {
    throw new TypeError('Graph advance occurredAt cannot precede run updatedAt')
  }

  let policyApproval = run.approvals.policy
  let humanApproval = run.approvals.human
  let lastActionRef = run.execution.lastActionRef

  if (currentNode.kind === 'policy-gate' && input.outcome === 'approved') {
    if (!input.policyDecisionRef) throw new TypeError('Approved policy gate requires policyDecisionRef')
    policyApproval = hashRef(input.policyDecisionRef)
  }

  if (currentNode.kind === 'human-gate' && input.outcome === 'approved') {
    if (!input.humanApprovalRef) throw new TypeError('Approved human gate requires humanApprovalRef')
    humanApproval = hashRef(input.humanApprovalRef)
  }

  if (currentNode.kind === 'action') {
    if (!input.actionExecutionRef) throw new TypeError('Action transition requires actionExecutionRef')
    if (currentNode.requiresApproval && policyApproval === null && humanApproval === null) {
      throw new TypeError('Approved action cannot execute without recorded approval')
    }
    lastActionRef = hashRef(input.actionExecutionRef)
  }

  const transition = planGraphTransition(definition, run.currentNodeId, input.outcome)
  const nextNode = getNode(definition, transition.nextNodeId)
  const completed = nextNode.terminal

  const nextRun = freezeRun({
    ...run,
    status: completed ? 'completed' : 'active',
    currentNodeId: nextNode.id,
    revision: run.revision + 1,
    stepCount: run.stepCount + 1,
    updatedAt: occurredAt,
    completedAt: completed ? occurredAt : null,
    approvals: {
      policy: policyApproval,
      human: humanApproval,
    },
    execution: {
      lastCommandRef: commandRef,
      lastCommandFingerprint: fingerprint,
      lastActionRef,
    },
  })

  validateGraphRunState(definition, nextRun)
  return nextRun
}

export const GRAPH_RUN_STATUSES = Object.freeze([...RUN_STATUSES])

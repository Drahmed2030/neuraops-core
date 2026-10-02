import crypto from 'node:crypto'

const SAFE_ID = /^[a-z0-9][a-z0-9._:/-]{0,159}$/i
const NODE_KINDS = new Set([
  'event',
  'deterministic',
  'agent',
  'tool',
  'policy-gate',
  'human-gate',
  'action',
  'evidence',
])
const AUTHORITIES = new Set(['read', 'propose', 'execute'])
const RISK_LEVELS = new Set(['low', 'moderate', 'high'])
const ACTOR_CLASSES = new Set(['system', 'agent', 'human', 'tool'])
const RECEIPT_STATUSES = new Set(['completed', 'blocked', 'failed', 'cancelled'])

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function assertSafeId(name, value) {
  if (typeof value !== 'string' || !SAFE_ID.test(value)) {
    throw new TypeError(`Invalid graph ${name}`)
  }
}

function assertPositiveInt(name, value, max = 1000) {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new TypeError(`Invalid graph ${name}`)
  }
}

function normalizeRetryPolicy(value = {}) {
  if (!isPlainObject(value)) throw new TypeError('Invalid graph retry policy')
  const maxAttempts = value.maxAttempts ?? 1
  const backoffMs = value.backoffMs ?? 0
  assertPositiveInt('retry maxAttempts', maxAttempts, 10)
  if (!Number.isInteger(backoffMs) || backoffMs < 0 || backoffMs > 300_000) {
    throw new TypeError('Invalid graph retry backoffMs')
  }
  return Object.freeze({ maxAttempts, backoffMs })
}

function normalizeNode(node) {
  if (!isPlainObject(node)) throw new TypeError('Graph node must be an object')
  assertSafeId('node id', node.id)
  if (!NODE_KINDS.has(node.kind)) throw new TypeError(`Invalid graph node kind: ${String(node.kind)}`)
  if (!AUTHORITIES.has(node.authority)) throw new TypeError(`Invalid graph node authority: ${String(node.authority)}`)
  if (!RISK_LEVELS.has(node.risk)) throw new TypeError(`Invalid graph node risk: ${String(node.risk)}`)

  if (node.kind === 'agent' && node.authority === 'execute') {
    throw new TypeError('Agent nodes cannot hold execute authority')
  }
  if (node.kind !== 'action' && node.requiresApproval === true) {
    throw new TypeError('Only action nodes may require approval')
  }
  if (node.kind === 'action' && node.authority !== 'execute') {
    throw new TypeError('Action nodes require execute authority')
  }
  if (node.kind === 'action' && node.requiresApproval !== true) {
    throw new TypeError('Action nodes must require explicit approval')
  }
  if (node.kind === 'human-gate' && node.authority !== 'propose') {
    throw new TypeError('Human gates use propose authority until a decision is recorded')
  }
  if (node.terminal === true && node.kind === 'action') {
    throw new TypeError('Action nodes cannot be terminal; evidence must follow execution')
  }

  const timeoutMs = node.timeoutMs ?? 30_000
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 900_000) {
    throw new TypeError('Invalid graph node timeoutMs')
  }

  return Object.freeze({
    id: node.id,
    kind: node.kind,
    authority: node.authority,
    risk: node.risk,
    terminal: node.terminal === true,
    requiresApproval: node.requiresApproval === true,
    timeoutMs,
    retry: normalizeRetryPolicy(node.retry),
  })
}

function normalizeTransition(transition) {
  if (!isPlainObject(transition)) throw new TypeError('Graph transition must be an object')
  assertSafeId('transition from', transition.from)
  assertSafeId('transition outcome', transition.outcome)
  assertSafeId('transition to', transition.to)
  return Object.freeze({
    from: transition.from,
    outcome: transition.outcome,
    to: transition.to,
  })
}

function reachableNodeIds(startNodeId, transitions) {
  const seen = new Set([startNodeId])
  const queue = [startNodeId]
  while (queue.length > 0) {
    const current = queue.shift()
    for (const transition of transitions) {
      if (transition.from !== current || seen.has(transition.to)) continue
      seen.add(transition.to)
      queue.push(transition.to)
    }
  }
  return seen
}

export function validateGraphDefinition(definition) {
  if (!isPlainObject(definition)) throw new TypeError('Graph definition must be an object')
  if (definition.schemaVersion !== 1) throw new TypeError('Invalid graph schemaVersion')
  assertSafeId('id', definition.id)
  assertSafeId('version', definition.version)
  assertSafeId('domain', definition.domain)
  assertSafeId('startNodeId', definition.startNodeId)

  if (!Array.isArray(definition.nodes) || definition.nodes.length === 0 || definition.nodes.length > 100) {
    throw new TypeError('Graph nodes must contain 1..100 nodes')
  }
  if (!Array.isArray(definition.transitions) || definition.transitions.length > 300) {
    throw new TypeError('Graph transitions must be an array with at most 300 entries')
  }

  const nodes = definition.nodes.map(normalizeNode)
  const transitions = definition.transitions.map(normalizeTransition)
  const nodeIndex = new Map()

  for (const node of nodes) {
    if (nodeIndex.has(node.id)) throw new TypeError(`Duplicate graph node: ${node.id}`)
    nodeIndex.set(node.id, node)
  }
  if (!nodeIndex.has(definition.startNodeId)) throw new TypeError('Graph start node does not exist')

  const transitionKeys = new Set()
  for (const transition of transitions) {
    if (!nodeIndex.has(transition.from) || !nodeIndex.has(transition.to)) {
      throw new TypeError('Graph transition references unknown node')
    }
    const key = `${transition.from}::${transition.outcome}`
    if (transitionKeys.has(key)) throw new TypeError(`Duplicate graph transition outcome: ${key}`)
    transitionKeys.add(key)
  }

  for (const node of nodes) {
    const outgoing = transitions.filter((transition) => transition.from === node.id)
    if (node.terminal && outgoing.length > 0) throw new TypeError(`Terminal graph node has outgoing transition: ${node.id}`)
    if (!node.terminal && outgoing.length === 0) throw new TypeError(`Non-terminal graph node has no outgoing transition: ${node.id}`)

    if (node.kind === 'action' && node.requiresApproval) {
      const incoming = transitions.filter((transition) => transition.to === node.id)
      if (incoming.length === 0) throw new TypeError(`Approved action has no incoming gate: ${node.id}`)
      for (const transition of incoming) {
        const source = nodeIndex.get(transition.from)
        if (!['policy-gate', 'human-gate'].includes(source.kind)) {
          throw new TypeError(`Approved action must be entered from a gate: ${node.id}`)
        }
      }
    }
  }

  const reachable = reachableNodeIds(definition.startNodeId, transitions)
  if (reachable.size !== nodes.length) {
    const unreachable = nodes.filter((node) => !reachable.has(node.id)).map((node) => node.id)
    throw new TypeError(`Graph contains unreachable nodes: ${unreachable.join(',')}`)
  }

  return true
}

export function createGraphDefinition(input) {
  if (!isPlainObject(input)) throw new TypeError('Graph definition input must be an object')
  const definition = Object.freeze({
    schemaVersion: 1,
    id: input.id,
    version: input.version,
    domain: input.domain,
    startNodeId: input.startNodeId,
    nodes: Object.freeze((input.nodes || []).map(normalizeNode)),
    transitions: Object.freeze((input.transitions || []).map(normalizeTransition)),
  })
  validateGraphDefinition(definition)
  return definition
}

export function planGraphTransition(definition, currentNodeId, outcome) {
  validateGraphDefinition(definition)
  assertSafeId('currentNodeId', currentNodeId)
  assertSafeId('outcome', outcome)

  const currentNode = definition.nodes.find((node) => node.id === currentNodeId)
  if (!currentNode) throw new TypeError('Current graph node does not exist')
  if (currentNode.terminal) {
    return Object.freeze({ terminal: true, currentNodeId, nextNodeId: null, outcome: null })
  }

  const transition = definition.transitions.find(
    (candidate) => candidate.from === currentNodeId && candidate.outcome === outcome,
  )
  if (!transition) throw new TypeError(`No graph transition for ${currentNodeId} outcome ${outcome}`)

  return Object.freeze({
    terminal: false,
    currentNodeId,
    nextNodeId: transition.to,
    outcome,
  })
}

function hashRef(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

export function createGraphEvidenceReceipt(input = {}) {
  if (!isPlainObject(input)) throw new TypeError('Graph evidence receipt input must be an object')
  const allowed = new Set([
    'receiptRef',
    'graphId',
    'graphVersion',
    'runRef',
    'nodeId',
    'nodeKind',
    'status',
    'outcome',
    'occurredAt',
    'attempt',
    'actorClass',
    'policyGate',
    'humanGate',
    'evidenceRefs',
  ])
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) throw new TypeError(`Unsupported graph evidence receipt field: ${key}`)
  }

  assertSafeId('receipt graphId', input.graphId)
  assertSafeId('receipt graphVersion', input.graphVersion)
  assertSafeId('receipt nodeId', input.nodeId)
  if (!NODE_KINDS.has(input.nodeKind)) throw new TypeError('Invalid graph evidence nodeKind')
  if (!RECEIPT_STATUSES.has(input.status)) throw new TypeError('Invalid graph evidence status')
  if (input.outcome !== null && input.outcome !== undefined) assertSafeId('receipt outcome', input.outcome)
  if (!ACTOR_CLASSES.has(input.actorClass)) throw new TypeError('Invalid graph evidence actorClass')
  assertPositiveInt('receipt attempt', input.attempt ?? 1, 10)

  const occurredAt = input.occurredAt || new Date().toISOString()
  if (!Number.isFinite(Date.parse(occurredAt))) throw new TypeError('Invalid graph evidence occurredAt')

  const evidenceRefs = input.evidenceRefs || []
  if (!Array.isArray(evidenceRefs) || evidenceRefs.length > 20) throw new TypeError('Invalid graph evidence refs')

  const receipt = {
    schemaVersion: 1,
    receiptRef: hashRef(input.receiptRef || `graph-receipt:${crypto.randomUUID()}`),
    graphId: input.graphId,
    graphVersion: input.graphVersion,
    runRef: hashRef(input.runRef || `graph-run:${crypto.randomUUID()}`),
    nodeId: input.nodeId,
    nodeKind: input.nodeKind,
    status: input.status,
    outcome: input.outcome ?? null,
    occurredAt,
    attempt: input.attempt ?? 1,
    actorClass: input.actorClass,
    policyGate: input.policyGate ? hashRef(input.policyGate) : null,
    humanGate: input.humanGate ? hashRef(input.humanGate) : null,
    evidenceRefs: Object.freeze(evidenceRefs.map(hashRef)),
  }

  return Object.freeze(receipt)
}

export const GRAPH_KERNEL_ENUMS = Object.freeze({
  nodeKinds: Object.freeze([...NODE_KINDS]),
  authorities: Object.freeze([...AUTHORITIES]),
  riskLevels: Object.freeze([...RISK_LEVELS]),
  actorClasses: Object.freeze([...ACTOR_CLASSES]),
})

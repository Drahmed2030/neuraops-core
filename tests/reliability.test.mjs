import test from 'node:test'
import assert from 'node:assert/strict'
import {
  callWithTimeoutAndRetry,
  parseAgentResponse,
  parseRoutingResponse,
} from '../src/lib/reliability/ai.mjs'
import {
  conversationStatusAfterResolution,
  conversationUpdateForEscalationStatus,
  ensureActiveEscalation,
} from '../src/lib/reliability/escalation.mjs'

test('routing response validation accepts only known agents and bounded confidence', () => {
  assert.deepEqual(
    parseRoutingResponse('{"agent":"returns","reasoning":"return request","confidence":0.9}'),
    { agent: 'returns', reasoning: 'return request', confidence: 0.9 }
  )
  assert.throws(() => parseRoutingResponse('{"agent":"unknown","reasoning":"x","confidence":0.9}'))
  assert.throws(() => parseRoutingResponse('not-json'))
  assert.throws(() => parseRoutingResponse('{"agent":"returns","reasoning":"x","confidence":2}'))
})

test('specialist response validation rejects invalid JSON/schema', () => {
  const valid = parseAgentResponse('{"answer":"ok","confidence":0.7,"should_escalate":false,"escalation_reason":null}')
  assert.equal(valid.answer, 'ok')
  assert.throws(() => parseAgentResponse('{"answer":"","confidence":0.7,"should_escalate":false,"escalation_reason":null}'))
  assert.throws(() => parseAgentResponse('{"answer":"ok","confidence":0.7,"should_escalate":"no","escalation_reason":null}'))
})

test('provider timeout is bounded and does not retry non-retryable validation errors', async () => {
  let timeoutAttempts = 0
  await assert.rejects(
    callWithTimeoutAndRetry(async signal => {
      timeoutAttempts += 1
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 100)
        signal.addEventListener('abort', () => {
          clearTimeout(timer)
          const error = new Error('aborted')
          error.name = 'AbortError'
          reject(error)
        })
      })
    }, { timeoutMs: 5, retries: 1 })
  )
  assert.equal(timeoutAttempts, 2)

  let validationAttempts = 0
  await assert.rejects(
    callWithTimeoutAndRetry(async () => {
      validationAttempts += 1
      throw new Error('invalid_agent_response')
    }, { timeoutMs: 50, retries: 1 })
  )
  assert.equal(validationAttempts, 1)
})

test('escalation creation is idempotent when an active incident already exists', async () => {
  let creates = 0
  let statusUpdates = 0
  const adapter = {
    findActive: async () => ({ id: 'esc-1' }),
    create: async () => { creates += 1; return { id: 'esc-2' } },
    markConversationEscalated: async () => { statusUpdates += 1; return true },
  }

  const result = await ensureActiveEscalation(adapter, {
    conversationId: 'conv-1', storeId: 'store-1', sessionId: 'session-123456',
  })

  assert.deepEqual(result, { ok: true, created: false, escalationId: 'esc-1' })
  assert.equal(creates, 0)
  assert.equal(statusUpdates, 1)
})

test('no false-positive escalation when conversation status persistence fails', async () => {
  let removed = false
  const adapter = {
    findActive: async () => null,
    create: async () => ({ id: 'esc-new' }),
    markConversationEscalated: async () => false,
    remove: async () => { removed = true },
  }

  const result = await ensureActiveEscalation(adapter, {
    conversationId: 'conv-1', storeId: 'store-1', sessionId: 'session-123456',
  })

  assert.equal(result.ok, false)
  assert.equal(removed, true)
})

test('resolved escalation reopens conversation only when no active escalation remains', () => {
  assert.equal(conversationStatusAfterResolution(0), 'open')
  assert.equal(conversationStatusAfterResolution(1), 'escalated')
})

test('resolution lifecycle update preserves manual pause semantics', () => {
  const update = conversationUpdateForEscalationStatus('resolved', 0)
  assert.deepEqual(update, { status: 'open' })
  assert.equal(Object.hasOwn(update, 'manually_paused'), false)
})

test('active escalation status forces conversation to escalated without touching manual pause', () => {
  for (const status of ['pending', 'in_progress']) {
    const update = conversationUpdateForEscalationStatus(status)
    assert.deepEqual(update, { status: 'escalated' })
    assert.equal(Object.hasOwn(update, 'manually_paused'), false)
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { captureRuntimeIncident, emitRuntimeIncident } from '../src/lib/reliability/runtime-sensor.mjs'

test('runtime sensor classifies provider timeout without leaking sensitive context', () => {
  const error = Object.assign(new Error('provider timeout'), { name: 'TimeoutError', code: 'ETIMEDOUT' })
  const result = captureRuntimeIncident({
    service: 'agents/orchestrator', operation: 'route-message', status: 503, error,
    provider: 'openai', phase: 'routing',
    context: { sessionId: 'private-session', message: 'private-message', retry: 1 },
  })
  assert.equal(result.incident.type, 'provider_timeout')
  assert.equal(result.incident.severity, 'medium')
  assert.equal(result.incident.context.sessionId, '[REDACTED]')
  assert.equal(result.incident.context.message, '[REDACTED]')
  assert.equal(result.incident.context.retry, 1)
  assert.deepEqual(result.remediation, { action: 'observe', autoMerge: false, autoDeploy: false })
})

test('runtime sensor emits one structured incident record', () => {
  const records = []
  const logger = { error: (...args) => records.push(args) }
  const result = emitRuntimeIncident({ service: 'agents/orchestrator', operation: 'specialist-agent', status: 500, error: new Error('boom') }, logger)
  assert.equal(records.length, 1)
  assert.equal(records[0][0], 'NEURAOPS_INCIDENT')
  assert.equal(JSON.parse(records[0][1]).incident.fingerprint, result.incident.fingerprint)
})

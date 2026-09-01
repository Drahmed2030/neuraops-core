import test from 'node:test'
import assert from 'node:assert/strict'
import { buildIncidentEnvelope, classifyIncident, remediationDisposition } from '../src/lib/reliability/incidents.mjs'

test('incident classifier elevates security and repeated server failures', () => {
  assert.equal(classifyIncident({ type: 'auth_failure' }), 'critical')
  assert.equal(classifyIncident({ status: 500, occurrences: 1 }), 'medium')
  assert.equal(classifyIncident({ status: 503, occurrences: 3 }), 'high')
})

test('incident envelope redacts sensitive context and is fingerprinted', () => {
  const incident = buildIncidentEnvelope({
    incidentId: 'inc-1',
    occurredAt: '2026-09-01T12:00:00.000Z',
    service: 'api/chat',
    operation: 'route-agent',
    type: 'provider_timeout',
    status: 503,
    occurrences: 3,
    correlationId: 'corr-1',
    context: {
      model: 'example-model',
      authorization: 'Bearer secret',
      nested: { token: 'secret-token', retry: 1 },
    },
  })

  assert.equal(incident.severity, 'high')
  assert.equal(incident.context.authorization, '[REDACTED]')
  assert.equal(incident.context.nested.token, '[REDACTED]')
  assert.equal(incident.context.nested.retry, 1)
  assert.match(incident.fingerprint, /^[a-f0-9]{64}$/)
})

test('remediation can request a fix PR but never auto-merges or auto-deploys', () => {
  assert.deepEqual(
    remediationDisposition({ severity: 'high', occurrences: 4 }),
    { action: 'open-fix-pr', autoMerge: false, autoDeploy: false }
  )
  assert.deepEqual(
    remediationDisposition({ severity: 'critical' }),
    { action: 'human-escalation', autoMerge: false, autoDeploy: false }
  )
})

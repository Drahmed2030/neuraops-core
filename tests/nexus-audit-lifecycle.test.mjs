import test from 'node:test'
import assert from 'node:assert/strict'
import { createInMemoryControlPlanePersistence } from '../src/lib/control-plane/in-memory-persistence.mjs'
import { completeNexusAudit, requestNexusReview, startNexusAudit } from '../src/lib/control-plane/nexus-audit-service.mjs'

test('Nexus audit lifecycle persists start, result, priority gaps, and review request in order', async () => {
  const persistence = createInMemoryControlPlanePersistence()
  const base = {
    sourceRef: 'nexus-audit:test-service-1',
    organizationId: 'org-1',
    organizationName: 'Test Practice',
    engagementId: 'eng-1',
  }

  const started = await startNexusAudit(persistence, { ...base, occurredAt: '2026-09-01T00:00:00Z' })
  assert.equal(started.ok, true)
  assert.equal(started.bootstrapCreated, true)

  const completed = await completeNexusAudit(persistence, {
    ...base,
    occurredAt: '2026-09-01T00:05:00Z',
    result: { score: 81, band: 'priority' },
    priorityGaps: ['referral response', 'follow-up completion'],
  })
  assert.equal(completed.ok, true)

  const review = await requestNexusReview(persistence, {
    ...base,
    occurredAt: '2026-09-01T00:06:00Z',
    actorId: 'user-1',
    contactRoute: 'email',
  })
  assert.equal(review.ok, true)

  const bundle = await persistence.loadEngagementBundle('eng-1')
  assert.equal(bundle.engagement.state, 'REVIEW_REQUESTED')
  assert.equal(bundle.version, 3)
  assert.deepEqual(bundle.events.map(event => event.type), ['AUDIT_STARTED', 'AUDIT_COMPLETED', 'REVIEW_REQUESTED'])
  assert.equal(bundle.events[1].payload.result.score, 81)
  assert.equal(bundle.events[1].payload.priorityGaps.length, 2)
})

test('repeating the same audit start is idempotent', async () => {
  const persistence = createInMemoryControlPlanePersistence()
  const input = {
    sourceRef: 'nexus-audit:test-service-2',
    organizationId: 'org-2',
    organizationName: 'Test Practice 2',
    engagementId: 'eng-2',
    occurredAt: '2026-09-01T00:00:00Z',
  }
  const first = await startNexusAudit(persistence, input)
  const retry = await startNexusAudit(persistence, input)
  assert.equal(first.ok, true)
  assert.equal(retry.ok, true)
  assert.equal(retry.duplicate, true)
  const bundle = await persistence.loadEngagementBundle('eng-2')
  assert.equal(bundle.version, 1)
  assert.equal(bundle.events.length, 1)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { createInMemoryControlPlanePersistence } from '../src/lib/control-plane/in-memory-persistence.mjs'
import { createBookingAdapterMock } from '../src/lib/control-plane/mock-booking-adapter.mjs'
import { createReviewBookingService } from '../src/lib/control-plane/review-booking-service.mjs'

const clock = () => new Date('2026-09-01T01:00:00Z')

function seed(state = 'REVIEW_REQUESTED') {
  return {
    engagement: {
      engagementId: 'eng-review-1',
      organizationId: 'org-review-1',
      product: 'nexus',
      kind: 'review',
      state,
    },
    events: [],
    entitlements: [],
    payments: [],
    version: 0,
  }
}

test('review booking writes REVIEW_BOOKED after external booking succeeds', async () => {
  const persistence = createInMemoryControlPlanePersistence([seed()])
  const booking = createBookingAdapterMock()
  const service = createReviewBookingService({ persistence, booking, clock })

  const result = await service.bookReview({
    engagementId: 'eng-review-1',
    startsAt: '2026-09-02T15:00:00Z',
    durationMinutes: 30,
    contactEmail: 'test@example.com',
  })

  assert.equal(result.ok, true)
  assert.equal(booking.calls.length, 1)
  const bundle = await persistence.loadEngagementBundle('eng-review-1')
  assert.equal(bundle.engagement.state, 'REVIEW_BOOKED')
  assert.equal(bundle.events[0].type, 'REVIEW_BOOKED')
  assert.equal(bundle.events[0].payload.bookingId, result.booking.bookingId)
})

test('failed Control Plane commit compensates by cancelling external booking', async () => {
  const real = createInMemoryControlPlanePersistence([seed()])
  const booking = createBookingAdapterMock()
  const persistence = {
    loadEngagementBundle: (...args) => real.loadEngagementBundle(...args),
    commitLifecycle: async () => ({ ok: false, reason: 'version_conflict', currentVersion: 1 }),
  }
  const service = createReviewBookingService({ persistence, booking, clock })

  const result = await service.bookReview({
    engagementId: 'eng-review-1',
    startsAt: '2026-09-02T15:00:00Z',
  })

  assert.equal(result.ok, false)
  assert.equal(result.compensated, true)
  assert.equal(booking.calls.length, 1)
  assert.equal(booking.cancellations.length, 1)
})

test('review completion and pilot proposal advance lifecycle in order', async () => {
  const persistence = createInMemoryControlPlanePersistence([seed('REVIEW_BOOKED')])
  const booking = createBookingAdapterMock()
  const service = createReviewBookingService({ persistence, booking, clock })

  const completed = await service.completeReview({
    engagementId: 'eng-review-1',
    outcome: { recommendation: 'pilot' },
  })
  assert.equal(completed.ok, true)

  let bundle = await persistence.loadEngagementBundle('eng-review-1')
  assert.equal(bundle.engagement.state, 'REVIEW_COMPLETED')

  const proposed = await service.proposePilot({
    engagementId: 'eng-review-1',
    proposal: { amountMinor: 250000, currency: 'SAR', durationDays: 14 },
  })
  assert.equal(proposed.ok, true)

  bundle = await persistence.loadEngagementBundle('eng-review-1')
  assert.equal(bundle.engagement.state, 'PILOT_PROPOSED')
  assert.deepEqual(bundle.events.map(event => event.type), ['REVIEW_COMPLETED', 'PILOT_PROPOSED'])
})

test('booking is rejected before REVIEW_REQUESTED without calling external adapter', async () => {
  const persistence = createInMemoryControlPlanePersistence([seed('AUDIT_COMPLETED')])
  const booking = createBookingAdapterMock()
  const service = createReviewBookingService({ persistence, booking, clock })

  const result = await service.bookReview({
    engagementId: 'eng-review-1',
    startsAt: '2026-09-02T15:00:00Z',
  })

  assert.equal(result.ok, false)
  assert.equal(booking.calls.length, 0)
})

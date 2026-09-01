import test from 'node:test'
import assert from 'node:assert/strict'
import { createGoogleCalendarBookingAdapter } from '../src/lib/control-plane/google-calendar-booking-adapter.mjs'

function fakeCalendar(overrides = {}) {
  const calls = []
  return {
    calls,
    async findByPrivateKey(input) { calls.push(['find', input]); return overrides.existing ?? null },
    async isAvailable(input) { calls.push(['availability', input]); return overrides.available ?? true },
    async createEvent(input) {
      calls.push(['create', input])
      return overrides.created ?? { id: 'evt-1', startTime: input.startTime, meetLink: 'https://meet.invalid/dev' }
    },
    async deleteEvent(input) { calls.push(['delete', input]); if (overrides.deleteFails) throw new Error('delete_failed') },
  }
}

test('creates Google Calendar review booking only after availability check', async () => {
  const calendar = fakeCalendar()
  const adapter = createGoogleCalendarBookingAdapter({ calendarClient: calendar })
  const result = await adapter.createReviewBooking({
    organizationId: 'org-1', engagementId: 'eng-1', startsAt: '2026-09-02T15:00:00+03:00', durationMinutes: 30,
  })
  assert.equal(result.status, 'confirmed')
  assert.equal(result.bookingId, 'evt-1')
  assert.deepEqual(calendar.calls.map(([name]) => name), ['find', 'availability', 'create'])
})

test('idempotent retry returns existing event and skips availability/create', async () => {
  const calendar = fakeCalendar({ existing: { id: 'evt-existing', startTime: '2026-09-02T12:00:00.000Z' } })
  const adapter = createGoogleCalendarBookingAdapter({ calendarClient: calendar })
  const result = await adapter.createReviewBooking({
    organizationId: 'org-1', engagementId: 'eng-1', startsAt: '2026-09-02T15:00:00+03:00', durationMinutes: 30,
  })
  assert.equal(result.duplicate, true)
  assert.equal(result.bookingId, 'evt-existing')
  assert.deepEqual(calendar.calls.map(([name]) => name), ['find'])
})

test('calendar conflict prevents event creation', async () => {
  const calendar = fakeCalendar({ available: false })
  const adapter = createGoogleCalendarBookingAdapter({ calendarClient: calendar })
  const result = await adapter.createReviewBooking({
    organizationId: 'org-1', engagementId: 'eng-1', startsAt: '2026-09-02T15:00:00+03:00', durationMinutes: 30,
  })
  assert.equal(result.status, 'conflict')
  assert.equal(result.bookingId, null)
  assert.deepEqual(calendar.calls.map(([name]) => name), ['find', 'availability'])
})

test('compensation cancellation is observable and fails closed', async () => {
  const okCalendar = fakeCalendar()
  const okAdapter = createGoogleCalendarBookingAdapter({ calendarClient: okCalendar })
  assert.deepEqual(await okAdapter.cancelReviewBooking('evt-1'), { ok: true })

  const failingCalendar = fakeCalendar({ deleteFails: true })
  const failingAdapter = createGoogleCalendarBookingAdapter({ calendarClient: failingCalendar })
  assert.deepEqual(await failingAdapter.cancelReviewBooking('evt-1'), { ok: false })
})

function assertDate(value, label) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`invalid_${label}`)
  return date
}

function eventKey(input) {
  return `nexus-review:${input.engagementId}`
}

/**
 * Adapter over an injected Google Calendar client.
 * The injected client is responsible for OAuth/token handling and must remain server-only.
 * Expected client contract:
 *   findByPrivateKey({ calendarId, key }) -> event | null
 *   isAvailable({ calendarId, startTime, endTime }) -> boolean
 *   createEvent({ calendarId, ... }) -> { id, startTime, endTime, htmlLink?, meetLink? }
 *   deleteEvent({ calendarId, eventId }) -> void
 */
export function createGoogleCalendarBookingAdapter({ calendarClient, calendarId = 'primary', timezone = 'Asia/Riyadh' }) {
  if (!calendarClient || typeof calendarClient.createEvent !== 'function') {
    throw new Error('invalid_calendar_client')
  }
  if (typeof calendarClient.findByPrivateKey !== 'function' || typeof calendarClient.isAvailable !== 'function') {
    throw new Error('calendar_client_missing_idempotency_or_availability')
  }
  if (typeof calendarClient.deleteEvent !== 'function') {
    throw new Error('calendar_client_missing_delete')
  }

  return {
    provider: 'google_calendar',

    async createReviewBooking(input) {
      if (!input?.organizationId || !input?.engagementId || !input?.startsAt) {
        throw new Error('invalid_booking_request')
      }
      const durationMinutes = Number(input.durationMinutes)
      if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 120) {
        throw new Error('invalid_booking_duration')
      }

      const start = assertDate(input.startsAt, 'booking_start')
      const end = new Date(start.getTime() + durationMinutes * 60_000)
      const key = eventKey(input)

      const existing = await calendarClient.findByPrivateKey({ calendarId, key })
      if (existing) {
        return {
          bookingId: existing.id,
          startsAt: existing.startTime,
          status: 'confirmed',
          duplicate: true,
          provider: 'google_calendar',
          meetLink: existing.meetLink ?? null,
        }
      }

      const available = await calendarClient.isAvailable({
        calendarId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })
      if (!available) {
        return { bookingId: null, startsAt: start.toISOString(), status: 'conflict', duplicate: false, provider: 'google_calendar' }
      }

      const created = await calendarClient.createEvent({
        calendarId,
        title: 'Nexus operational review',
        description: 'Development booking created by Nexus Control Plane. No patient data.',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        timezone,
        attendeeEmail: input.contactEmail ?? null,
        privateKey: key,
        addMeet: true,
      })

      if (!created?.id) throw new Error('calendar_event_creation_failed')
      return {
        bookingId: created.id,
        startsAt: created.startTime ?? start.toISOString(),
        status: 'confirmed',
        duplicate: false,
        provider: 'google_calendar',
        meetLink: created.meetLink ?? null,
      }
    },

    async cancelReviewBooking(bookingId) {
      if (!bookingId) return { ok: false }
      try {
        await calendarClient.deleteEvent({ calendarId, eventId: bookingId })
        return { ok: true }
      } catch {
        return { ok: false }
      }
    },
  }
}

export function createBookingAdapterMock(options = {}) {
  const calls = []
  const cancellations = []
  const prefix = options.prefix ?? 'booking-mock'

  return {
    calls,
    cancellations,

    async createReviewBooking(input) {
      calls.push(structuredClone(input))
      if (!input?.organizationId || !input?.engagementId || !input?.startsAt || !input?.durationMinutes) {
        throw new Error('invalid_booking_request')
      }

      return {
        bookingId: `${prefix}:${input.engagementId}:${calls.length}`,
        startsAt: input.startsAt,
        status: 'confirmed',
      }
    },

    async cancelReviewBooking(bookingId) {
      cancellations.push(bookingId)
      return { ok: true }
    },
  }
}

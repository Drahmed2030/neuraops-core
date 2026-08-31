function nowIso(clock) {
  return (clock ? clock() : new Date()).toISOString()
}

export function createReviewBookingService({ persistence, booking, clock }) {
  if (!persistence?.loadEngagementBundle || !persistence?.commitLifecycle) {
    throw new Error('invalid_persistence_port')
  }
  if (!booking?.createReviewBooking) throw new Error('invalid_booking_port')

  async function bookReview({ engagementId, startsAt, durationMinutes = 30, contactEmail, actorId = 'system' }) {
    const bundle = await persistence.loadEngagementBundle(engagementId)
    if (!bundle) return { ok: false, reason: 'engagement_not_found' }
    if (bundle.engagement.state !== 'REVIEW_REQUESTED') {
      return { ok: false, reason: 'review_not_requestable_from_current_state', state: bundle.engagement.state }
    }

    const external = await booking.createReviewBooking({
      organizationId: bundle.engagement.organizationId,
      engagementId,
      startsAt,
      durationMinutes,
      contactEmail,
    })

    const event = {
      eventId: `review-booking:${external.bookingId}:confirmed`,
      type: 'REVIEW_BOOKED',
      occurredAt: nowIso(clock),
      organizationId: bundle.engagement.organizationId,
      engagementId,
      actor: { type: actorId === 'system' ? 'system' : 'operator', ...(actorId === 'system' ? {} : { actorId }) },
      payload: {
        bookingId: external.bookingId,
        startsAt: external.startsAt,
        status: external.status,
        durationMinutes,
      },
    }

    const committed = await persistence.commitLifecycle({
      engagement: bundle.engagement,
      event,
      expectedVersion: bundle.version,
    })

    if (!committed.ok) {
      // Best-effort compensation: if the Control Plane cannot record the booking,
      // cancel the external booking so the two systems do not silently diverge.
      if (typeof booking.cancelReviewBooking === 'function') {
        await booking.cancelReviewBooking(external.bookingId)
      }
      return { ok: false, reason: committed.reason, compensated: true }
    }

    return {
      ok: true,
      booking: external,
      version: committed.version,
      duplicate: committed.duplicate,
    }
  }

  async function completeReview({ engagementId, outcome = {}, actorId = 'system' }) {
    const bundle = await persistence.loadEngagementBundle(engagementId)
    if (!bundle) return { ok: false, reason: 'engagement_not_found' }

    const event = {
      eventId: `review:${engagementId}:completed`,
      type: 'REVIEW_COMPLETED',
      occurredAt: nowIso(clock),
      organizationId: bundle.engagement.organizationId,
      engagementId,
      actor: { type: actorId === 'system' ? 'system' : 'operator', ...(actorId === 'system' ? {} : { actorId }) },
      payload: { outcome },
    }

    return persistence.commitLifecycle({
      engagement: bundle.engagement,
      event,
      expectedVersion: bundle.version,
    })
  }

  async function proposePilot({ engagementId, proposal = {}, actorId = 'system' }) {
    const bundle = await persistence.loadEngagementBundle(engagementId)
    if (!bundle) return { ok: false, reason: 'engagement_not_found' }

    const event = {
      eventId: `pilot:${engagementId}:proposed`,
      type: 'PILOT_PROPOSED',
      occurredAt: nowIso(clock),
      organizationId: bundle.engagement.organizationId,
      engagementId,
      actor: { type: actorId === 'system' ? 'system' : 'operator', ...(actorId === 'system' ? {} : { actorId }) },
      payload: { proposal },
    }

    return persistence.commitLifecycle({
      engagement: bundle.engagement,
      event,
      expectedVersion: bundle.version,
    })
  }

  return { bookReview, completeReview, proposePilot }
}

function comparableEvent(event) {
  return {
    eventId: event.eventId,
    type: event.type,
    occurredAt: event.occurredAt,
    organizationId: event.organizationId,
    engagementId: event.engagementId ?? null,
    actor: event.actor,
    payload: event.payload ?? {},
  }
}

export function findEventById(events, eventId) {
  return events.find(item => item.eventId === eventId) ?? null
}

export function sameEvent(left, right) {
  if (!left || !right) return false
  return JSON.stringify(comparableEvent(left)) === JSON.stringify(comparableEvent(right))
}

export function appendEvent(events, event) {
  if (!event?.eventId || !event?.type || !event?.occurredAt || !event?.organizationId || !event?.actor) {
    return { ok: false, reason: 'invalid_event' }
  }

  const existing = findEventById(events, event.eventId)
  if (existing) {
    if (!sameEvent(existing, event)) {
      return { ok: false, reason: 'event_id_conflict', existing }
    }
    return { ok: true, created: false, events, existing }
  }

  return { ok: true, created: true, events: [...events, event] }
}

export function eventsForEngagement(events, engagementId) {
  return events
    .filter(event => event.engagementId === engagementId)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
}

export function latestEvent(events, type, engagementId) {
  return eventsForEngagement(events, engagementId)
    .filter(event => event.type === type)
    .at(-1) ?? null
}

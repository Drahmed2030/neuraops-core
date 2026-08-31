export function appendEvent(events, event) {
  if (!event?.eventId || !event?.type || !event?.occurredAt || !event?.organizationId || !event?.actor) {
    return { ok: false, reason: 'invalid_event' }
  }

  const existing = events.find(item => item.eventId === event.eventId)
  if (existing) return { ok: true, created: false, events }

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

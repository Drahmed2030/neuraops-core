const transitions = {
  LEAD: { AUDIT_STARTED: 'AUDIT_STARTED' },
  AUDIT_STARTED: { AUDIT_COMPLETED: 'AUDIT_COMPLETED' },
  AUDIT_COMPLETED: { REVIEW_REQUESTED: 'REVIEW_REQUESTED' },
  REVIEW_REQUESTED: { REVIEW_BOOKED: 'REVIEW_BOOKED' },
  REVIEW_BOOKED: { REVIEW_COMPLETED: 'REVIEW_COMPLETED' },
  REVIEW_COMPLETED: { PILOT_PROPOSED: 'PILOT_PROPOSED' },
  PILOT_PROPOSED: { PAYMENT_REQUESTED: 'PAYMENT_PENDING' },
  PAYMENT_PENDING: { PAYMENT_RECEIVED: 'PAYMENT_CONFIRMED' },
  PAYMENT_CONFIRMED: { ENTITLEMENT_GRANTED: 'PILOT_READY' },
  PILOT_READY: { PILOT_STARTED: 'PILOT_ACTIVE' },
  PILOT_ACTIVE: {
    CHECKPOINT_COMPLETED: 'CHECKPOINT_COMPLETED',
    OUTCOME_RECORDED: 'OUTCOME_RECORDED',
  },
  CHECKPOINT_COMPLETED: { OUTCOME_RECORDED: 'OUTCOME_RECORDED' },
  OUTCOME_RECORDED: {
    ENGAGEMENT_RENEWED: 'RENEWED',
    ENGAGEMENT_CLOSED: 'CLOSED',
  },
  RENEWED: { ENGAGEMENT_CLOSED: 'CLOSED' },
}

export function transitionEngagement(from, event) {
  const to = transitions[from]?.[event]
  if (!to) return { ok: false, from, event, reason: 'transition_not_allowed' }
  return { ok: true, from, to, event }
}

export function canTransition(from, event) {
  return Boolean(transitions[from]?.[event])
}

export function allowedEvents(from) {
  return Object.keys(transitions[from] ?? {})
}

const transitions = {
  LEAD: { AUDIT_STARTED: 'AUDIT_STARTED' },
  AUDIT_STARTED: { AUDIT_COMPLETED: 'AUDIT_COMPLETED' },
  AUDIT_COMPLETED: { REVIEW_REQUESTED: 'REVIEW_REQUESTED' },
  REVIEW_REQUESTED: { REVIEW_BOOKED: 'REVIEW_BOOKED' },
  REVIEW_BOOKED: { REVIEW_COMPLETED: 'REVIEW_COMPLETED' },
  REVIEW_COMPLETED: { PILOT_PROPOSED: 'PILOT_PROPOSED' },
  PILOT_PROPOSED: { PAYMENT_REQUESTED: 'PAYMENT_PENDING' },
  PAYMENT_PENDING: { PAYMENT_RECEIVED: 'PAYMENT_CONFIRMED' },
  PILOT_READY: { PILOT_STARTED: 'PILOT_ACTIVE' },
  PILOT_ACTIVE: {
    BASELINE_CAPTURED: 'PILOT_ACTIVE',
    CHECKPOINT_COMPLETED: 'CHECKPOINT_COMPLETED',
    OUTCOME_RECORDED: 'OUTCOME_RECORDED',
  },
  CHECKPOINT_COMPLETED: { OUTCOME_RECORDED: 'OUTCOME_RECORDED' },
  OUTCOME_RECORDED: {
    ENGAGEMENT_RENEWED: 'RENEWED',
    ENGAGEMENT_CLOSED: 'CLOSED',
  },
  SUBSCRIPTION_ACTIVE: {
    ENGAGEMENT_RENEWED: 'SUBSCRIPTION_ACTIVE',
    ENGAGEMENT_CLOSED: 'CLOSED',
  },
  RENEWED: { ENGAGEMENT_CLOSED: 'CLOSED' },
}

export function transitionEngagement(from, event, kind = 'pilot') {
  if (from === 'PAYMENT_CONFIRMED' && event === 'ENTITLEMENT_GRANTED') {
    const to = kind === 'subscription' ? 'SUBSCRIPTION_ACTIVE' : 'PILOT_READY'
    return { ok: true, from, to, event }
  }
  const to = transitions[from]?.[event]
  if (!to) return { ok: false, from, event, reason: 'transition_not_allowed' }
  return { ok: true, from, to, event }
}

export function canTransition(from, event, kind = 'pilot') {
  return transitionEngagement(from, event, kind).ok
}

export function allowedEvents(from) {
  if (from === 'PAYMENT_CONFIRMED') return ['ENTITLEMENT_GRANTED']
  return Object.keys(transitions[from] ?? {})
}

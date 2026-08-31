import type { ControlPlaneEventType, EngagementState } from './contracts'

const transitions: Partial<Record<EngagementState, Partial<Record<ControlPlaneEventType, EngagementState>>>> = {
  LEAD: {
    AUDIT_STARTED: 'AUDIT_STARTED',
  },
  AUDIT_STARTED: {
    AUDIT_COMPLETED: 'AUDIT_COMPLETED',
  },
  AUDIT_COMPLETED: {
    REVIEW_REQUESTED: 'REVIEW_REQUESTED',
  },
  REVIEW_REQUESTED: {
    REVIEW_BOOKED: 'REVIEW_BOOKED',
  },
  REVIEW_BOOKED: {
    REVIEW_COMPLETED: 'REVIEW_COMPLETED',
  },
  REVIEW_COMPLETED: {
    PILOT_PROPOSED: 'PILOT_PROPOSED',
  },
  PILOT_PROPOSED: {
    PAYMENT_REQUESTED: 'PAYMENT_PENDING',
  },
  PAYMENT_PENDING: {
    PAYMENT_RECEIVED: 'PILOT_ACTIVE',
  },
  PILOT_ACTIVE: {
    CHECKPOINT_COMPLETED: 'CHECKPOINT_COMPLETED',
    OUTCOME_RECORDED: 'OUTCOME_RECORDED',
  },
  CHECKPOINT_COMPLETED: {
    OUTCOME_RECORDED: 'OUTCOME_RECORDED',
  },
  OUTCOME_RECORDED: {
    ENGAGEMENT_RENEWED: 'RENEWED',
    ENGAGEMENT_CLOSED: 'CLOSED',
  },
  RENEWED: {
    ENGAGEMENT_CLOSED: 'CLOSED',
  },
}

export type TransitionResult =
  | { ok: true; from: EngagementState; to: EngagementState; event: ControlPlaneEventType }
  | { ok: false; from: EngagementState; event: ControlPlaneEventType; reason: 'transition_not_allowed' }

export function transitionEngagement(
  from: EngagementState,
  event: ControlPlaneEventType,
): TransitionResult {
  const to = transitions[from]?.[event]
  if (!to) {
    return { ok: false, from, event, reason: 'transition_not_allowed' }
  }

  return { ok: true, from, to, event }
}

export function canTransition(from: EngagementState, event: ControlPlaneEventType): boolean {
  return Boolean(transitions[from]?.[event])
}

export function allowedEvents(from: EngagementState): ControlPlaneEventType[] {
  return Object.keys(transitions[from] ?? {}) as ControlPlaneEventType[]
}

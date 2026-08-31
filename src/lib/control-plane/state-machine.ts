import type { ControlPlaneEventType, EngagementKind, EngagementState } from './contracts'
import {
  allowedEvents as allowedEventsRuntime,
  canTransition as canTransitionRuntime,
  transitionEngagement as transitionEngagementRuntime,
} from './state-machine.mjs'

export type TransitionResult =
  | { ok: true; from: EngagementState; to: EngagementState; event: ControlPlaneEventType }
  | { ok: false; from: EngagementState; event: ControlPlaneEventType; reason: 'transition_not_allowed' }

export function transitionEngagement(
  from: EngagementState,
  event: ControlPlaneEventType,
  kind: EngagementKind = 'pilot',
): TransitionResult {
  return transitionEngagementRuntime(from, event, kind) as TransitionResult
}

export function canTransition(
  from: EngagementState,
  event: ControlPlaneEventType,
  kind: EngagementKind = 'pilot',
): boolean {
  return canTransitionRuntime(from, event, kind)
}

export function allowedEvents(from: EngagementState): ControlPlaneEventType[] {
  return allowedEventsRuntime(from) as ControlPlaneEventType[]
}

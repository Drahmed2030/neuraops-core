# Nexus Pilot Composite — Product Contract v0.1

## Purpose

This is the first integrated product surface built on the NeuraOps × Cliniverse Unified Design System. It intentionally validates the customer journey before introducing the shared Control Plane backend.

## Customer flow

Audit → Result → Priority Gaps → 14-Day Plan → Review CTA

The current composite is a product/specification scaffold. It must not imply that payment, scheduling, pilot activation, or entitlement automation exists until those backend contracts are implemented.

## Audit boundaries

- Operational metrics only.
- No patient data.
- No clinical decisions.
- No passwords, API keys, credentials, or payment-card data.
- An operational estimate is sufficient for validation.

## Six audit inputs

1. Referral volume / month
2. Median referral response time
3. Unresolved referral backlog
4. Follow-up completion rate
5. No-show / leakage signal
6. Locations / handoff points

## Result contract

The product should return:

- three priority operational gaps;
- a concise reason each gap matters;
- one focused 14-day plan;
- an explicit 30-minute operational review CTA.

The result is operational guidance, not a clinical decision.

## Control Plane event contracts surfaced by the composite

### AUDIT_STARTED

Transition the associated engagement to `AUDIT_STARTED`.

### AUDIT_COMPLETED

Persist the audit result, three priority gaps, and generated 14-day action plan. Transition the engagement to `AUDIT_COMPLETED`.

### REVIEW_REQUESTED

Record explicit review intent against the same engagement.

### REVIEW_BOOKED

Link a scheduled review to the engagement. This event must only occur after an actual booking is confirmed by the scheduling integration or approved manual workflow.

### PILOT_PROPOSED

Create a proposed pilot only after the operational review confirms a real, measurable problem that can be addressed within 14 days.

## Future states intentionally not implemented in this branch

- PAYMENT_PENDING
- PAYMENT_RECEIVED
- ENTITLEMENT_GRANTED
- PILOT_ACTIVE
- CHECKPOINT_COMPLETED
- OUTCOME_RECORDED
- RENEWED
- CLOSED

These belong to `platform/control-plane-v0.1` after the composite UI and product contract are validated.

## Shared UI primitives used

- Button
- Input
- Card
- KPI Card
- Status Badge
- Alert

## Engineering rules

- Reuse the shared primitives; do not recreate visual patterns inline unless composition requires a layout container.
- Preserve EN/AR and RTL capability.
- Preserve light/dark semantics.
- Do not write to `main` directly.
- Do not deploy this scaffold to production until the real audit data contract and review action are wired.
- Do not add payment logic in this branch.

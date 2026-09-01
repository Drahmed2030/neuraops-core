# Control Plane Execution Backlog v0.1

This file prevents feature work from hiding unfinished delivery gates.

## DONE — latest verified development work
- Renewal & Expansion Engine derives recommendations from persisted Proof Snapshot.
- Renewal recommendation is persisted immutably with policy version and proof summary.
- Recommendation remains separate from customer acceptance, payment, renewal, and entitlement changes.
- Nexus Audit UI integration now supports development-only Audit submit, persisted result, and Review Request.
- Browser never receives service-role credentials; Control Plane access stays server-only.
- Nexus public submission path is rate-limited, idempotent, and fails closed outside CONTROL_PLANE_ENV=development.

## NEXT — required delivery gate
1. Booking adapter — real non-production integration
   - Replace mock with a real calendar/booking sandbox or approved provider.
   - Preserve compensation behavior when Control Plane commit fails.
   - Only after booking confirmation should REVIEW_BOOKED be persisted.

## DEFERRED BUT REQUIRED BEFORE PRODUCTION READINESS
2. B2B payment adapter — real sandbox
   - Replace B2B mock with approved provider sandbox only after legal/KYC path is ready.
   - Checkout correlation must succeed before returning checkout URL.
   - Webhook signature verification required before settlement.

3. Cliniverse subscription wiring
   - Apple StoreKit/App Store transaction verification adapter.
   - Consumer iOS digital access remains Apple IAP.
   - Verified Apple transaction -> Control Plane settlement -> Cliniverse entitlement -> SUBSCRIPTION_ACTIVE.

4. Full repository verification
   - Run npm test on the branch in CI/checkout.
   - Run lint/typecheck/build.
   - Fix all regressions before PR/release consideration.

5. Supabase hardening / migration hygiene
   - Re-run security/performance advisors after final schema changes.
   - Generate/retain clean migration history.
   - No merge of development branch into production without explicit approval.

6. Nexus production UI hardening
   - Replace development audit policy environment with an approved, versioned commercial policy.
   - Review copy, abuse controls, telemetry, error UX, accessibility, and retention/privacy behavior.
   - Booking and payment CTAs remain disabled until their real non-production integrations pass.

## PRODUCTION GATES
- No production DB migration before explicit approval.
- No GitHub merge before explicit approval.
- No live payment provider before legal/KYC readiness and explicit approval.
- No PHI or patient-identifying data in Control Plane.
- No service-role secret in browser/client code.
- No recommendation automatically renews, charges, or extends entitlement.

## Execution order from here
Real booking sandbox -> B2B payment sandbox -> Cliniverse Apple subscription wiring -> full CI/build gate -> production review.

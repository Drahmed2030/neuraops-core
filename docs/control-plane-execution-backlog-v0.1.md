# Control Plane Execution Backlog v0.1

This file prevents feature work from hiding unfinished delivery gates.

## NOW — current platform work
- Renewal & Expansion Engine from persisted Proof Snapshot.
- Persist the recommendation with policy/version and immutable evidence reference.
- Keep recommendation separate from customer acceptance and payment.

## DEFERRED BUT REQUIRED BEFORE PRODUCTION READINESS
1. Nexus Composite UI integration
   - Wire Audit submit/result/review request to NexusAuditService.
   - No browser-side service-role usage.
   - Dev/preview environment first.

2. Booking adapter — real non-production integration
   - Replace mock with a real calendar/booking sandbox or approved provider.
   - Preserve compensation behavior when Control Plane commit fails.

3. B2B payment adapter — real sandbox
   - Replace B2B mock with approved provider sandbox only after legal/KYC path is ready.
   - Checkout correlation must succeed before returning checkout URL.
   - Webhook signature verification required before settlement.

4. Cliniverse subscription wiring
   - Apple StoreKit/App Store transaction verification adapter.
   - Consumer iOS digital access remains Apple IAP.
   - Verified Apple transaction -> Control Plane settlement -> Cliniverse entitlement -> SUBSCRIPTION_ACTIVE.

5. Full repository verification
   - Run npm test on the branch in CI/checkout.
   - Run lint/typecheck/build.
   - Fix all regressions before PR/release consideration.

6. Supabase hardening / migration hygiene
   - Re-run security/performance advisors after final schema changes.
   - Generate/retain clean migration history.
   - No merge of development branch into production without explicit approval.

## PRODUCTION GATES
- No production DB migration before explicit approval.
- No GitHub merge before explicit approval.
- No live payment provider before legal/KYC readiness and explicit approval.
- No PHI or patient-identifying data in Control Plane.
- No service-role secret in browser/client code.

## Order after Renewal Engine
Nexus UI integration -> real booking sandbox -> B2B payment sandbox -> Cliniverse Apple subscription wiring -> full CI/build gate -> production review.

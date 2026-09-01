# Control Plane Execution Backlog v0.1

This file prevents feature work from hiding unfinished delivery gates.

## DONE — latest verified development work
- Renewal & Expansion Engine derives recommendations from persisted Proof Snapshot.
- Renewal recommendation is persisted immutably with policy version and proof summary.
- Recommendation remains separate from customer acceptance, payment, renewal, and entitlement changes.
- Nexus Audit UI integration supports development-only Audit submit, persisted result, and Review Request.
- Browser never receives service-role credentials; Control Plane access stays server-only.
- Nexus public submission path is rate-limited, idempotent, and fails closed outside CONTROL_PLANE_ENV=development.
- Google Calendar booking adapter boundary is implemented with availability check, idempotent external reference, and compensation cancellation.
- Booking adapter unit tests cover create, retry, conflict, and cancellation behavior.
- Full repository verification is green from repository state: strict npm ci, 91/91 tests, TypeScript check, and Next.js production build.
- Supabase dependency pair is pinned and package-lock.json is synchronized: @supabase/ssr 0.12.4 + @supabase/supabase-js 2.112.4 on Node 22.
- OpenAI clients in LeadOps, Router, RAG, and Specialist paths are initialized lazily at request-time so builds require no production API secret.
- Supabase Development branch drift was reconciled: legacy NeuraOps baseline restored, branch rebased on Production, and official reliability_gate + leadops_mvp migrations now precede Control Plane migrations.
- Development branch status is FUNCTIONS_DEPLOYED / ACTIVE_HEALTHY and Control Plane synthetic evidence survived the rebase.
- Legacy DB hardening v0.1 removed mutable match_documents search_path, missing FK indexes, and auth.uid() per-row RLS performance warnings.

## NEXT — required delivery gate
1. Booking adapter — live non-production verification
   - Run one explicit test booking against an approved calendar only when a concrete test date/time is authorized.
   - Verify Google Meet/event metadata and cancellation compensation against the real provider.
   - Only after that live test should this gate be marked DONE.

## DEFERRED BUT REQUIRED BEFORE PRODUCTION READINESS
2. B2B payment adapter — real sandbox
   - Replace B2B mock with approved provider sandbox only after legal/KYC path is ready.
   - Checkout correlation must succeed before returning checkout URL.
   - Webhook signature verification required before settlement.

3. Cliniverse subscription wiring
   - Apple StoreKit/App Store transaction verification adapter.
   - Consumer iOS digital access remains Apple IAP.
   - Verified Apple transaction -> Control Plane settlement -> Cliniverse entitlement -> SUBSCRIPTION_ACTIVE.

4. Supabase production migration hygiene
   - Production legacy baseline 001–006 is not fully represented in the historical migration ledger; do not create another branch assuming the ledger alone is a full schema baseline.
   - Prepare a future-safe baseline reconciliation plan before production migration changes.
   - Remaining security WARN: vector extension is installed in public; defer moving it until RAG type/function/index dependencies are migration-tested.
   - Control Plane RLS-without-policy INFO is intentional deny-by-default; direct anon/authenticated access stays revoked.
   - No merge of development branch into production without explicit approval.

5. Nexus production UI hardening
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
Live booking verification -> B2B payment sandbox -> Cliniverse Apple subscription wiring -> Supabase production-baseline plan -> Nexus production UI hardening -> production review.

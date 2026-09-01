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
- Booking live non-production verification is complete: availability checked, temporary private event created, Google Meet provisioned successfully, and the test event deleted after verification.
- Full repository verification is green from repository state: strict npm ci, unit/domain tests, TypeScript check, and Next.js production build.
- Supabase Development branch drift was reconciled and legacy DB hardening v0.1 removed the low-risk advisor findings targeted in Development.
- Evidence & Provenance Guard v0.1 is implemented and verified.
- Provider-neutral Webhook Trust Boundary v0.1 is implemented and CI-verified.
- Moyasar B2B sandbox adapter is CODE-READY using hosted invoices, provider-first settlement, service-role-only provider-reference lookup, server-side reconciliation, and a development-only webhook route.
- Latest payment integration verification passed strict install, 108/108 tests, TypeScript, and Next.js production build.
- ADR-005 through ADR-008 now preserve provider independence, healthcare data boundaries, evidence-backed commercial decisions, and defense-in-depth for sensitive transitions.

## NEXT — required delivery gate
1. Cliniverse subscription wiring
   - Build the real Apple verification boundary behind the existing `apple_iap` commerce rail.
   - Consumer iOS digital access remains Apple IAP.
   - Verify signed App Store transaction/subscription data server-side before any Control Plane settlement.
   - Correlate verified Apple transaction/original transaction identity with the expected Cliniverse subscription/payment record.
   - Verified Apple transaction -> Control Plane settlement -> `cliniverse.core` entitlement -> `SUBSCRIPTION_ACTIVE`.
   - Add explicit refund/revocation/expiration handling before production readiness; a previously paid transaction must not imply perpetual access.
   - Keep clinical data outside Control Plane; only subscription/entitlement lifecycle data crosses this boundary.

## OPERATIONAL FALLBACK — does not block NEXT
2. Nexus manual bank-transfer rail
   - Keep Moyasar code intact and provider-independent.
   - First paid pilot may use `manual_invoice` / bank transfer if that is operationally simpler.
   - Human/operator verification of bank receipt must be auditable before `PAYMENT_RECEIVED`; never auto-grant access from a screenshot or user claim.
   - Bank-transfer support must reuse existing Payment Intent -> Settlement -> Entitlement -> Activation architecture rather than create a parallel payment system.

## DEFERRED BUT REQUIRED BEFORE PRODUCTION READINESS
3. B2B gateway live sandbox / production
   - Moyasar live sandbox cycle is deferred, not deleted.
   - Resume only when test credentials/preview webhook setup reduces burden or is needed for scale.
   - No live provider before legal/KYC readiness and explicit approval.
   - Production webhook handling should add a durable inbox/queue so provider 2xx acknowledgment is decoupled from complex settlement work.

4. Supabase production migration hygiene
   - Production legacy baseline 001–006 is not fully represented in the historical migration ledger; do not create another branch assuming the ledger alone is a full schema baseline.
   - Prepare a future-safe baseline reconciliation plan before production migration changes.
   - Remaining security WARN: vector extension is installed in public; defer moving it until RAG type/function/index dependencies are migration-tested.
   - Control Plane RLS-without-policy INFO is intentional deny-by-default; direct anon/authenticated access stays revoked.
   - No merge of development branch into production without explicit approval.

5. Nexus production UI hardening
   - Replace development audit policy environment with an approved, versioned commercial policy.
   - Review copy, abuse controls, telemetry, error UX, accessibility, and retention/privacy behavior.
   - Payment UX may present approved manual-transfer instructions before gateway automation is resumed.

## FEATURE CANDIDATES — controlled, not allowed to displace NEXT
- Data Lineage & Semantic Contract Guard: source/version/unit/semantic meaning/freshness/retention/classification/evidence hash for important operational metrics.
- Deterministic Incident Replay Engine: reconstruct engagement state from Event Ledger + policy versions + provider event identities and detect state drift.
- Agent Assurance Harness: correctness/safety/escalation/tool-use/latency/cost evaluation for production agents.
- Architecture Decision & Engineering Memory Registry: ADRs, invariants, regression evidence, and operational runbooks.
- Decision & Entitlement Explainability: answer why access exists, which payment/event/policy granted it, and when it expires.
- Audit Evidence Pack: package payment proof, entitlement, pilot measurements, provenance hashes, and renewal decision for enterprise review.
- Operator Command Center: intervention-only view for payment anomalies, booking compensation, stale pilots, missing baselines, overdue outcomes, and renewal actions.
- Policy Registry: versioned Audit/Renewal/Commerce policies with effective dates, approval state, and hashes.
- Durable Webhook Inbox: authenticate/persist/acknowledge quickly, then process provider events asynchronously and idempotently.

## PRODUCTION GATES
- No production DB migration before explicit approval.
- No GitHub merge before explicit approval.
- No live payment provider before legal/KYC readiness and explicit approval.
- No PHI or patient-identifying data in Control Plane.
- No service-role secret in browser/client code.
- No recommendation automatically renews, charges, or extends entitlement.
- No commercial claim may be emitted as verified unless its Evidence & Provenance Guard passes.
- No payment webhook may settle value unless the provider adapter produces a valid trusted webhook envelope.

## Execution order from here
Cliniverse Apple subscription wiring -> manual bank-transfer fallback readiness -> Data Lineage & Semantic Contract Guard -> Deterministic Incident Replay Engine -> Supabase production-baseline plan -> Nexus production UI hardening -> production review.

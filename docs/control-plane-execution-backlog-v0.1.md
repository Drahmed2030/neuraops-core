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
- Booking live non-production verification is complete: availability checked, temporary private event created, Google Meet provisioned successfully, and the test event deleted after verification.
- Full repository verification is green from repository state: strict npm ci, unit/domain tests, TypeScript check, and Next.js production build.
- Supabase dependency pair is pinned and package-lock.json is synchronized: @supabase/ssr 0.12.4 + @supabase/supabase-js 2.112.4 on Node 22.
- OpenAI clients in LeadOps, Router, RAG, and Specialist paths are initialized lazily at request-time so builds require no production API secret.
- Supabase Development branch drift was reconciled: legacy NeuraOps baseline restored, branch rebased on Production, and official reliability_gate + leadops_mvp migrations now precede Control Plane migrations.
- Development branch status is FUNCTIONS_DEPLOYED / ACTIVE_HEALTHY and Control Plane synthetic evidence survived the rebase.
- Legacy DB hardening v0.1 removed mutable match_documents search_path, missing FK indexes, and auth.uid() per-row RLS performance warnings.
- Evidence & Provenance Guard v0.1 is implemented and verified: persisted measurement sourceEventIds are returned by RPC, Proof receives a deterministic SHA-256 evidenceHash, Renewal decisions bind proof hash + policy version into a decisionHash, forged source event IDs are rejected by Postgres, and exact replay remains idempotent.
- Provenance changes passed repository CI after implementation.
- Provider-neutral Webhook Trust Boundary v0.1 is implemented and CI-verified: settlement requires signatureVerified=true, a stable provider event ID/type, verification timestamp, normalized payment, and a SHA-256 hash matching the exact raw request body.
- PAYMENT_RECEIVED now binds to provider webhook identity when available and stores verification metadata/raw-body hash only; raw webhook bodies are never persisted.
- Trust-boundary tests prove unverified signatures, missing provider event IDs, and raw-body tampering fail closed before settlement or entitlement grants; exact trusted replay remains idempotent.
- Moyasar B2B sandbox adapter is CODE-READY using hosted invoices so cardholder data never reaches the NeuraOps backend.
- Moyasar invoice creation is retry-safe through metadata idempotency lookup and uncertain-create reconciliation before any second POST.
- Moyasar webhook verification requires the configured shared secret, rejects live-mode events in sandbox, then re-fetches both payment and invoice server-side before producing a TrustedWebhookEnvelope.
- Provider-first settlement no longer requires caller-supplied internal payment IDs: verified providerReference resolves a service-role-only Control Plane payment lookup, then organization/engagement/idempotency scope is cross-checked before atomic settlement.
- The provider-reference lookup RPC is verified on Development and is executable by service_role only (anon/authenticated denied).
- Development Moyasar webhook route preserves the exact raw body and fails closed outside CONTROL_PLANE_ENV=development.
- Latest repository CI is green with 108/108 tests, TypeScript, and Next.js production build.

## NEXT — required delivery gate
1. B2B payment adapter — live sandbox cycle
   - Create/use a Moyasar test account and obtain test-only `sk_test_` credentials plus webhook shared secret.
   - Configure only Development/Preview server-side environment variables; never expose secret keys to browser code.
   - Run one hosted invoice cycle: internal payment intent -> Moyasar invoice -> providerReference correlation -> payment_paid webhook -> server-side payment/invoice reconciliation -> TrustedWebhookEnvelope -> atomic settlement -> nexus.pilot_workspace -> PILOT_READY.
   - Verify exact webhook replay remains a no-op and a forged/tampered webhook cannot settle.
   - Do not create a public checkout-initiation endpoint until an operator/auth boundary is defined.
   - Production webhook handling should add a durable inbox/queue so provider 2xx acknowledgment is decoupled from complex settlement work.

## DEFERRED BUT REQUIRED BEFORE PRODUCTION READINESS
2. Cliniverse subscription wiring
   - Apple StoreKit/App Store transaction verification adapter.
   - Consumer iOS digital access remains Apple IAP.
   - Verified Apple transaction -> trusted verification envelope -> Control Plane settlement -> Cliniverse entitlement -> SUBSCRIPTION_ACTIVE.

3. Supabase production migration hygiene
   - Production legacy baseline 001–006 is not fully represented in the historical migration ledger; do not create another branch assuming the ledger alone is a full schema baseline.
   - Prepare a future-safe baseline reconciliation plan before production migration changes.
   - Remaining security WARN: vector extension is installed in public; defer moving it until RAG type/function/index dependencies are migration-tested.
   - Control Plane RLS-without-policy INFO is intentional deny-by-default; direct anon/authenticated access stays revoked.
   - No merge of development branch into production without explicit approval.

4. Nexus production UI hardening
   - Replace development audit policy environment with an approved, versioned commercial policy.
   - Review copy, abuse controls, telemetry, error UX, accessibility, and retention/privacy behavior.
   - Payment CTA remains disabled until the real non-production payment integration passes.

## FEATURE CANDIDATES — controlled, not allowed to displace NEXT
- Data Lineage & Semantic Contract Guard: source/version/unit/semantic meaning/freshness/retention/classification/evidence hash for important operational metrics.
- Deterministic Incident Replay Engine: reconstruct engagement state from Event Ledger + policy versions + provider event identities and detect state drift.
- Agent Assurance Harness: correctness/safety/escalation/tool-use/latency/cost evaluation for production agents.
- Architecture Decision & Engineering Memory Registry: ADRs, invariants, regression evidence, and operational runbooks.
- Decision & Entitlement Explainability: answer why access exists, which payment/event/policy granted it, and when it expires.
- Audit Evidence Pack: package payment proof, entitlement, pilot measurements, provenance hashes, and renewal decision for enterprise review.
- Operator Command Center: intervention-only view for payment anomalies, booking compensation, stale pilots, missing baselines, overdue outcomes, and renewal actions.
- Policy Registry: versioned Audit/Renewal/Commerce policies with effective dates, approval state, and hashes.

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
Moyasar live sandbox cycle -> Cliniverse Apple subscription wiring -> Supabase production-baseline plan -> Nexus production UI hardening -> production review.

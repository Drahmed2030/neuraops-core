# Batch 01 — current acceptance update, 8 October 2026 morning

Status: **LOCAL_PROVENANCE_AND_REVIEW_PASS_ACTIVATION_OPEN**. Full activation and hosted release remain OPEN.
Base for this increment: a12e4fdf10d7e1b48cea5bc68cfd93d3c54f1992.

The previously missing human requester issuer now exists **locally**: the existing verified-user/operator guard derives identity; a narrow RPC atomically creates the inert task, private requester attestation, exact request binding, immutable envelope and audit event. Same actor/key retry returns the original task; conflicting content is denied. Another verified operator can record approval; the creator cannot. No service-agent identity or live second operator was fabricated.

The new /dashboard/control/requests surface presents task details and digest for review. Its actions and page require the existing operator guard and default-off recording flag. The interface's lost-response retry was reproduced with real React in JSDOM, then fixed; original fields and request key survive. Browser visual/layout and live founder authentication were not verified. This surface is not deployed.

## Current evidence

- Native PostgreSQL 17.11: 27/27 checks, five independent-session races including one-request idempotency; cluster cleaned and nonpersistent VM stopped after 274,711 ms. Monetary billing not retrieved.
- Targeted suites: 65/65, including nine new server-guard-to-SQL flow tests and audit-failure rollback.
- Root unit suite: 110/110; 19 overlap the targeted count, so do not sum them.
- React DOM retry: 1/1. TypeScript: exit 0.
- One independent review found one Important UI retry issue, reproduced RED then fixed GREEN. No other Critical/Important findings in that review. No second independent release approval claimed.
- Source hashes, tool versions, RED/GREEN logs and native evidence: **evidence/batch-01-provenance/RECEIPT.json** and SHA256SUMS.
- Technical watch and adoption decisions: **research/2026-10-08-technical-watch.md**.

## Next single engineering gate

Complete effective assignment/policy selection and parent-scope delegation. Live founder/requester/reviewer authentication and hosted migration drift/recovery review remain release prerequisites. A one-founder account cannot satisfy independent self-review by using a label or synthetic agent. Model/external/production controls remain off; recorded budget is a reservation, not a provider billing enforcement mechanism.

Design rulings: use the existing operator identity boundary and private evidence, not a new role/framework; keep only internal drafts with no tools/providers; use integer cents at the request interface; preserve submitted fields/key after uncertain replies. The resulting limits are intentional: unverified agent-origin tasks and self-approval are rejected, and hosted operation awaits its existing gates. No third-party product framework was adopted.

---

## Historical preceding acceptance (superseded only where updated above)

# Batch 01 — native verification and approval recording candidate

Status: **NATIVE_RECORDING_PASS_ACTIVATION_OPEN**. Full Batch 01 acceptance remains OPEN.

Implementation base: `958edc5d8503a1c6134352f8532f848a73c21254`.
Branch: `feature/company-os-identity-authority-v1`; isolated local worktree.
No hosted Company/Health Cloud SQL, model calls, push or deployment. The founder explicitly authorized disposable native PostgreSQL verification and bounded test expenditure in this conversation.

## Implemented

- Preserve all six original agent identities/profiles and task references. Add one inactive engineering candidate, immutable PROPOSED assignments and policy snapshots. Gateway execution stays denied until activation governance exists.
- Add immutable task approval bindings covering the full task, profile and execution envelope digest, attested requester, verified approver, request key, policy version, expiry and reserved budget.
- Server actions use the existing `getUser()` plus operator UUID allowlist. Caller actor/budget fields are rejected. `COMPANY_APPROVAL_RECORDING_ENABLED` is default-off and has not been enabled in a hosted environment.
- Approval recording is service-role-only, requires a distinct attested requester, rejects prior REJECT/REVOKE and expired/stale work, and reserves budget atomically. Same-key replay returns the existing receipt without a second reservation.
- Conservative pilot ceiling: $0.05 per task and $1 per UTC day. Expiry is at most 15 minutes, the task expiry or UTC midnight. These are SQL reservation ceilings, not actual provider billing enforcement or authorization to execute.
- Requester attestations are private, immutable and not populated from free-text task labels. **A live trusted issuer has not been implemented.** Existing unverified tasks therefore cannot obtain approval. Synthetic owner-created attestations are test fixtures only.

Both SQL files in `supabase/candidates/` are review candidates, not release migrations. Recording a receipt never changes task execution state, enables an operating control, or activates an assignment. Do not apply these candidates to hosted databases as a release.

## Verification evidence

| Evidence | Result | Boundary |
|---|---|---|
| `evidence/batch-01-native/` | 23/23 on native PostgreSQL 18.6 | Earlier inactive candidate; real assignment commit/rollback races |
| `evidence/batch-01-native-pg17/` | 26/26 on native PostgreSQL 17.11, exit 0 | Final SQL and runner hashes; four real two-session races; cleanup confirmed |
| `evidence/batch-01-governance/` | 56/56 targeted tests, no skips | Embedded PostgreSQL plus server-action/normalizer tests |
| Root unit suite in governance evidence | 110/110 | Includes 19 tests also counted in targeted suite; do not add totals |
| TypeScript check | Exit 0 | Existing matching-lockfile dependencies; no app dependency changes |

The native runner creates a fresh non-root cluster with a private Unix socket and TCP disabled. It accepts no database URL or credentials, closes child processes, stops PostgreSQL and removes its cluster. Both nonpersistent test VMs were explicitly stopped. Combined VM duration was 635,686 ms (about 10m36s), each 1 vCPU/2GB. Actual invoiced cost was not retrieved; no dollar cost is inferred from runtime.

PostgreSQL 17 matches the observed hosted major version, not the hosted patch level, extensions, platform services or production configuration. Native PASS does not prove hosted compatibility or deployment readiness. Receipts pin file bytes and execution times; the base HEAD plus recorded working-tree changes is not misrepresented as an already committed tested HEAD.

## Independent review and fixes

The inactive preparatory candidate previously received a bounded independent review without release approval. Review of the new recording scope found three Important issues: prior rejection ignored on first recording, stale time after lock waits, and unverified requester provenance. All three were reproduced as failing tests, fixed, then checked with the affected suite and final native run. Details are in `review-resolution.json`. No second independent approval of the fixes or hosted release is claimed.

## Acceptance mapping

| Criterion | Evidence / remaining boundary |
|---|---|
| Seed idempotency and six identities retained | Exact native row comparisons and repeated seed |
| Five business functions plus independent assurance | UUID-pinned mappings; inactive engineering |
| Proposal cannot widen authority | Mutation denial and disabled execution gateway |
| Assignment concurrency | Independent native sessions: committed conflict rejected; rollback releases lock |
| Role isolation | Actual anon/authenticated/service_role grants tested; no invented worker role |
| No self-approval | Server-derived approver; attested distinct requester; executing-agent digest rejected |
| Immutable request binding | Changed task payload, destination or policy metadata invalidates digest |
| Expiry and revocation | Prior/replayed revocation denied; expiry during real budget-lock wait rolls back; UTC rollover denied |
| Budget atomicity | Two native reservations compete for last $0.05; one succeeds, other fails without partial approval |
| Disabled controls | MODEL_EXECUTION, EXTERNAL_ACTIONS and PRODUCTION_ACTIONS remain disabled |
| Founder access | Guard unit tests pass; live authenticated Control end-to-end remains OPEN |
| Effective policy and delegation | Effective assignment selection, parent-scope subset enforcement and executor integration remain OPEN |

## Next single gate

Implement and verify the **authenticated task-request provenance path** together with the founder's review flow, so an approval binds two independently verified identities to the exact reviewed task. Then complete effective-policy/delegation enforcement before considering activation. Existing passwords, live Control access and actual operator experience are not certified by mocked transport tests.

After those gates: CLI-generated release migration, target drift/recovery review and a separate hosted release decision. Company OS work remains separate from Health Cloud, corporate domains and PHI.

## 2026-10-08 — envelope/policy prerequisite increment

The earlier gate descriptions above are historical. Task-request provenance now has
its own prior evidence in `evidence/batch-01-provenance/`; this increment does not
recertify that evidence or the deployed Founder session.

The existing gateway now rejects a missing execution envelope, divergent task
identity/scope/expiry/budget, an unrecorded policy version, and a missing or
divergent immutable policy snapshot. A matching envelope still ends in
`ASSIGNMENT_ACTIVATION_DISABLED`. This is a denial-only prerequisite, not an
effective assignment selector, approval consumer, delegation engine or executor.

Validation: three new tests first failed against the prior gateway. The initial
targeted authority suite passed 22/22. One independent read-only review approved
the local denial-only candidate and identified two nonblocking coverage gaps.
Both were covered (external-action envelope mismatch and missing/divergent
same-version history); the final targeted suite passed **23/23**, no skips.
Final source hashes and log are in
`evidence/envelope-policy-guard-v1-reviewed/receipt.json` and `verification.tap`.
Engine: embedded PGlite 0.5.8, single connection. No fresh native concurrency,
hosted application, paid model call, push or deployment is claimed.

Remaining activation gate: authenticated assignment approval and effective
selection, parent-scope delegation enforcement, and executor integration.
Current schema deliberately accepts only PROPOSED/RETIRED assignments with no
activation approval reference. Do not convert these to ACTIVE by bypassing that
constraint. No existing agent identity or operating control was changed.

## 2026-10-08 — delegation preflight and role preparation

The existing `parent_task_id` now drives a bounded check in the same gateway.
Child tools/providers must be subsets; action, data class and destination must
match; risk, budget and expiry cannot grow. Missing parent envelopes and
unauthorized parents fail closed. Null child/parent budgets cannot delegate.

Ruling: allow at most one delegation level in this preparatory contract. Reject
nested ancestry before recursively checking the parent. This prevents cycles and
unbounded recursion; the cost is that legitimate multi-level orchestration stays
unavailable until a separate bounded-chain design is approved and verified.

Three new behavioral tests failed against the preceding implementation, then
passed after the change. Final affected authority suite: **26/26 PASS**, embedded
PGlite, no skipped tests. Exact hashes/log:
`evidence/delegation-preflight-v1/receipt.json` and `verification.tap`.
Independent delta review: approved as a local denial-only candidate, no blocking
regressions. No native concurrency or live executor certification is claimed.

`agent-operating-handbook.md` defines role deliverables, source discipline,
untrusted-content handling and a competence assessment/promotion protocol.
It is preparatory content, not a loaded prompt, trained model or live evaluation.

Remaining activation work is broader than one toggle: authenticated assignment
activation/effective selection, transactional approval consumption and aggregate
child-budget enforcement, executor integration, release to the verified target,
and a bounded observable internal pilot. A preflight read reserves no funds and
cannot prevent a change between checking and execution. All execution remains
denied. No paid calls, hosted SQL, push or deployment occurred in this increment.

## 2026-10-08 — aggregate delegated approval reservations

Approval recording now locks a direct parent before its child and retains the
charged parent in the immutable approval binding. Sibling reservations cannot
exceed the parent's approved reservation. A changed child linkage does not free
previously reserved budget. Parent approval must remain present, digest-matching,
unexpired and not rejected/revoked, including on child approval replay. Child
approval expiry cannot outlive the parent. Nested delegation is still disabled.

Ruling: retain the conservative daily accounting: parent and child approval
reservations both count toward the existing $1/day ceiling. No refund/reuse or
provider billing semantics are introduced. This may reduce available capacity;
it cannot increase the permitted daily reservation.

Verification: four new behaviors first failed, then passed; an additional
revoked-parent replay test exposed an early-return defect which was fixed.
Final affected approvals suite **37/37 PASS**, zero skips, embedded PGlite.
Receipt, source hashes and log: `evidence/delegation-budget-v1/`.
One independent delta review approved the local recording-only candidate with
no blocking findings. The original six identities and disabled controls remain.

This closes the local aggregate approval-reservation gap, not execution-time
spending or live concurrent-session acceptance. No code consumes an approval to
perform a model/tool action yet. Assignment activation, executor admission and
single-use consumption, actual provider-cost enforcement, native concurrency and
the hosted pilot remain open. No new public action, paid request, hosted SQL,
push or deployment was performed.

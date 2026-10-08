# Company OS Identity and Authority — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. The controller implements here; one independent security review covers the final batch. Steps use checkboxes.

**Goal:** Implement a locally verified, inactive company-agent authority foundation while preserving existing identities and history.

**Architecture:** Extend the existing Company OS profiles and gateway, not the unrelated merchant-agent engine. Versioned function assignments organize work; only the existing authority path may authorize it. No worker, model call or hosted mutation is activated by this batch.

**Tech Stack:** Existing Node 24, TypeScript, node:test and PostgreSQL; no new agent framework.

**Spec:** `docs/company-os/batch-01-identity-authority-design.md` — founder-approved in this conversation.

## Global Constraints

- Preserve all six existing agent identities, tasks and foreign keys.
- Five business functions plus independent assurance; do not collapse identity rows.
- Missing/inactive/expired/conflicting assignment or policy fails closed.
- Function labels and prompts never confer permission.
- Company agents have no PHI/Health Cloud data access through this batch.
- Workers cannot modify their own authority or operating controls.
- MODEL_EXECUTION, EXTERNAL_ACTIONS and PRODUCTION_ACTIONS remain disabled.
- No outbound messages, spending, hosted migrations, push or deployment in this implementation batch.
- Founder password establishment and authenticated Control access remain separate open dependencies.

## Review Focus

1. Duplicate display names must not select an arbitrary identity (Task 1).
2. Concurrent assignment updates must not produce two effective versions (Task 2).
3. Empty gateway results must mean denial, not success (Task 3).
4. Changed payload, destination or policy must invalidate approval (Task 3).
5. A disabled control must still deny an otherwise valid task (Tasks 3–4).

## Evidence boundary

Implementation base is the recorded local design commit `d8bd3b479c889473bea3d4e9e77db07fcce123c7` plus this plan commit. Record the actual base when creating the isolated branch. Deployed source remains `d872eb85fbbdeb9ac14425fb70aee3ba7fa5cf8a`; do not claim the local login fix is deployed.

Read-only inspection recovered live gateway definitions. `execution_gateway_preflight` checks profile, lifecycle, risk, action, expiry and selected controls, but does not consume approval bindings or function assignments. `task_authority_check` can return zero rows for missing inputs. The authority table has one row per agent, not a policy-history key. These are implementation gaps, not evidence of a bypass having been exploited.

### Task 1: Recover a reproducible baseline and fixed identity map

**Files:** Create `tests/fixtures/company-os/baseline.sql`, `tests/fixtures/company-os/identity-map.json`, `tests/company-os-baseline.test.mjs`.

**Interfaces:** The map contains `{functionKey, agentId, assignmentKind}`; IDs are verified existing UUIDs. Function keys are `OPERATIONS`, `ENGINEERING`, `RESEARCH`, `GROWTH`, `MEDIA`; `ASSURANCE` is a separate assignment kind, not a sixth business function.

- [ ] Inspect source branches and live catalog once for canonical definitions, owners, grants, RLS policies, triggers and gateway callers; export schema definitions only, with no task payloads or secrets. If canonical history is unavailable, label the fixture a catalog-derived test baseline; it cannot substitute for migration history.
- [ ] Write failing tests for duplicate/unknown identities, preserved six IDs and task references, and absence of credentials in fixtures. Resolve by UUID, never by first matching display name.
- [ ] Prepare synthetic records with the verified shape. Map PM→operations, Scout→research, Sales→growth, CMO+Creator→media, QA→assurance; retain their current authority limits. Engineering remains unassigned until Task 2 creates an inactive candidate.
- [ ] Run `node --test tests/company-os-baseline.test.mjs`; require all cases pass. Commit only fixtures and tests.

**Stop condition:** Unresolved source/catalog drift blocks dependent schema work. Do not reconstruct unknown grants or treat a Proposed ADR as an accepted permission grant.

### Task 2: Versioned assignments and non-destructive policy history

**Files:** Create `supabase/migrations/<CLI-generated-timestamp>_company_agent_assignments.sql`, `supabase/seeds/company-agent-assignments.sql`, `tests/company-os-assignments.test.mjs`, `scripts/company-os-local-verification.mjs`.

**Interfaces:** Add `neuraops_company.agent_function_assignments` with agent FK, function key, assignment kind, positive version, effective/expiry times, approval reference and supersession reference. Add immutable `agent_authority_profile_versions` snapshots while retaining the existing profile as the current-policy pointer. Do not increase any existing capability.

- [ ] Write failing local PostgreSQL tests for repeat seed, identity/task preservation, concurrent version writes, expired assignments, rollback, worker DML denial and authority-history retention.
- [ ] Generate the migration name using the existing Supabase CLI convention. Use FK restrictions and unique version keys; serialize assignment changes per identity/function with a transaction lock and recheck the effective version under that lock. Reject overlapping effective intervals. Approval references must resolve to authenticated governance evidence, not arbitrary user text.
- [ ] Create one inactive engineering candidate with a fixed seed UUID and no allowed actions. Seeds are insert-if-absent; incompatible existing rows produce an error, never an overwrite. Preserve the current six identity rows exactly.
- [ ] Revoke worker writes to assignments, history, approvals and controls. Test grants and RLS with the actual intended worker role in the disposable cluster; do not invent a more privileged role to obtain a pass.
- [ ] Implement `scripts/company-os-local-verification.mjs --suite assignments --evidence <new-directory>`: local disposable database only, validated local connection, nonzero on any command/test/cleanup failure, no hosted credentials, no automatic package install.
- [ ] Run the assignments suite; require pass, clean shutdown and evidence of unchanged controls. Commit the minimal migration, seed and tests.

### Task 3: Extend the existing gateway with fail-closed binding checks

**Files:** Extend the same new migration; create `src/lib/company-os/authority-result.mjs`, `tests/company-os-authority.test.mjs`.

**Interfaces:** Preserve existing gateway result columns and public wrapper signature. `normalizeAuthorityResult(rows)` returns `{allowed:false, reason}` for zero, multiple or malformed rows and accepts an allow only from exactly one well-formed result. It never upgrades a database denial.

- [ ] Write failing tests for missing/expired/conflicting assignment, stale policy version, forged caller roles, inactive engineering, self-approval, request mutation, parent-scope expansion and controls disabled.
- [ ] Resolve the task's immutable execution envelope and policy version server-side. Require effective assignment and matching immutable policy snapshot. Keep all existing denials; this batch introduces no path for executing high-risk or external work after approval.
- [ ] Extend approval evidence with structured binding fields for task, input digest, destination, budget, policy version and expiry. Validate bindings transactionally; reject absent or changed bindings and implementer/self approval. Approver identity must come from authenticated operator context, never payload claims. If that context cannot yet be demonstrated, approval acceptance remains disabled.
- [ ] For delegated tasks, require a valid parent and a subset of its tools/resources/budget/expiry. Reject a missing parent or enlarged scope. Do not use model text to make authorization decisions.
- [ ] Add denial on empty/malformed results through `normalizeAuthorityResult`; retain existing gateway checks as the authority source rather than adding an independent allow engine. No worker dispatcher or public mutation route is introduced.
- [ ] Run `node --test tests/company-os-authority.test.mjs` and the local verifier with `--suite authority`. Require direct database-role tests, not only mocked decisions. Commit after the negative tests pass.

### Task 4: Bounded acceptance and independent review

**Files:** Update the approved design status and implementation evidence references; create `docs/company-os/batch-01-acceptance.md`.

- [ ] Run the combined Company OS suites once on final code, plus `node --test tests/login-routing.test.mjs tests/operations-api.test.mjs tests/operations-console.test.mjs` and `npm run typecheck`. Do not rerun unrelated Health Cloud suites.
- [ ] Map all twelve design acceptance criteria to exact test names and evidence. Record BASE/HEAD, role used, counts, migration digest, original six IDs preserved, control states, cleanup and limitations. Mark runtime activation and authenticated Founder access unverified where applicable.
- [ ] Have one independent reviewer inspect the final diff, grants, approval provenance, concurrency and evidence. Resolve concrete findings with affected tests only; no repeated complete reviews without a changed risk.
- [ ] Deliver the reviewed local candidate and the next single gate. Hosted application requires a verified target baseline, recovery plan and separate release decision; local PASS is not hosted PASS.

## Plan self-review

Coverage: identity preservation and mapping in Tasks 1–2; versioning/concurrency/rollback in Task 2; authorization, delegation and approval integrity in Task 3; access regression, disabled controls and evidence in Task 4. No new queue/framework, subscription, clinical permissions or media publishing. Missing source or authenticated approval provenance is an explicit blocker, never an implementation guess.

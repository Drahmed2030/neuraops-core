# Company OS — Batch 01: Identity and Authority

Status: founder-approved design; inactive local preparatory implementation only; no hosted migration or activation.
Founder approval of programme direction: 2026-10-08, Asia/Riyadh.
Repository: Drahmed2030/neuraops-core.
Working code HEAD: e1824c16ca45541673c49b8fbb9585db160d70d8.
Deployed Company Control source: d872eb85fbbdeb9ac14425fb70aee3ba7fa5cf8a.

## Objective

Organize the existing Company OS into five business functions with attributable
identities and enforced authority. Reuse existing storage and preserve all
historical identities and tasks. Registration, permission, execution and
successful results must be represented separately.

## Observed foundation

Read-only catalog inspection of neuraops-global-core found:
- public.system_agents and public.agent_tasks.
- neuraops_company.agent_authority_profiles, execution_envelopes,
  task_approvals, agent_task_events, qa_reviews, model_execution_receipts,
  model_usage_events, operating_controls, model_provider_policies and
  product_reality_facts.
- task_authority_check, execution_gateway_preflight, model_route_preflight,
  immutable-evidence trigger functions and public gateway/snapshot wrappers.

Existence is not acceptance of enforcement: inspect canonical definitions,
constraints, grants and callers before extending them. This batch does not
claim runtime validation of those functions.

All six observed profiles forbid external actions, financial actions, legal
commitments, production actions, security mutations and database mutations.
Earlier snapshot showed model execution and external/production execution
disabled. An ACTIVE registry row is not evidence of an active worker.

## Five functions; preserve existing worker identities

| Function | Existing candidate | Treatment |
| --- | --- | --- |
| Executive / operations | Neura-PM, Product Manager | Candidate coordinator; preserve identity/history; review scope before broadening |
| Engineering | No corresponding executor established | Add a distinct inactive candidate only after contracts and role tests pass |
| Research | MedPulse-Scout, Medical Trend Scout | Existing specialist; wider company research requires explicit scoped policy |
| Partnerships / growth | MedPulse-Sales, Lead Gen & Sales Agent | Candidate; internal drafts only initially |
| Media / communications | Neura-CMO and MedPulse-Creator | Two existing specialists may serve one function; no forced merge or deletion |
| Independent assurance | Neura-QA | Cross-cutting reviewer; never repurpose as implementation owner |

Five functions do not mean exactly five identity rows. Preserve all existing
IDs and task foreign keys. The media remit includes source-backed company
content, brand rules, asset rights and draft campaigns. It confers no permission
to invent clinical claims, endorsements, customer logos or incorporation status.

## Proposed minimal extension

First recover the canonical Company OS migration/source history. If no newer
equivalent exists, add versioned business-function assignments associated with
existing agent IDs. Do not use mutable display names as authorization keys.
An assignment records function, agent, assignment version, effective period,
approval reference and retirement/supersession. It does not itself grant tools.

Keep agent_authority_profiles as the existing authority contract, subject to
verification. Do not invent a second authorization engine. Any proposed
profile change must have a version and approval record; do not silently
overwrite the only copy of prior policy.

An engineering candidate starts inactive, with no credentials, no model spend,
no external action and no hosted database/production access. Isolated code
execution is enabled only in a later reviewed worker batch.

## Enforcement contract

- Each task resolves an identity and effective policy version server-side.
- Function labels and prompts never confer permission.
- Missing/inactive/expired/conflicting assignment or policy fails closed.
- Delegated tasks cannot exceed their parent's resource/tool/budget scope.
- Approvals bind the action, exact input/artifact digest, destination, budget,
  policy version and expiry. A changed request cannot reuse approval.
- The implementer cannot approve its own sensitive result.
- Company agents have no PHI/Health Cloud data access through this batch.
- Credentials remain in secret management, never task payloads or prompts.
- Workers cannot modify their own authority or operating controls.

## Founder entry dependency

The company-email account has accepted its invitation. Its UUID was assigned
to the existing branch-scoped operator allowlist. This is operator access to
the existing read-only surface, not a new general-purpose Founder role.
Password establishment and authenticated end-to-end Control access remain
open. The tested login-routing fix exists locally, not in the deployed SHA.

## Implementation order

1. Recover source definitions and compare against live catalog read-only.
2. Implement only the missing versioned function-assignment contract on an
   isolated branch; preserve existing public tables and historical data.
3. Prepare idempotent seed mappings plus inactive engineering candidate.
4. Test synthetic data locally under actual intended roles.
5. Independent security review of exact diff and evidence once.
6. Apply only after migration/recovery and environment gates are satisfied;
   then verify effects and preserve disabled execution controls.

## Acceptance tests

1. Reapplying seed creates no duplicate assignments/identities.
2. All six old identity IDs and task references remain intact.
3. Five business functions are represented; assurance is separately visible.
4. Inactive engineering candidate cannot execute any tool.
5. Function reassignment alone cannot expand effective permission.
6. Unknown/expired policy and user-supplied role claims are denied.
7. A worker cannot self-approve or modify authority/control records.
8. Editing payload/destination/policy invalidates an earlier approval.
9. Concurrent assignment updates reject or serialize conflicting versions.
10. Rollback on failed mapping writes leaves no partial activation.
11. Model/external/production controls remain unchanged and disabled.
12. Unauthenticated and nonoperator users cannot read Company Control.

## Exit and boundaries

Required evidence: exact BASE/HEAD, reviewed migration/seed diff, test counts,
role-based denial evidence, preservation checks and independent disposition.
No contract signature, subscription, outbound campaign, new framework,
Health Cloud migration, clinical data, deletion or production promotion.
Do not rerun unrelated closed batches. Source mismatch stops that mutation,
not unrelated read-only analysis.

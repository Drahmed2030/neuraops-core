# NeuraOps Recovery Drill Plan v1

## Purpose

This plan defines the first approved recovery exercise for the authoritative NeuraOps runtime. It is a planning artifact only. It does not execute a rollback, redeploy, DNS change, database restore, or failover.

The first exercise is intentionally narrow: prove that the team can identify the authoritative runtime, select a known-good deployment, validate it, and prepare a rollback decision without changing production traffic.

## Scope

In scope:

- repository: `Drahmed2030/neuraops-core`
- Vercel project: `neuraops-core`
- production domain: `getneuraops.com`
- runtime service: `vercel-runtime`
- exercise type: `redeploy/rollback readiness`

Out of scope:

- Health Cloud
- Cliniverse / Apple / StoreKit
- Supabase restore
- DNS mutation
- payment systems
- autonomous self-healing
- destructive actions
- PHI, patient data, or customer payloads

## Preconditions

The drill must not start unless all conditions are true:

1. authoritative project ownership is re-confirmed;
2. current production deployment is READY;
3. at least one previous production deployment is READY and fetchable;
4. current `/api/live` and `/api/ready` checks are healthy;
5. no active production incident is already in progress;
6. operator approval is recorded outside source code;
7. rollback target SHA and deployment ID are written into the drill record before any traffic-changing action;
8. monitoring window and abort criteria are agreed.

## Current known-good ladder

At plan creation time:

1. `45fe580cfbbdaa2f90909b18d06ce1b453829e5f`
2. `c9565b41ed21ed659a7b046d486f912ba3b3c24e`
3. `d04b007e7cfe81a358ea8969ccce8f003983ee7d`

Each candidate must be revalidated at drill time. Historical READY state alone is not enough.

## Phase A — non-invasive rehearsal

This phase changes no production traffic.

1. capture current production deployment ID, SHA, aliases, and timestamp;
2. run liveness and readiness checks;
3. capture the current 5xx baseline;
4. inspect the selected previous known-good deployment;
5. run the synthetic probe against that deployment URL;
6. verify release/environment metadata;
7. verify that no secret, token, customer content, or clinical data is present in evidence;
8. calculate the theoretical rollback command/target but do not execute it;
9. record elapsed time and exceptions.

Passing Phase A proves operator readiness and target selection. It does not prove production rollback RTO.

## Phase B — approved traffic-changing drill

Phase B requires a separate explicit approval at the time of execution.

If approved:

1. start timer;
2. capture current production evidence;
3. point production traffic to the pre-approved known-good deployment using the provider-supported rollback mechanism;
4. verify `getneuraops.com`, `/api/live`, and `/api/ready`;
5. inspect production 5xx/error evidence;
6. stop timer when service acceptance criteria are satisfied;
7. optionally restore the original production deployment only if this was part of the approved drill plan;
8. verify service again after the final traffic state;
9. create an evidence record containing only operational metadata and opaque references.

No step may be automated beyond the approved command itself.

## Abort criteria

Abort and escalate if any of the following occurs:

- authoritative deployment identity is ambiguous;
- production domain does not resolve to the expected project;
- selected known-good deployment is not READY;
- readiness fails for a dependency unrelated to the release;
- unexpected authentication or authorization behavior appears;
- any customer, patient, credential, token, or sensitive payload enters the evidence path;
- 5xx errors increase after the traffic change;
- operator cannot verify the final production state.

## Acceptance criteria

Phase A passes when:

- authoritative runtime is proven;
- selected rollback target is proven READY;
- synthetic probe passes against the candidate;
- evidence is privacy-safe;
- no production traffic was changed.

Phase B passes only when:

- production traffic change was explicitly approved;
- measured recovery time is captured;
- production liveness/readiness pass after the change;
- error evidence is acceptable;
- final production state is explicitly recorded;
- evidence reference is stored in the governed recovery record.

## Evidence model

Record only:

- service
- exercise type
- start/end timestamps
- source release SHA
- target release SHA
- source/target deployment IDs
- achieved RTO
- observed RPO
- probe outcome
- error-rate summary
- opaque approval reference
- evidence hash/reference
- exceptions

Do not store secrets, raw logs containing sensitive payloads, customer data, clinical data, tokens, cookies, or credentials.

## Recovery objective policy

The `vercel-runtime` objective remains:

- readiness: `partial`
- objectiveStatus: `target`

until an approved Phase B drill produces valid evidence and the governed recovery matrix is separately reviewed.

A successful Phase A rehearsal MUST NOT change recovery readiness to `verified`.

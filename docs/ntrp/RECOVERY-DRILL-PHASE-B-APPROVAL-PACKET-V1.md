# NeuraOps Recovery Drill — Phase B Approval Packet v1

## Purpose

This packet defines the exact conditions under which a controlled production traffic-switch drill may be approved for the authoritative NeuraOps runtime.

This document is non-executable. It does not authorize or trigger a rollback, promote, redeploy, DNS change, database restore, or any other production mutation.

## Current authoritative production

- repository: `Drahmed2030/neuraops-core`
- branch: `main`
- production SHA: `63402d562461596e090cb5fee49f22b8fca66042`
- authoritative Vercel project: `neuraops-core`
- project ID: `prj_RjF2s10VCS3VnylALtzTVqZr6omx`
- production deployment: `dpl_9DyZFxLcjj9rh2PzMjp4QMk6HshN`
- production domain: `getneuraops.com`

## Preferred Phase B candidate

- deployment: `dpl_8ULDTKmdKpZSSmRJYisH7hkcBFVD`
- candidate SHA: `abe879a847e692a0a574a4b63eb909de1f4328a0`
- candidate URL: `https://neuraops-core-11is5rahx-cliniverse-ai.vercel.app`
- observed state during Phase A: `READY`

The candidate was selected because its Git tree matched the previously validated production tree during Phase A and because liveness/readiness/health checks passed.

The candidate must be revalidated immediately before any Phase B execution.

## Drill objective

Measure the time required to move production traffic from the current deployment to the pre-approved candidate and re-establish accepted service health.

This drill is intended to measure operational recovery of the Vercel runtime only.

It does not measure:

- Supabase restore time
- DNS recovery time
- identity recovery time
- Health Cloud recovery
- Cliniverse recovery
- Apple/StoreKit recovery
- payment recovery

## Start timer

The RTO timer starts immediately before the approved production traffic-switch command is issued.

The start timestamp must be recorded in UTC with millisecond precision when available.

## Stop timer

The RTO timer stops only when all acceptance conditions are true:

1. production domain responds successfully;
2. `GET /api/live` returns HTTP 200 and `status=ok`;
3. `GET /api/ready` returns HTTP 200 and `database=ok`;
4. `GET /api/health` returns HTTP 200;
5. release fingerprint identifies the intended target deployment;
6. request/correlation identifiers are present;
7. no new 5xx regression is observed in the agreed verification window.

## RPO interpretation

For this Vercel runtime drill, code/runtime RPO target is 0 minutes because the selected candidate represents an already-existing immutable deployment.

This drill does not prove database RPO.

No database restore or data rollback occurs during this exercise.

## Acceptance window

Default verification window after traffic switch:

- immediate endpoint checks;
- then at least 5 minutes of production observation;
- inspect 5xx/error evidence during that window.

A longer window may be chosen before execution, but not shortened after the drill begins.

## Success criteria

Phase B may be marked passed only when:

- explicit operator approval was captured before execution;
- authoritative production identity was confirmed immediately beforehand;
- target candidate was READY immediately beforehand;
- traffic switch completed using the provider-supported operation;
- production domain resolved to the intended deployment;
- liveness/readiness/health checks passed;
- no unacceptable 5xx regression appeared during the acceptance window;
- achieved RTO was recorded;
- observed runtime RPO remained 0;
- final production state was recorded;
- evidence contained only bounded operational metadata and opaque references.

## Abort criteria

Abort or reverse the drill immediately if:

- the authoritative project or domain becomes ambiguous;
- the selected target is no longer READY;
- readiness fails before the traffic switch;
- an unrelated production incident is active;
- authentication behavior changes unexpectedly;
- 5xx errors materially increase;
- critical routes fail;
- evidence would include secrets or sensitive payloads;
- operator cannot prove which deployment currently owns production traffic.

## Reversal plan

Before the drill begins, the operator must record the source production deployment.

If the candidate fails acceptance criteria, production traffic should be returned to the recorded source deployment using the provider-supported rollback/promote mechanism.

After reversal, repeat:

- production domain check;
- `/api/live`;
- `/api/ready`;
- `/api/health`;
- 5xx/error observation.

The reversal itself must be timed and documented separately from the forward traffic switch.

## Final-state options

One of the following must be chosen before execution:

1. **Return-to-source drill**
   - switch to candidate;
   - verify;
   - switch back to source;
   - verify again.

2. **Candidate-remains-production drill**
   - switch to candidate;
   - verify;
   - leave candidate as production only if this was explicitly approved beforehand.

Default preference for the first Phase B exercise: **Return-to-source drill**.

## Evidence fields

Record:

- approvalRef
- drillRef
- source production SHA
- source deployment ID
- target SHA
- target deployment ID
- UTC start timestamp
- UTC healthy timestamp
- achieved RTO minutes/seconds
- observed runtime RPO
- liveness result
- readiness result
- compatibility health result
- release fingerprint
- 5xx/error summary
- reversal required: yes/no
- reversal deployment ID
- reversal start/end timestamps if applicable
- final production deployment ID
- final production SHA
- evidence integrity hash/reference
- material exceptions

Do not record:

- tokens
- cookies
- credentials
- environment secrets
- raw customer payloads
- patient data
- clinical content
- raw sensitive logs

## Approval requirements

Before Phase B execution, the operator must explicitly approve:

- the exact target deployment;
- the final-state option;
- the acceptance window;
- the abort criteria;
- the fact that production traffic will change temporarily.

Approval must be recorded outside source code using an opaque reference.

## Recovery Matrix rule

Phase B success alone does not automatically modify the Recovery Matrix.

After the drill:

1. validate the evidence record;
2. compare achieved RTO/RPO with the declared objective;
3. review exceptions;
4. separately decide whether `vercel-runtime` can move from:
   - `readiness: partial`
   - `objectiveStatus: target`
   to a verified state.

Until that separate reviewed decision occurs, the matrix remains unchanged.

## Execution boundary

No command in this packet is self-executing.

The actual traffic-switch operation requires a separate explicit user approval at execution time.

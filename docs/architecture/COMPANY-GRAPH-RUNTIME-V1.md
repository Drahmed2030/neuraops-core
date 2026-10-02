# NeuraOps Company Graph Runtime v1

## Status

This is a **pure, in-memory runtime contract** for the Agent Graph Kernel.

It does not persist state, execute external tools, send messages, create background jobs, or change the Health Cloud roadmap.

The implementation is:

`src/lib/graph/graph-runtime.mjs`

## Purpose

The runtime contract adds the minimum semantics needed to safely move a graph run through explicit states:

- run creation;
- current-node state;
- revisioned transitions;
- resumability;
- idempotency;
- approval capture;
- action execution evidence;
- terminal completion.

The runtime remains deliberately non-autonomous.

## Run state

Each run stores bounded metadata only:

- graph ID and version;
- opaque run reference;
- opaque idempotency key;
- current node;
- status;
- revision;
- step count;
- start/update/completion timestamps;
- opaque policy approval reference;
- opaque human approval reference;
- last command reference + command fingerprint;
- last action execution reference.

Raw prompts, message bodies, customer payloads, credentials and clinical narratives are not part of the run-state contract.

## Optimistic revision control

Every transition requires `expectedRevision`.

If the supplied revision does not match the current run revision, the transition fails closed with a revision conflict.

This prevents stale callers from moving the workflow from an old state.

## Command idempotency

Every transition requires a caller-provided `commandRef`.

The runtime stores an opaque hash of the command reference and a hash of its transition fingerprint.

If the same command is replayed with the same semantic transition, the runtime returns the existing state without incrementing the revision.

If the same command reference is reused with a different outcome or approval/execution references, the runtime rejects it as an idempotency conflict.

This prevents a duplicated delivery from becoming a duplicated action while also preventing key reuse from silently changing meaning.

## Resume semantics

A run can be resumed only when the caller supplies the original idempotency key.

The key is hashed before storage.

The runtime then revalidates:

- graph ID;
- graph version;
- current node;
- terminal status;
- timestamps;
- approval metadata;
- execution metadata.

A graph definition/version mismatch fails closed.

## Gate semantics

### Policy gate

An `approved` outcome from a policy gate requires a `policyDecisionRef`.

The raw reference is not retained; only an opaque SHA-256 reference is stored.

### Human gate

An `approved` outcome from a human gate requires a `humanApprovalRef`.

Again, only the opaque reference is retained.

A rejection can terminate the graph without an approval reference because rejection grants no authority.

## Action semantics

An action node cannot transition without an `actionExecutionRef`.

For an approval-required action, the runtime also verifies that a policy or human approval has already been recorded in the run.

The runtime does not itself execute the action.

A future adapter may execute an approved capability and return an execution receipt reference. That future adapter is outside this runtime contract.

## Node execution plan

`getGraphNodeExecutionPlan()` exposes only bounded runtime metadata:

- node kind;
- authority;
- risk;
- timeout;
- maximum attempts;
- retry backoff;
- whether approval is required.

It does not expose prompts, provider credentials or tool payloads.

## Company Opportunity proof flow

The current proof graph remains:

```
opportunity-event
  -> research
  -> qualify
  -> compliance-gate
  -> draft
  -> founder-approval
  -> dispatch
  -> record-evidence
```

The runtime can now represent this flow safely, but `dispatch` still has **no real outbound executor**.

## Explicit non-goals

This runtime does not include:

- database persistence;
- durable queues;
- cron/background execution;
- distributed locks;
- model-provider calls;
- tool registry bindings;
- Gmail/CRM dispatch;
- automatic company decisions;
- Health Cloud execution;
- clinical decisions;
- Supabase migrations;
- production secrets.

## Next safe increment

After this runtime contract is verified, the next safe work is:

1. a persistence **port/interface**, not a database migration;
2. a capability registry contract;
3. an evaluation/telemetry envelope;
4. a synthetic Company Operations runner;
5. only then, an explicitly approved outbound adapter.

Health Cloud remains outside this sequence until its roadmap reaches the appropriate orchestration phase.

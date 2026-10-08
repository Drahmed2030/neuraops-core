# NeuraOps Agent Graph Kernel v1

## Status

Architecture track: **parallel / non-disruptive**

This work does **not** reopen, replace, or reorder the current Health Cloud roadmap. It introduces a reusable orchestration contract in `neuraops-core` so the company can validate graph-based operations in a lower-risk domain before any future Health Cloud adoption.

Health Cloud remains governed by its existing phase gates and repository boundaries.

## Why this exists

NeuraOps needs a consistent way to move beyond one-shot agent calls without turning AI into the system of record.

The kernel models operational work as:

```
Event
  -> State-aware Graph
  -> Bounded Agent / Tool / Deterministic Node
  -> Policy or Human Gate
  -> Approved Action
  -> Evidence Receipt
  -> Next State
```

The governing principle is:

- the **graph** owns workflow order;
- the **state layer** owns operational truth;
- the **policy layer** owns authority boundaries;
- the **human gate** owns consequential approval where required;
- the **agent** is a bounded capability worker;
- the **evidence layer** records what occurred without retaining raw prompts or sensitive payloads.

## v1 contract

The machine-readable kernel is:

`src/lib/graph/graph-kernel.mjs`

It defines:

- graph identity and version;
- graph domain;
- start node;
- bounded node kinds;
- explicit authority level;
- risk level;
- timeout;
- bounded retry policy;
- explicit outcome transitions;
- terminal evidence nodes;
- approval-gated action nodes;
- metadata-only evidence receipts.

### Node kinds

- `event`
- `deterministic`
- `agent`
- `tool`
- `policy-gate`
- `human-gate`
- `action`
- `evidence`

### Authority model

- `read`
- `propose`
- `execute`

An agent node cannot hold `execute` authority.

An action node must:

1. explicitly hold `execute` authority;
2. declare `requiresApproval: true`; and
3. be reachable only from a policy gate or human gate.

This makes an agent proposal structurally different from an approved action.

## Deterministic transitions

Every transition is identified by:

- `from`
- `outcome`
- `to`

A given node cannot have two destinations for the same outcome.

Unknown outcomes fail closed.

Terminal evidence nodes cannot have outgoing transitions.

Unreachable nodes are rejected.

## Evidence receipts

`createGraphEvidenceReceipt()` stores bounded metadata only.

Receipts may contain:

- graph and node identifiers;
- graph version;
- status and outcome;
- timestamp and attempt;
- actor class;
- opaque references to the run, policy decision, human approval and other evidence.

Raw prompts, message bodies, clinical narratives, credentials, customer payloads, patient identifiers and arbitrary fields are not accepted by the receipt contract.

References are SHA-256 opaque before projection.

## First proof graph: Company Opportunity

The first implementation is:

`src/lib/graph/company-opportunity-graph.mjs`

Flow:

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

Negative or failed branches close at `closed-no-action`.

The proof deliberately keeps the first execution domain outside Health Cloud.

The `dispatch` node is an action, but this architecture commit does **not** provide an outbound email, CRM, financial, legal, clinical or production executor. It only proves the graph and authority contract.

## Why Company Operations first

Company Operations is suitable for the first proof because:

- failure does not affect clinical care;
- human approval is natural and visible;
- existing founder workflows already include research, drafting and explicit approval;
- the graph can be tested without PHI or hospital credentials;
- lessons can be carried into later product orchestration without changing Health Cloud phase order.

## Explicit non-goals

v1 does not add:

- an autonomous production agent runtime;
- background workers;
- queues;
- persistence;
- cron schedules;
- model-provider bindings;
- outbound communication adapters;
- self-modifying production prompts or policy;
- Health Cloud workflow execution;
- clinical decision authority;
- database migrations;
- Supabase changes.

## Future adoption path

Only after this contract proves useful should later work consider:

1. a run-state store;
2. idempotency and resumable execution;
3. durable queue adapters;
4. timeout/retry execution semantics;
5. tool capability registry;
6. evaluation and cost telemetry;
7. approval evidence binding;
8. Company Operations runtime;
9. Integration Graph;
10. Compliance Graph;
11. Health Cloud adoption at the appropriate future roadmap phase.

## Health Cloud boundary

If Health Cloud adopts this kernel later, the following rules remain mandatory:

- clinical source data remains authoritative outside the agent;
- AI cannot silently approve clinical decisions;
- clinical actions require their existing authorization context;
- break-glass and evidence rules remain intact;
- product/tenant/facility/department/record scope remains explicit;
- graph adoption must not weaken existing fail-closed controls;
- no completed Health Cloud phase is reopened merely to fit the graph abstraction.

## Acceptance criteria for v1

v1 is accepted when:

- graph definitions are structurally validated;
- duplicate and unknown transitions fail closed;
- unreachable nodes are rejected;
- agent execution authority is impossible;
- action nodes require an incoming gate;
- terminal nodes cannot transition;
- evidence receipts reject arbitrary/raw payload fields;
- the Company Opportunity proof graph validates;
- existing Health Cloud roadmap and repository remain untouched.

# NTRP Incident Replay & Data Lineage v0.1

## Purpose

P13 adds a deterministic, provider-independent lineage contract and a metadata-only incident replay projection to the existing NTRP Operations Read Model. It does not add incident persistence, event re-execution, remediation authority, autonomous recovery, or access to clinical data.

The machine-readable contract is `src/lib/trust/incident-lineage.mjs`. The projection is included in the existing authorized Operations API and Unified Trust & Operations Console.

## Record boundary

An Incident Lineage Record contains only:

- SHA-256 opaque lineage, incident, predecessor, and optional Trust Event references;
- approved Evidence Record references used internally for resolution;
- bounded phase, outcome, and sequence values;
- product, environment, classification, source label, and timestamp metadata.

Unknown fields are rejected. There is no `attributes`, `context`, `payload`, request body, response body, prompt, message, patient, diagnosis, clinical note, credential, token, email, phone, or direct user identifier field.

The constructor converts non-opaque lineage, incident, predecessor, and event references into SHA-256 values before the record can enter the model. Raw Evidence Record identifiers are used only for internal resolution and are omitted from the replay projection.

## Replay semantics

“Replay” means a read-only chronological reconstruction of sanitized metadata. It never:

- republishes or re-executes a Trust Event;
- calls a provider or application endpoint;
- retries a failed operation;
- changes incident, entitlement, recovery, payment, or deployment state;
- opens or merges a pull request;
- invokes a server action, queue, workflow, or remediation path.

Every projection declares:

- `replayMode: metadata-only`
- `executionAllowed: false`

The console rejects the entire snapshot if either value changes to an executable posture.

## Lineage truth rules

A replay is complete only when:

1. its steps form a continuous sequence beginning at 1;
2. each non-root predecessor points to the immediately preceding step;
3. all referenced Trust Events and Evidence Records resolve inside the approved product and environment scope;
4. the terminal effective phase is `recovered` or evidence-backed `verified`.

A declared verified step is projected as `verification-pending` / `unresolved` when its Evidence Record is missing or belongs to an unapproved product or environment. A shared reference may support a product-specific lineage; a NeuraOps reference cannot verify Cliniverse, a Cliniverse reference cannot verify NeuraOps, and shared lineage accepts shared references only.

Records carrying the same opaque incident reference cannot cross product or environment boundaries. Such a collision rejects the projection instead of combining authorities.

## Cliniverse isolation

Cliniverse lineage may eventually report sanitized control-plane stages such as Apple entitlement-verification detection or recovery. It must not include patient records, direct identifiers, diagnoses, clinical narratives, prompts, messages, or clinical payloads.

The `clinical-restricted` value remains a classification label only. It does not authorize clinical content to enter Trust Fabric.

## Current posture

The production projection truthfully reports zero incident timelines because no lineage persistence adapter is enabled. P13 establishes the contract, validation, API projection, privacy gate, and console view without fabricating operational history.

## Next gate

P14 may add explicitly reviewed recovery-drill evidence adapters and drill records. A persistence adapter for incident lineage remains a separate gate and must prove tenant/product isolation, retention, deletion, integrity, and no-raw-payload behavior before activation.

Apple and entitlement adapters remain on the roadmap as read-only control-plane integrations. They cannot change the clinical-data boundary or grant entitlement without authoritative Apple evidence.

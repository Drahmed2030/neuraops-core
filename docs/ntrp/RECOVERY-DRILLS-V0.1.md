# NTRP Recovery Drills v0.1

## Purpose

P14 adds a provider-independent Recovery Drill Record and a deterministic readiness projection to the NTRP Operations Read Model. It records metadata about exercises performed outside the console. It does not restore data, trigger failover, redeploy an application, recover an account, persist drill history, or change production authority.

The machine-readable contract is `src/lib/trust/recovery-drills.mjs`. The projection is included in the existing authorized, read-only Operations API and Unified Trust & Operations Console.

## Record boundary

A Recovery Drill Record contains only:

- an opaque SHA-256 drill reference and optional opaque approval reference;
- a Recovery Matrix service, objective version, exercise type, source, and product/environment scope;
- bounded lifecycle state and outcome values;
- start/completion timestamps and achieved RTO/RPO minute values; and
- Evidence Record references used only for internal resolution.

Unknown fields are rejected. There is no notes, exception narrative, backup content, database row, request/response body, credential, token, email, patient, diagnosis, clinical note, prompt, message, or raw payload field.

Raw drill and approval identifiers are converted to SHA-256 before the record enters the model. Raw Evidence Record identifiers are omitted from the public drill projection.

## Lifecycle rules

- `planned` and `running` records are `not-assessed`; they cannot declare completion, achieved RTO/RPO, or approval.
- `cancelled` records identify their closing time but cannot claim an assessed result.
- `completed` records require an assessed outcome, achieved RTO/RPO values, and at least one Evidence Record reference.
- a declared `passed` result additionally requires an opaque approval reference.

Lifecycle validation rejects contradictory records instead of repairing or inferring them.
Completed or cancelled timestamps after the read-model projection time are rejected rather than displayed as future proof.

## Verification truth rules

A completed drill is projected as verified only when all of the following are true:

1. its service exists in the current Recovery Matrix;
2. its product exactly matches the objective product;
3. its declared outcome is `passed`;
4. achieved RTO and RPO do not exceed the objective targets;
5. every Evidence Record resolves inside the approved product and environment boundary; and
6. every Evidence Record has kind `recovery-drill`, audit retention, and a generation time between drill start and projection time; and
7. opaque approval is present.

A declared pass with missing or cross-scope evidence is `verification-pending`. A pass that misses RTO or RPO requires remediation. Neither state verifies the recovery objective.

Shared evidence may support a product-specific drill, but a shared drill accepts shared evidence only. NeuraOps and Cliniverse evidence cannot verify each other. Evidence environment must exactly match the drill environment.

## Cadence posture

The read model derives one of six states for each Recovery Matrix objective:

- `not-run` — no drill record exists;
- `scheduled` — only planned/running/cancelled records exist;
- `verified` — the latest completed drill is evidence-backed, approved, within target, and inside cadence;
- `overdue` — the latest verified drill is older than the objective cadence;
- `verification-pending` — the latest completed pass met the objective but its evidence cannot yet verify it; or
- `needs-remediation` — the latest completed exercise failed, was partial, or missed RTO/RPO.

The latest completed result controls the current posture. A newer failure therefore supersedes an older verified display without deleting the older historical record. If results share the same completion timestamp, the more conservative result controls the displayed posture.

The drill projection never mutates the Recovery Matrix `readiness` or `objectiveStatus` declarations. Changing those governed declarations remains a separate reviewed decision after the drill evidence is accepted.

## Non-execution boundary

Every projection declares:

- `drillMode: evidence-records-only`
- `executionAllowed: false`
- `persistenceEnabled: false`

The console rejects the entire snapshot if any of these values changes to an executable or persistence-enabled posture. No POST route, server action, queue, workflow, remediation adapter, recovery command, or provider mutation is introduced.

## Cliniverse isolation

Cliniverse drills may eventually report sanitized control-plane exercises such as Apple subscription-verification dependency loss and recovery. They must not include patient data, clinical content, direct identifiers, prompts, messages, or payloads. Drill evidence cannot grant or revoke entitlement and cannot substitute for authoritative Apple evidence.

## Current posture

Production truthfully reports zero drill records because no recovery-drill persistence or evidence source is enabled. Recovery Matrix objectives therefore remain `not-run` in the drill projection and retain their existing target/partial/gap declarations. P14 establishes the contract, validation, read-only API projection, console view, cadence calculation, and fail-closed security gate without fabricating an exercise.

P15 adds the default-off, read-only Vercel redeploy evidence adapter defined in `docs/ntrp/VERCEL-REDEPLOY-EVIDENCE-ADAPTER-V0.1.md`. The adapter is not an evidence source by itself and is not wired into production. It cannot convert an ordinary deployment into a drill or change the zero-record posture.

## Next gate

P16 may schedule one explicitly approved NeuraOps production redeploy exercise, execute it outside the adapter, and use the P15 reader once to produce candidate Evidence and Recovery Drill records. Temporary source binding remains a separate reviewed gate and must preserve product/environment isolation, integrity, retention, deletion, and no-raw-payload behavior.

Apple and entitlement integrations remain a separate read-only control-plane track. No adapter may change entitlement or cross the Cliniverse clinical-data boundary.

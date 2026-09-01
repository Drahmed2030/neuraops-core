# NTRP Unified Trust & Operations Console v1

## Surface

`/dashboard/operations` is the authenticated, read-only operator surface for the NTRP Operations Read Model. It renders inside the existing NeuraOps dashboard boundary and is excluded from search indexing.

The page does not call its own HTTP API. On the server it verifies the current Supabase identity against the same server-only `NTRP_OPERATOR_USER_IDS` allowlist used by the Operations API, then invokes the shared pure response builder. This avoids an internal network round trip while preserving the P11 authorization and projection contract.

## Fail-closed behavior

- unauthenticated requests return to the login boundary;
- authenticated users outside the operator allowlist receive a generic closed-gate view;
- missing or malformed authorization configuration and projection failures receive a generic unavailable view;
- no identity, allowlist value, provider exception, or configuration detail is serialized to the console;
- the page is dynamic and never statically captures an operator snapshot.

The console also re-checks the display privacy flags before accepting a snapshot. If raw payloads, event attributes, direct identifiers, or clinical data are ever marked as included, the entire projection is rejected rather than partially rendered. It also rejects executable incident replay or any Recovery Drill projection that enables execution or persistence.

## Read-only contract

The console contains no remediation, deployment, merge, entitlement, payment, recovery, configuration, or other mutation controls. It displays:

- the declared Recovery Matrix targets and evidence-backed readiness state;
- aggregate Trust Event and Evidence Record counts;
- unresolved evidence-reference posture;
- NeuraOps, shared, and Cliniverse control-plane scope counts;
- metadata-only incident replay and data-lineage posture;
- evidence-record-only Recovery Drill results and cadence posture; and
- the active privacy boundary.

The initial state truthfully reports zero runtime Trust Events and Evidence Records because no persistence adapter is enabled yet. Static Recovery Matrix objectives remain targets unless valid, product-scoped recovery-drill evidence proves them.

## Cliniverse isolation

Cliniverse remains a separate clinical system and data authority. The console can display only approved aggregate control-plane metadata and the declared Apple subscription-verification recovery objective. It never reads or renders patient records, direct identifiers, diagnoses, clinical notes, prompts, messages, or clinical payloads.

Apple and entitlement integrations remain future read-only Trust Fabric adapters. Their eventual outputs must satisfy the existing Evidence Record and product-scope validation before they can affect a displayed verification claim.

## Incident lineage extension

P13 adds the contract defined in `docs/ntrp/INCIDENT-REPLAY-DATA-LINEAGE-V0.1.md`. Replay is a display-only reconstruction of sanitized metadata with execution explicitly disabled. The console rejects snapshots that attempt to enable executable replay.

## Recovery-drill extension

P14 adds the contract defined in `docs/ntrp/RECOVERY-DRILLS-V0.1.md`. It displays achieved RTO/RPO, Evidence Record resolution, and per-objective cadence status. The production zero state is explicit because no persistence or provider adapter is enabled.

## Next gate

P15 may add one explicitly reviewed read-only recovery-evidence adapter. It may not execute recovery, enable autonomous remediation, or weaken the operator allowlist, product/environment isolation, evidence integrity, or clinical-data boundary.

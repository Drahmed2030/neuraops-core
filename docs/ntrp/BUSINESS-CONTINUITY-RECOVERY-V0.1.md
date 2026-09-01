# NeuraOps Business Continuity & Recovery v0.1

## Purpose

This plan defines internal recovery objectives and degraded-mode expectations for critical NeuraOps and Cliniverse dependencies. It does not claim that backup, failover, or restore capability has been proven unless an objective is explicitly marked `verified` and linked to evidence.

The machine-readable source of truth is `src/lib/trust/recovery-matrix.mjs`.

## Truth model

Each service has two independent concepts:

- **Objective status** — `target` or `verified`. A target is an internal recovery goal, not a provider SLA or proven restore time.
- **Readiness** — `verified`, `partial`, or `gap`. `verified` requires evidence from an actual restore/failover drill.

A recovery objective MUST NOT be marked verified without an evidence reference.

## Tier model

- **Tier 0** — identity, data authority, or production runtime foundations whose failure can stop trusted operation.
- **Tier 1** — major operational dependencies where controlled degradation is acceptable for a limited period.
- **Tier 2** — important business services that can tolerate a longer interruption.
- **Tier 3** — non-authoritative support services such as creative/media production.

## Current posture

The initial matrix intentionally contains no `verified` recovery claims. Existing controls such as CI, incident sensing, provider fallbacks, source control, and trusted entitlement rules improve resilience, but they do not by themselves prove restore capability.

Initial gaps include provider-independent B2B payment recovery, DNS/domain recovery evidence, and media asset recovery/export procedures. These remain visible rather than being represented as completed controls.

## Degraded-mode principles

1. Authentication failure must never be bypassed to preserve availability.
2. Privileged database writes fail closed when authority cannot be established.
3. AI-provider outages use controlled fallback/human escalation rather than fabricated provider success.
4. CI outages block releases that require unavailable security/reliability gates.
5. Apple subscription outages do not create new trusted subscription authority without verified Apple evidence.
6. B2B payment outages do not activate paid entitlement without verified settlement evidence.
7. Media tooling outages must not affect clinical, security, commerce, or entitlement authority.

## Recovery evidence

Future restore drills should create Trust Fabric Evidence records containing only operational metadata and integrity references. Credentials, backup contents, customer data, patient data, clinical notes, tokens, and other sensitive payloads must remain outside Trust Fabric.

Evidence should identify:

- service and recovery objective version
- drill date/time
- achieved RTO/RPO
- outcome and material exceptions
- integrity hash or external evidence reference
- approving operator or system reference using an opaque identifier

## Next actions

1. Verify export/restore capability for Supabase and record an evidence-backed drill.
2. Verify a known-good redeployment path for Vercel from authoritative source.
3. Document account/credential recovery ownership without storing credentials in source control.
4. Define domain/DNS registrar recovery and export procedures.
5. Select and validate the B2B payment provider before changing that entry from `gap`.
6. Add a read-only recovery status projection to the NTRP Operations API and Console.

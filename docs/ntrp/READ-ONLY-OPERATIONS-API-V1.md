# NTRP Read-only Operations API v1

## Endpoint

`GET /api/operations/v1/snapshot`

This endpoint returns the privacy-safe Operations Read Model introduced in P10. It has no mutation methods and does not authorize remediation, deployment, merge, entitlement, payment, recovery, or configuration changes.

## Operator authorization

Access requires both:

1. a server-verified Supabase user from `auth.getUser()`; and
2. the exact Supabase user UUID in the server-only `NTRP_OPERATOR_USER_IDS` allowlist.

The environment value is a comma-separated list of UUIDs. It must not use the `NEXT_PUBLIC_` prefix.

Email addresses, profile fields, and user-editable metadata do not grant access. The service-role key is not imported or used by this endpoint. Missing, malformed, oversized, or duplicate allowlist configuration fails closed.

## Failure semantics

- `401 authentication_required` — no server-verified user.
- `403 operations_access_denied` — verified user is not an approved NTRP operator.
- `503 operations_unavailable` — authorization configuration, identity verification, or read-model projection is unavailable.

Errors are deliberately generic and contain no provider exception, user identifier, credential, or configuration detail.

## Cache and transport boundary

Every response uses private `no-store` semantics, disables surrogate caching, varies on the session cookie, and declares `nosniff`. No permissive cross-origin policy is added.

## Current data posture

The API exposes the approved static Recovery Matrix together with honest Trust Event, Evidence, metadata-only Incident Lineage, and Recovery Drill projections. The current default remains zero runtime events, evidence records, incident timelines, and drill records because no evidence source or persistence adapter is claimed or fabricated.

P15 adds a default-off Vercel redeploy evidence reader. It is deliberately not imported by this route or its read-model factory. A later, separately reviewed source binding may contribute only its validated Evidence and Recovery Drill records. The API contract must continue to omit raw event attributes, direct identifiers, evidence payloads, credentials, customer data, patient data, and clinical narratives.

Incident replay declares `metadata-only` mode and `executionAllowed: false`. It reconstructs sanitized lineage but never re-executes an event or invokes a remediation path.

Recovery drills declare `evidence-records-only`, `executionAllowed: false`, and `persistenceEnabled: false`. They report evidence resolution, achieved RTO/RPO, and cadence posture but never invoke a recovery operation.

## Cliniverse boundary

Cliniverse remains a separate clinical system. This endpoint may eventually report aggregate, privacy-safe control-plane metadata such as the count of entitlement-verification events, but it must never read or expose patient records, clinical notes, diagnoses, prompts, messages, or clinical payloads.

## Next gate

P16 may consume candidate records from one explicitly approved, externally executed NeuraOps production redeploy drill after verifying the P15 adapter output. It cannot add an API mutation method, expose the provider credential, execute a drill, enable persistence without a separate gate, or weaken the authorization, privacy, evidence, product, and environment boundaries.

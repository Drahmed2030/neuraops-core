# NeuraOps Runtime Observability & Recovery v1

## Scope

This contract governs the authoritative `neuraops-core` runtime only. It does not change Health Cloud, Cliniverse, Apple distribution, payment authority, Supabase recovery claims, or DNS configuration.

Authoritative production project:

- Vercel project: `neuraops-core`
- Production domain: `getneuraops.com`
- Source repository: `Drahmed2030/neuraops-core`
- Production branch: `main`

The duplicate Vercel project `neuraops-core-snnv` is non-authoritative and must not be used as a production health signal or rollback target unless separately re-approved.

## Runtime signals

### Liveness

`GET /api/live`

Answers only whether the application process can serve a request. It does not test Supabase or other dependencies.

### Readiness

`GET /api/ready`

Checks the current Supabase dependency required by the existing runtime. Dependency failure returns HTTP 503 and must not be interpreted as process death.

### Compatibility health

`GET /api/health`

Preserved for existing clients. It remains dependency-aware and now includes the same privacy-safe release fingerprint headers.

## Release fingerprint

Responses expose only bounded operational metadata:

- service
- environment
- shortened commit release identifier
- deployment identifier in the JSON body where available

No token, credential, customer content, patient data, or secret environment value is emitted.

## Correlation

API traffic receives:

- `x-neuraops-request-id`
- `x-neuraops-correlation-id`

Incoming correlation identifiers are preserved only when they match the bounded opaque identifier grammar. Malformed or unbounded external values are replaced with the generated request id.

## Detection policy

Production release decisions use evidence in this order:

1. deployment state
2. liveness
3. readiness
4. HTTP 5xx/error-rate evidence
5. dependency-specific evidence
6. operator confirmation for destructive or authority-changing action

One failed signal must not automatically trigger a rollback without classifying the failure domain.

## Recovery decision table

| Failure class | First action | Degraded mode | Rollback? | Human gate |
|---|---|---|---|---|
| Process/liveness failure | verify deployment state + repeated probe | unavailable | yes, if release-caused | required |
| Readiness/Supabase failure | isolate dependency + bounded retry | fail closed for privileged writes | no, unless release-caused | required |
| 5xx regression after release | freeze releases + compare previous known-good | preserve last known-good | yes | required |
| AI provider outage | controlled fallback/handoff | non-AI path | no | policy dependent |
| Identity failure | deny privileged access | fail closed | no automatic rollback | required |
| DNS failure | freeze DNS mutation | preserve known-good records | provider-specific | required |

## Known-good production ladder

Evidence captured before this contract:

1. `45fe580cfbbdaa2f90909b18d06ce1b453829e5f` — READY
2. `c9565b41ed21ed659a7b046d486f912ba3b3c24e` — READY
3. `d04b007e7cfe81a358ea8969ccce8f003983ee7d` — READY

These are rollback candidates, not automatic rollback instructions.

## Synthetic probe

Run manually:

```bash
npm run probe:production
```

Override the target only for an approved preview or drill:

```bash
NEURAOPS_PROBE_BASE_URL=https://example-preview.vercel.app npm run probe:production
```

No recurring external monitor is enabled by this change.

## Recovery evidence gate

A recovery objective remains `partial` or `gap` until an explicitly approved drill produces evidence demonstrating the achieved RTO/RPO. A normal deploy, preview, or successful probe is not a recovery drill.

No automatic rollback, promote, redeploy, DNS mutation, database restore, or deletion is authorized by this contract.

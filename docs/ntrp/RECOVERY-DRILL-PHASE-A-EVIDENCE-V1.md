# NeuraOps Recovery Drill — Phase A Evidence v1

## Status

Phase A: PASSED

This is a non-invasive recovery rehearsal. No production traffic was changed. No rollback, promote, redeploy, DNS mutation, database restore, or failover action was executed.

The `vercel-runtime` recovery objective remains:

- readiness: `partial`
- objectiveStatus: `target`

This document must not be used to claim a verified RTO or RPO.

## Authoritative runtime

- repository: `Drahmed2030/neuraops-core`
- production branch: `main`
- Vercel team: `Cliniverse-Ai`
- authoritative Vercel project: `neuraops-core`
- authoritative Vercel project ID: `prj_RjF2s10VCS3VnylALtzTVqZr6omx`
- production domain: `getneuraops.com`
- secondary production domain: `www.getneuraops.com`

The Vercel project `neuraops-core-snnv` remains non-authoritative and is excluded from recovery decisions.

## Current production evidence

- production SHA: `8df7697208cbd8e2ece79eea45cc7b9f8bec324f`
- production deployment: `dpl_2e7jkeGqXusGWKfYPsWjK3z4MtFw`
- deployment state: `READY`
- target: `production`
- alias error: none
- Git tree: `473796b80af95a7c7f81c3363f76e3c3f6c66535`

Observed production checks:

- `GET /api/live` -> HTTP 200
- `GET /api/ready` -> HTTP 200
- `GET /api/health` -> HTTP 200
- readiness database state -> `ok`
- runtime environment -> `production`
- request/correlation identifiers -> present
- recent production 5xx window checked -> none observed

## Preferred rollback candidate

Selected Phase B candidate:

- SHA: `abe879a847e692a0a574a4b63eb909de1f4328a0`
- deployment: `dpl_8ULDTKmdKpZSSmRJYisH7hkcBFVD`
- deployment URL: `https://neuraops-core-11is5rahx-cliniverse-ai.vercel.app`
- state: `READY`
- environment: `preview`
- Git tree: `473796b80af95a7c7f81c3363f76e3c3f6c66535`

The candidate Git tree is identical to the current production Git tree.

This makes it suitable for a future traffic-switch drill because infrastructure recovery can be exercised without introducing a code-content difference.

Candidate checks observed:

- `GET /api/live` -> HTTP 200
- `GET /api/ready` -> HTTP 200
- `GET /api/health` -> HTTP 200
- readiness database state -> `ok`
- request/correlation identifiers -> present
- release fingerprint -> present

## Historical production fallback

Historical production deployment:

- SHA: `a04d844a715aec72199ed957ff5bbf14fe3cdc3e`
- deployment: `dpl_DgH8fGj6iMrRf2pnbMGGpgwMqB6o`
- state: `READY`

Observed compatibility:

- `GET /api/health` -> HTTP 200
- `GET /api/live` -> HTTP 404
- `GET /api/ready` -> HTTP 404

The 404 results are expected because the liveness/readiness split was introduced after that deployment.

For Phase B, this deployment is a secondary historical fallback, not the preferred drill target.

## Candidate selection decision

Preferred target: `dpl_8ULDTKmdKpZSSmRJYisH7hkcBFVD`

Reasons:

1. READY state confirmed;
2. independent deployment confirmed;
3. identical Git tree to current production;
4. liveness/readiness/health checks all available;
5. correlation and release metadata available;
6. no production traffic change is required to validate it during Phase A.

## Theoretical rollback path

If a separate Phase B approval is granted, the provider-supported rollback target would be the preferred deployment ID above.

A theoretical operator action is:

```
vercel rollback dpl_8ULDTKmdKpZSSmRJYisH7hkcBFVD
```

or the equivalent Vercel rollback API operation.

This command was NOT executed during Phase A.

## Phase B preconditions

Before any traffic-changing drill:

1. re-confirm current production deployment ID and SHA;
2. re-confirm preferred target remains READY;
3. run candidate liveness/readiness checks immediately before the drill;
4. confirm production 5xx baseline;
5. capture an explicit operator approval reference outside source code;
6. start a measured timer;
7. define whether final state returns to the original deployment or remains on the candidate;
8. define the acceptance window and abort thresholds.

## Abort criteria

Abort immediately if:

- authoritative project identity is ambiguous;
- production aliases point somewhere unexpected;
- candidate state is not READY;
- candidate readiness is not healthy;
- an unrelated dependency incident is active;
- unexpected auth behavior appears;
- 5xx errors increase after a traffic change;
- sensitive data would enter the evidence path;
- operator cannot prove the final production state.

## Phase A result

Phase A passes because:

- authoritative runtime ownership is known;
- current production state is known;
- an independent preferred recovery candidate is known;
- the candidate is READY;
- the candidate has identical code content to production;
- synthetic health signals are healthy;
- a secondary historical fallback is documented;
- the theoretical rollback path is known;
- no production traffic was changed.

## What Phase A does not prove

Phase A does not prove:

- achieved production RTO;
- achieved production RPO;
- production traffic-switch success;
- restore/failover success under an actual outage;
- DNS recovery;
- Supabase backup/restore capability;
- autonomous recovery.

The governed Recovery Matrix must remain unchanged until a separately approved Phase B drill produces valid evidence.

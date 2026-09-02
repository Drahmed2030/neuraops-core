# NTRP Vercel Redeploy Evidence Adapter v0.1

## Purpose

P15 adds the first provider-specific Trust Fabric adapter: a server-only, read-only evidence reader for one explicitly approved NeuraOps production redeploy exercise. Its machine-readable implementation is `src/lib/trust/vercel-redeploy-evidence-adapter.mjs`.

The adapter does not deploy, promote, roll back, cancel, delete, alias, or configure anything. It performs one authenticated `GET /v13/deployments/{id}` request after an exercise has been completed elsewhere, reduces the response to allowlisted facts, and returns one Evidence Record plus one Recovery Drill Record in memory.

## Activation posture

The adapter is default-off. It is not imported by the Operations API, console, or read-model factory, and no Vercel token or drill record is configured in the production application. P15 therefore does not claim that a recovery exercise occurred and does not change the production zero-record posture.

A normal successful deployment is not a recovery drill. A later gate must explicitly approve a drill reference, approval reference, exact commit SHA, and bounded exercise window before this adapter can read the resulting deployment.

## Authority boundary

The adapter is locked in code to all of the following:

- the official `neuraops-core` Vercel project and team, not the duplicate `neuraops-core-snnv` project;
- the authoritative `Drahmed2030/neuraops-core` repository;
- the `main` branch;
- a caller-declared exact 40-character commit SHA;
- a Git commit Vercel reports as verified;
- a `production` deployment whose source is Git and terminal state is `READY`; and
- product `neuraops`, environment `production`, service `vercel-runtime`, and exercise type `redeploy`.

Project, repository, branch, product, environment, service, provider, and HTTP method cannot be selected through the drill policy. A mismatch fails closed and produces no Evidence Record.

## Approved drill policy

The external approval policy contains only:

- schema version;
- expected commit SHA;
- opaque exercise and approval references; and
- canonical ISO start and completion timestamps for a maximum 24-hour exercise window.

Unknown policy fields are rejected. Raw URLs, email addresses, names, notes, exception narratives, logs, request bodies, clinical content, credentials, or arbitrary payloads are not accepted.

The Vercel deployment must be created and become ready inside the approved window. The adapter calculates achieved RTO from the full approved exercise window and sets RPO to zero only because the ready deployment is proven to use the exact approved commit SHA.

## Provider response reduction

The Vercel response is bounded to 64 KiB and is never returned or persisted. Only these normalized facts contribute to the evidence integrity hash:

- deployment and project identifiers;
- official project name;
- production target, Git source, and `READY` state;
- created, build-started, and ready timestamps;
- authoritative repository and `main` reference;
- exact commit SHA and verified-commit marker; and
- adapter schema/provider identifiers.

Creator identity, email, commit message, aliases, deployment URL, logs, configuration, environment variables, and all other response fields are discarded. Deployment, project, team, repository, location, exercise, and approval identifiers are opaque or SHA-256 referenced in the exported contracts.

## Credential, retention, and deletion controls

- The Vercel credential is supplied only to the server-side function call and is used only in the `Authorization` header.
- The module does not read a public environment variable, serialize the credential, log it, or include it in an error.
- Requests use `cache: no-store`, reject redirects, and have a bounded timeout.
- Non-success responses and malformed provider data return generic adapter errors without provider response bodies.
- The adapter has no filesystem, database, Supabase, queue, or other persistence path.
- `persistenceEnabled` and `rawPayloadsRetained` are both `false`; deletion remains governed by the authoritative Vercel source because the adapter holds no copy to delete.
- A normalized Evidence Record uses `audit` retention semantics only if a later, separately reviewed evidence source chooses to retain that record.

## Cliniverse isolation

This adapter cannot select or emit the `cliniverse` product, access a Cliniverse project, read Apple or entitlement state, or ingest any clinical field. Cliniverse patient records, diagnoses, notes, prompts, messages, identifiers, and clinical payloads remain outside NeuraOps and Trust Fabric.

Apple and entitlement evidence remains a separate future read-only control-plane adapter and cannot reuse Vercel redeploy evidence to grant subscription authority.

## Next gate

P16 may schedule and explicitly approve one real NeuraOps production redeploy exercise in a controlled window, execute the redeploy outside this adapter, and invoke the adapter once with a narrowly scoped server-side Vercel read credential. P16 must verify the resulting Evidence and Recovery Drill records before any temporary source binding is allowed into the Operations Read Model.

P16 may not treat an ordinary release as a drill, place a Vercel token in a client or public environment variable, enable persistence implicitly, perform deployment from the Operations API or console, or change a Recovery Matrix objective from target/partial to verified without a separate governed decision.

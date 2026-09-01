# NTRP Evidence & Operations Read Model v0.1

## Purpose

This phase turns Trust Fabric metadata into a deterministic, provider-independent read model for the future read-only Operations API and Unified Trust & Operations Console. It does not add a persistence provider, production write path, remediation authority, or clinical data store.

## Evidence boundary

An Evidence Record contains only:

- an opaque evidence ID
- evidence kind and provider-independent source label
- product and environment scope
- SHA-256 integrity value
- data-classification and retention labels
- generation time
- an optional SHA-256 opaque location reference

Unknown fields are rejected. Raw evidence content, URLs, paths, credentials, tokens, prompts, message bodies, customer data, patient identifiers, clinical narratives, and other payloads are not accepted by the Evidence Record contract.

Evidence content remains in its authoritative system. Trust Fabric stores only the integrity and lookup metadata needed to establish a lineage relationship later.

## Read-model boundary

The Operations Read Model is an allowlisted projection. It exposes aggregate counts and approved recovery-objective metadata, but never emits Trust Event `attributes`, raw evidence payloads, direct identifiers, or clinical content.

The model is:

- read-only and deeply immutable after construction
- deterministic when `generatedAt` is supplied
- independent of Supabase, Vercel, Apple, OpenAI, payment providers, and other adapters
- safe to use as the domain source for a separately authorized API layer

## Verification truth rules

A recovery objective is effectively `verified` only when all of the following are true:

1. declared readiness is `verified`
2. declared objective status is `verified`
3. at least one evidence reference exists
4. every reference resolves to a structurally valid Evidence Record
5. every record belongs to the objective product or to the approved shared scope

Missing or cross-product evidence fails closed: the read model projects the objective as `target` / `partial` and emits a verification issue. It does not reject the entire console projection or preserve an unsupported verified claim.

Shared evidence may support a product-specific NeuraOps or Cliniverse objective. NeuraOps evidence cannot support a Cliniverse objective, Cliniverse evidence cannot support a NeuraOps objective, and a shared objective requires shared evidence.

## Cliniverse isolation

Cliniverse may contribute privacy-safe control-plane metadata, such as the existence of an Apple entitlement-verification event. Patient data, clinical notes, clinical prompts, diagnoses, message bodies, and clinical payloads remain in the Cliniverse clinical system and never enter this model.

The `clinical-restricted` classification is counted only as a label. The associated event attributes are deliberately omitted from the read model.

## Evolution gates

P11 exposed this projection through the explicitly authorized, private `no-store` Operations API. P12 added the fail-closed Unified Trust & Operations Console. P13 extends the same read model with the metadata-only contract in `docs/ntrp/INCIDENT-REPLAY-DATA-LINEAGE-V0.1.md`.

These additive phases do not change the Evidence Record payload boundary or authorize persistence, mutation, remediation, or clinical-data access.

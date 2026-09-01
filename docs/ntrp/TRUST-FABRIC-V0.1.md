# NeuraOps Trust & Resilience Platform — Trust Fabric v0.1

## Purpose

Trust Fabric is the internal, provider-independent trust layer for NeuraOps products. It normalizes operational truth so NeuraOps Core, Cliniverse AI, future products, and the read-only Operations Console can share the same semantics without sharing raw sensitive payloads.

Trust Fabric v0.1 is an internal platform capability. It is not a separately marketed product and does not authorize new production writes.

## Domains

- Identity — who or what is acting and the assurance level.
- Policy — allow, deny, or review decisions and their evidence.
- Evidence — integrity-addressed proof records and retention class.
- Observability — service and operation health snapshots.
- Incident — incident severity, lifecycle, and remediation disposition.
- Entitlement — trusted access state and its authority/evidence.
- Recovery — service recovery objectives and degraded-mode expectations.

## Privacy boundary

Trust Fabric MUST NOT contain raw patient data, clinical narratives, prompts, message bodies, passwords, tokens, API keys, cookies, authorization headers, email addresses, phone numbers, or other direct sensitive payloads.

Clinical systems may emit metadata about a clinically restricted event only when the payload itself remains outside Trust Fabric. Stable correlation should use opaque references or cryptographic hashes rather than raw identifiers.

`clinical-restricted` is a classification label, not permission to persist clinical content.

## Provider independence

The domain contracts must not depend on Supabase, Vercel, Sentry, OpenAI, Apple, payment processors, or any other external provider. Providers connect through adapters and translate their native state into Trust Fabric semantics.

A provider may be replaced without changing the core domain contract.

## Control-plane posture

The first Operations Console and operations adapters are read-only. Trust Fabric v0.1 does not introduce auto-remediation, auto-merge, auto-deploy, credential rotation, payment mutation, entitlement mutation, or production configuration changes.

Existing reliability policy remains authoritative: automated analysis may recommend `observe`, `open-fix-pr`, or `human-escalation`; it may not merge or deploy by itself.

## Event contract

Every runtime Trust Event includes:

- schema version
- unique event ID
- domain and event type
- provider-independent source label
- data classification
- product and environment
- optional correlation and trace identifiers
- sanitized attributes only

Raw subject identifiers are converted to SHA-256 references before entering the event envelope.

## Next phases

1. Recovery Objective Matrix and dependency inventory.
2. Evidence/read-model aggregation.
3. Read-only Operations API.
4. Unified Trust & Operations Console using NXS presentation standards.
5. Only after proven authorization and audit controls: carefully scoped remediation actions.

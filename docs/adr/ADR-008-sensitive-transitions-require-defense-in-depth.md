# ADR-008 — Sensitive lifecycle transitions require defense in depth

Status: Accepted

## Decision
Financial/access-sensitive transitions are guarded at more than one layer when practical.

Examples:
- payment settlement validates provider/payment scope in application logic and commits atomically in persistence
- `PILOT_ACTIVE` requires a valid active entitlement in service logic and a database guard
- duplicate provider events are idempotent; conflicting event identity fails closed
- browser/client code never receives service-role credentials

## Principle
A privileged server bug must not be sufficient by itself to silently grant access or rewrite commercial truth.

## Future use
Cliniverse Apple subscription activation must follow the same pattern: verified Apple transaction -> expected subscription/payment correlation -> atomic entitlement -> `SUBSCRIPTION_ACTIVE`, with revocation/refund handling added before production readiness.

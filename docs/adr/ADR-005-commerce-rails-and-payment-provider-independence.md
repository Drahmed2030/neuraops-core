# ADR-005 — Commerce rails stay provider-independent

Status: Accepted

## Decision
Control Plane owns commerce truth, payment intent, settlement state, entitlement, activation, evidence, and auditability. External payment systems remain replaceable adapters.

- Nexus B2B web payments may use a gateway adapter when useful.
- Nexus may use `manual_invoice` / verified bank transfer as an operational fallback without restructuring Control Plane.
- Cliniverse consumer digital purchases on iOS use the Apple IAP rail.
- No provider directly grants product access.

## Invariant
Changing `Moyasar -> bank transfer -> another approved B2B provider` must not require rebuilding lifecycle, settlement, entitlement, Proof, or Renewal.

## Current execution policy
Moyasar sandbox integration remains CODE-READY but is not allowed to block the roadmap. Live provider/KYC work is deferred until it reduces operational burden or is required for scale.

## Security / compliance
- No cardholder data in Control Plane.
- No PHI in Control Plane.
- Live payment activation remains a legal/financial gate.
- Manual bank transfer confirmation requires an auditable human/operator confirmation before `PAYMENT_RECEIVED`.
- Apple IAP remains isolated from Nexus B2B commerce.

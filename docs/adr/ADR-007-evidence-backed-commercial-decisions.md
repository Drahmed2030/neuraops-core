# ADR-007 — Commercial decisions require persisted evidence

Status: Accepted

## Decision
Commercial claims, renewal recommendations, and expansion recommendations must derive from persisted evidence rather than transient UI input or model assertions.

## Required chain
Persisted measurement events -> Proof Snapshot -> evidenceHash/sourceEventIds -> versioned policy -> decisionHash -> immutable recommendation record.

## Invariants
- Baseline cannot be silently rewritten after outcome capture.
- Forged/missing source events fail closed.
- Recommendation does not automatically renew, charge, or extend entitlement.
- Synthetic development measurements must never be represented as customer evidence.

## Future use
Audit Evidence Pack and Incident Replay Engine should consume this same provenance chain rather than inventing a parallel evidence model.

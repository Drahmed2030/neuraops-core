# ADR-006 — Control Plane is non-clinical operational infrastructure

Status: Accepted

## Decision
Control Plane stores operational/commercial lifecycle truth only. It must not become a clinical record store.

Allowed examples:
- organization / engagement identifiers
- aggregate operational KPIs
- payment and entitlement state
- booking references
- policy versions
- evidence/provenance hashes
- renewal/expansion decisions

Forbidden examples:
- patient names or direct identifiers
- clinical notes
- diagnoses tied to identifiable patients
- medication lists tied to identifiable patients
- raw clinical documents

## Integration rule
Cliniverse may consume entitlements and publish narrowly scoped non-clinical lifecycle events, but clinical data remains in Cliniverse's clinical boundary.

## Future gate
Data Lineage & Semantic Contract Guard will enforce classification, semantic units, source/version, retention class, allowed destinations, and PHI restrictions before wider enterprise integrations.

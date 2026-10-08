# Recording-only migration recovery

Target: neuraops-global-core (`dvgekyzxdwhrndsjnpkd`).
User explicitly authorized application on 8 October 2026.

Before apply: the recorded public table columns and all three disabled operating
controls match the catalog baseline; the six original identities match; gateway
ACLs retain service-role-only public access. Previous gateway definitions are
preserved in `evidence/release-target-preflight.json`.

The combined migration was applied and rolled back against the local baseline.
Rollback restored the original gateway, agent count and absence of approval
bindings. A subsequent committed application succeeded. Evidence:
`evidence/release-transaction-recovery.json`. Native independent-session tests
cover the new delegated budget contention in `evidence/release-native-delegation/`.

Failure during transaction: abort the migration; do not continue partial DDL.
Failure after commit: keep COMPANY_APPROVAL_RECORDING_ENABLED off and all three
execution controls off. Keep the current deployed main application (or restore
that build if a later application release fails). Preserve new evidence tables;
do not drop them or restore the older, less restrictive execution gateway merely
to remove the release. Diagnose and issue a corrective migration before retrying.

This is an additive, execution-disabled recording release. It is not activation
of an agent worker. No database restore, destructive down migration or automatic
schema retry is authorized by this procedure.

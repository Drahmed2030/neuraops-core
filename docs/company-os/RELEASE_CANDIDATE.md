# Company OS recording release candidate

Integration base: `b432474080e9e0f7b9a235d2634188ba0e36bf87` (remote main,
verified 2026-10-08). Imported Company OS source:
`bd0d893f8cc592abca540e4249744af3547414b6`.

Only Company OS code, fixtures, tools and evidence were imported. Founder login,
recovery, security headers and analytics protections are byte-identical to main.
Typecheck on the integrated tree passed. Dependencies used the existing lockfile
with lifecycle scripts disabled. Earlier test receipts retain their source hashes
and are not relabeled as fresh integrated-tree verification.

The page `/dashboard/control/requests` is linked from Company Control. Server
actions verify the operator before accessing the privileged SQL transport.
`COMPANY_APPROVAL_RECORDING_ENABLED` defaults off. Model execution remains denied.

Read-only target check: project `dvgekyzxdwhrndsjnpkd` has none of the new
assignment, approval-binding or request-binding tables. No SQL was applied.
Candidate SQL is intentionally outside the release migration directory.

## Remaining release gates

- Review the cumulative release diff and target schema/grant drift; preserve a
  tested recovery path before application.
- Convert the reviewed SQL to tracked migrations; verify latest delegated-budget
  behavior with independent native PostgreSQL sessions (embedded tests do not
  establish concurrency).
- Apply and verify the exact schema candidate, then enable recording for the
  intended environment only and test the authenticated request/review flow.
- Assignment activation, approval consumption and the actual agent executor are
  separate unfinished implementation. This candidate does not activate them.

Do not merge this draft as evidence of live agent readiness. Do not enable a
recording flag while its required SQL functions are absent.

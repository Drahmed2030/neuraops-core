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

## Applied recording schema — 2026-10-08

Independent cumulative review: APPROVE_RECORDING_SCHEMA. Target schema drift
preflight and transactional rollback verification passed. Native PostgreSQL 17.11
verification passed three checks, including separate-session commit/rollback races.

Applied to project `dvgekyzxdwhrndsjnpkd` as migration
`20261008094330_company_os_recording_v1.sql`. SHA-256:
`c38c549e09a4ed203762a603268893a10eaebef2328a26152ec0a55b4e55d6a1`.
The application tool assigned the version; the local filename was reconciled to it
without changing SQL content. Do not execute this migration a second time.

Hosted verification preserves six original agents, seven assignment records,
inactive engineering, private-table RLS and non-public approval RPC access.
All three execution controls remain false. Full receipt and advisor findings:
`evidence/hosted-recording-application.json`. Advisor warnings outside changed
objects remain separately triaged; this is not a zero-warning security claim.

## Next single gate

Review current CI/Preview, enable recording only in the intended verified
application environment, and prove authenticated request/review end to end.
Recording remains OFF until that gate. No merge or live executor readiness is
implied. Assignment activation, approval consumption and the actual agent executor
remain separate unfinished implementation.

# NeuraOps technical watch — 8 October 2026

Scope: focused primary-source review for Company OS, shared infrastructure and future Health Cloud/Cliniverse integration. This is a relevance-ranked review, not a claim that each item was released today or that every available technology was surveyed. Recommendations below are engineering judgments; no hosted upgrade, paid subscription, external connector or third-party product code was installed.

| Priority / topic | Verified development or guidance | NeuraOps decision | Entry evidence before adoption |
|---|---|---|---|
| P1 — Supabase API grants | Supabase schedules the new-table API exposure change for existing projects on 30 October 2026. Newly created public tables need explicit grants; existing grants remain. | ADOPT explicit grants as a release gate. Company governance stays private with narrowly granted service-role RPCs, not broad public table exposure. | Target catalog/grants and role tests at hosted-release preflight; do not assume current settings from this announcement. |
| P1 — PostgreSQL maintenance | Supabase's 25 September notice covers 15.19/17.11 and compatibility checks for ltree, legacy pgcrypto ciphers, btree_gist float/NaN indexes and custom operators. PostgreSQL's own security page lists fixes in 17.11. | ADOPT compatibility inventory before managed upgrades. This batch tested native 17.11; that does not establish the hosted patch level or extension state. | Read-only extension/index inventory, recovery evidence and explicit maintenance window if corrective action is needed. No blind reindex or upgrade. |
| P1 — MCP tool authority | Current MCP security guidance forbids token passthrough and requires intended-audience validation; it describes confused-deputy risks. | ADAPT the boundary principle: authenticate the caller, bind exact request scope and keep tool permission separate from discoverability. Current code never accepts browser-supplied approver identity. | Any future tool broker must demonstrate audience/scope checks, credential isolation, SSRF controls, limits and attributable receipts. No Monid/MCP broker activation in this batch. |
| P2 — OpenTelemetry GenAI | GenAI conventions moved to a dedicated repository; the retrieved agent/client convention pages mark their status Development. | DEFER direct schema dependence. Keep our evidence contract authoritative; later map stable internal event IDs and durations through a versioned adapter. | Pin convention/SDK versions and license, prove export contains no prompts, task payloads, patient information or credentials, measure overhead. |
| P3 — OHIF imaging | Official OHIF documentation remains a reference for an extensible imaging platform. This review did not establish a newly released version or clinical suitability. | RESEARCH / FIT-GAP only for the later imaging batch. No viewer import into Company OS and no change to Cliniverse LEARN/WORK entitlement boundaries. | DICOM/DICOMweb adapter contract, license/dependency review, synthetic imaging fixtures, residency/authorization checks and exit strategy. |

## Sources retrieved in this session

1. Supabase — [new table API exposure](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).
2. Supabase — [PostgreSQL 15.19 / 17.11 compatibility notice](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes).
3. PostgreSQL — [official security information](https://www.postgresql.org/support/security/).
4. MCP — [security best practices, current page redirected to 2026-07-28 documentation](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices).
5. OpenTelemetry — [GenAI conventions moved](https://opentelemetry.io/docs/specs/semconv/gen-ai/) and [agent conventions](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md).
6. OHIF — [official introduction](https://docs.ohif.org/).
7. Supabase — [getUser authentication reference](https://supabase.com/docs/reference/javascript/auth-getuser), retained for sensitive server-side actions.
8. React — [form action/reset behavior](https://react.dev/reference/react-dom/components/form), used to verify the retry defect found in independent review.

The markdown changelog endpoint could not be retrieved by the search service; the official HTML breaking-change index and linked notices were read instead. A scoped search of this Company's source/migrations found no ltree/pgcrypto/btree_gist or logs.all use; this is not a hosted catalog assessment and says nothing about separate Health Cloud/Cliniverse repositories.

## Applied in today's work

Atomic requester evidence and review digest; server-derived identities; fixed internal destination with no tool/provider permissions; independent approval; same-request retry without duplicate reservation; tests under explicit SQL roles. No new agent framework or model subscription. React request form now uses explicit submit handling so a caught network error does not reset uncontrolled input fields and lose the original retry context.

Test-only tooling: JSDOM 30.1.2 was pinned in the isolated verification package, installed with lifecycle scripts disabled. It is not an application/runtime dependency. No claim of full dependency security certification is made.

## Next engineering gate

Complete effective assignment/policy selection and parent-scope delegation before any worker activation. In parallel with that existing roadmap, prepare—but do not execute—the hosted drift, authentication and migration recovery checks. Company formation status, legal commitments, clinical production and PHI permissions are unchanged by this research.

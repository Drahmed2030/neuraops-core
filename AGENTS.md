# NeuraOps × Cliniverse — Codex Operating Instructions

## Mission
Build a premium, production-quality shared product system for NeuraOps Core, Nexus KPI Audit / 14-day pilot, and Cliniverse AI without rebuilding stable architecture or expanding scope before evidence.

North star: **Sell before scale. Premium experience, lean implementation.**

## Governance
- Work only on a dedicated feature branch. Never modify `main` directly.
- Do not merge or deploy production without explicit approval.
- Preserve the current implementation path and existing stable behavior.
- Do not rebuild NeuraOps or Cliniverse from scratch.
- Fix or build only what improves active product quality, sale/delivery readiness, reliability, or shared design-system reuse.
- Never add a new paid service, subscription, vendor, or dependency requiring purchase without explicit approval.
- Do not handle patient-identifiable data in development fixtures, design mocks, prompts, logs, or tests.

## Architecture
- **Master Command Center**: prioritization, decisions, dispatch, review. Not product runtime.
- **Revenue Command Center**: leads, conversion, pilots, cash evidence.
- **NeuraOps Core**: shared execution layer — workflows, automation, data, AI orchestration, human escalation, analytics, integrations.
- **Nexus KPI Audit**: commercial entry experience leading to a 30-minute operational review and a focused paid 14-day NeuraOps pilot.
- **Cliniverse AI**: healthcare product layer built on shared NeuraOps capabilities.
- **Cardio Nexus**: specialty healthcare experience inside the Cliniverse product family; do not duplicate shared platform services.

## Figma Design Source of Truth
Official Figma design-system file:
- `NeuraOps × Cliniverse — Unified Design System v1`
- https://www.figma.com/design/VQ68R0ejPPyNsaN9jawboi

Design direction:
- Primary brand: blue + white.
- Primary blue: `#2563EB`; Azure: `#3B82F6`; Navy: `#0B0F19`.
- Violet, cyan, and gold are functional accents, not competing primary brand colors.
- English typography follows Inter where available.
- Arabic typography follows IBM Plex Arabic where available, with Inter/system fallback.
- Light and dark modes must share semantic tokens rather than duplicate hardcoded values.
- Accessibility, focus states, minimum touch targets, and responsive behavior are mandatory.

## Shared UI Goal
Build reusable foundations before feature-specific screens. Prioritize:
1. Button
2. Input / Select / Textarea
3. Card
4. KPI Card
5. Status Badge
6. Alert
7. Tabs / Navigation
8. Dialog / Modal
9. Table / List row
10. Empty / Loading / Error states
11. AI Response state
12. Human Escalation state
13. Premium / Subscription surfaces
14. Step Progress

Do not create one-off feature UI when a shared primitive can serve the same need.

## Nexus Pilot UX
Target flow:
`Audit → Results → Priority Gaps → 14-Day Plan → Book Review → Pilot Workspace → Baseline KPI → Day 7 Checkpoint → Day 14 Result → Case Study / Renewal / Referral`

The pilot should look like a premium product even when some delivery steps remain human-assisted behind the scenes.

## Cliniverse AI UX
Align Cliniverse with the same token system and component language while preserving healthcare-specific safety and specialty workflows. Key surfaces include onboarding, auth, dashboard/home, AI interactions, specialty navigation, Cardio Nexus, escalation/safety states, results, subscriptions/paywall when required, and iPhone/iPad responsiveness.

## Existing Code Truth
Current repository uses Next.js + TypeScript + React + Tailwind. Existing brand tokens include:
- `brand.navy #0B0F19`
- `brand.ink #111827`
- `brand.primary #2563EB`
- `brand.azure #3B82F6`
- `brand.violet #7C3AED`
- `brand.cyan #06B6D4`
- `brand.mist #E5E7EB`
- attention/gold accents and light/dark surfaces.

Existing feature areas include analytics, brand, dashboard, layout, leadops, marketing, proof-report, trial, trust, and UI. Avoid duplicating feature logic.

## Engineering Standards
- Prefer small, reversible changes.
- Reuse existing code and patterns before adding new abstractions.
- Keep design tokens centralized and map them to Figma semantic variables.
- Extract repeated inline UI into shared components when it reduces drift and is exercised by active flows.
- Maintain bilingual English/Arabic layout behavior including RTL.
- Preserve dark mode.
- Maintain visible keyboard focus and accessible labels.
- Add tests for shared component behavior and critical pilot flows when changed.
- Do not introduce speculative enterprise architecture, complex CRM, omnichannel, marketplace, or broad analytics expansion.

## Execution Loop
For every meaningful task use:
`STATE → OBJECTIVE → METHOD → EXECUTE → RECORD`

Before coding, report briefly:
- repository and active branch;
- working-tree status;
- relevant existing files/components;
- planned smallest safe change;
- tests/verification to run.

After coding, report only:
- DONE
- BLOCKED
- NEXT
- DECISION
- EVIDENCE

## Current Priority
1. Complete the shared Figma Design System foundations and core component definitions.
2. Map the design system into reusable code primitives without broad rewrites.
3. Upgrade the Nexus Pilot customer-facing flow to premium quality.
4. Align Cliniverse AI UI to the same system.
5. Do not build unrelated capabilities until customer or release evidence requires them.

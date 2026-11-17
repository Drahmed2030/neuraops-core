# OPEN-SOURCE-CLAUDE-01 — NVIDIA SkillEvaluator and Meta Astryx assessment

Status: documentation only. Nothing was installed, built, or executed.
Read date: 2026-11-17.
Base: `main` at `b432474080e9e0f7b9a235d2634188ba0e36bf87`.

Label legend: **READ DIRECTLY** (seen in upstream source at the pinned commit),
**INFERRED** (my reasoning from what was read), **NOT CHECKED** (not verified, with the reason).

Upstream text was treated as reference material only. Both repositories were
fetched as source-only shallow clones into a scratch directory. No install,
lifecycle hook, example, scanner, or binary was run.

## 1. Verified source inventory

| Item | NVIDIA SkillEvaluator | Meta Astryx |
| --- | --- | --- |
| URL | https://github.com/NVIDIA/SkillEvaluator | https://github.com/meta/astryx |
| Reviewed commit | `d2cb13880d575f2bb1da04577438731af6871fb0` (2026-11-16, `main`) | `2fb7c5b768c8f89b53a6efed5f8794fc0a4348e0` (2026-11-16, `main`) |
| Clone result | READ DIRECTLY: `git clone` succeeded and `origin` equals the URL above | READ DIRECTLY: same |
| Ownership evidence | READ DIRECTLY: `NOTICE` and `LICENSE` name NVIDIA CORPORATION & AFFILIATES, 2026 | READ DIRECTLY: `LICENSE` names Meta Platforms, Inc., 2026 |
| Redirects / web availability | NOT CHECKED: `curl` to the GitHub web URL returned HTTP 403 from the session proxy, so redirects were not observed | NOT CHECKED: same |
| Package registry publication | NOT CHECKED: README claims a PyPI package `skillevaluator`; the registry was not queried | NOT CHECKED: README claims npm packages under `@astryxdesign/*`; the registry was not queried |
| Kind | CLI + Python library: skill evaluator (static checks, LLM rubric, deduplication, live agent A/B evaluation) | Design system: React component library, themes, and a CLI that serves component docs/templates to people and agents |
| Version in manifest | `skillevaluator` 0.9.0 (`pyproject.toml` L10) | `@astryxdesign/cli` 0.7.17 (`packages/cli/package.json`); README says "Currently in Beta" (L11) |
| Support level | "Experimental. Community-supported, best-effort, with no SLA" (`README.md` L262-263) | Beta (`README.md` L11) |

Commit-pinned links used below:
`https://github.com/NVIDIA/SkillEvaluator/blob/d2cb13880d575f2bb1da04577438731af6871fb0/<path>` and
`https://github.com/meta/astryx/blob/2fb7c5b768c8f89b53a6efed5f8794fc0a4348e0/<path>`.

## 2. Evidence-backed capability and licence comparison

### 2.1 NVIDIA SkillEvaluator

What it does (READ DIRECTLY):
- Checks agent skills (folders with a `SKILL.md`, per the Agent Skills specification) and measures a skill's effect by comparing runs with and without it (`README.md` L20-25).
- Tier 1 static validation: `quality-check` (no key), `rubric-eval` (LLM, needs key), `security-scan`, `pii-scan`, `lint-scripts` (`docs/tier1-validation.mdx` L51-54).
- `harness-check` predicts whether Claude Code, Codex and four other harnesses load a skill, with no LLM, no agent run and no key (`README.md` L91-97; `docs/harness-check.mdx` L6-12).
- Tier 2 deduplication needs embeddings/chat; Tier 3 runs a real agent (`codex`, `claude-code`, `opencode`) in a sandbox, Docker by default (`README.md` L179-183; `docs/tier3-live-evaluation.mdx` L35-36).

What it does not do (INFERRED from the above): it evaluates skills and plugins, not application correctness, security, or clinical safety. The README's own wording is that keyless quality output "checks static quality; publication evidence stays INCOMPLETE" (`README.md` L144-146).

Runtime, services, credentials, cost (READ DIRECTLY):
- Python 3.12-3.14 and `uv`; base install needs no API key (`docs/installation.mdx` L22-29; `pyproject.toml` L31, L40-56).
- Tier 1 provisions SkillSpector 2.13.4 and Gitleaks 8.30.0 on first run, fetching them from GitHub/PyPI with SHA-256 verification; missing scanners leave the run `INCOMPLETE` and non-zero (`docs/installation.mdx` L157, L189-191, L228; `README.md` L185-188).
- The NVIDIA Build route sends skill documentation to a hosted model and needs an `NVIDIA_API_KEY` (`README.md` L149-168). `--extra llm` adds anthropic, boto3, litellm, openai clients (`pyproject.toml` L60-65).
- Tier 3 adds Harbor 0.25.0 and Docker, pins Claude Code 2.1.292, needs `ANTHROPIC_API_KEY` for `claude-code`, and "can consume substantial tokens" (`pyproject.toml` L71-82; `docs/tier3-live-evaluation.mdx` L330-332, L638-640, L661).
- README states the project "will download and install additional third-party open source software" (`README.md` L246-248).

Telemetry and data handling:
- READ DIRECTLY: the Harbor launch environment sets `HARBOR_TELEMETRY=0` and disables dotenv loading (`src/skillevaluator/tier3/harbor/runner.py` L1460). Tier 3 output is stated to be passed through secret redaction (`docs/tier3-live-evaluation.mdx` L338).
- NOT CHECKED: a full source audit for undocumented network calls or telemetry in the base CLI. Only targeted greps and documentation were read.

Licence:
- READ DIRECTLY: Apache-2.0 (`LICENSE`, `pyproject.toml` L32, `README.md` L280-283), with `NOTICE` and `THIRD_PARTY_NOTICES.md`.
- READ DIRECTLY: dependencies list Apache-2.0, MIT, BSD-3-Clause and `regex` as "Apache-2.0 AND CNRI-Python"; Tier 3 HTML reports embed Chart.js (`THIRD_PARTY_NOTICES.md`).
- NOT CHECKED: licences of SkillSpector, Gitleaks, Semgrep, Harbor's transitive tree, and the lockfile (`uv.lock`) contents.

### 2.2 Meta Astryx

What it does (READ DIRECTLY):
- An open-source React design system: 150+ components, themes, dark mode, templates, and a CLI (`README.md` L27-29). Requires React 19+ and peer-depends on `@stylexjs/stylex` ^0.19.0 (`README.md` L40; `packages/core/package.json` L952-956).
- The CLI serves component docs, tokens, templates, theming tools and codemods to humans and agents (`packages/cli/README.md` L3).
- Ships a small agent skill/plugin that tells a coding agent Astryx exists and where to start; it "carries no component docs" (`plugins/astryx/README.md`; `.claude-plugin/marketplace.json`).

What it is not (INFERRED): it is not an agent-quality tool and not a Claude workflow utility. Its relevance to us is as a UI dependency, which is a product decision, not a tooling decision.

Runtime, services, credentials, cost (READ DIRECTLY): Node 24.22.1 pinned for contributors (`.nvmrc`), pnpm 11 for the monorepo. Consumers use npm. No credentials or paid services are documented for consumption.

Execution behaviour (READ DIRECTLY):
- `@astryxdesign/cli` and `@astryxdesign/core` declare `postinstall` scripts (`packages/cli/package.json`, `packages/core/package.json` L939). The reviewed scripts only print a "run `astryx init`" nudge, never fail the install, and use Node built-ins (`packages/cli/scripts/postinstall.mjs` L3-19). INFERRED: a consumer install executes upstream JavaScript at install time even though it is benign today.
- The README recommends a global install so "every coding agent on your computer" knows Astryx (`packages/cli/README.md` L18-24). The global-mode spec says the global copy writes agent text under the home folder, including `.agents/skills/astryx` and a link at `.claude/skills/astryx` for Claude Code, and runs a background update check against the registry at most once per 24 hours (`docs/specs/AST-081-global-mode/spec.md` L366-368, L718-724). This conflicts with our boundary against global Claude configuration.
- The CLI README warns that running unscoped `astryx` through `npx` resolves to an unrelated npm package (`packages/cli/README.md` L16). INFERRED: any trial must use the scoped name.
- The repo contains `.claude/internet-mode-used_DO_NOT_REMOVE_MANUALLY_SECURITY_RISK`, a marker saying content in that directory came from Claude Code's internet mode and may contain prompt injection. READ DIRECTLY. It is upstream repository content, not a statement about our environment.

Telemetry: NOT CHECKED. A keyword search matched only template/doc files; no source audit of the CLI network behaviour was done.

Licence: READ DIRECTLY: MIT (`LICENSE`; `packages/core/package.json` L7). NOT CHECKED: licences of the CLI's dependencies (`@babel/*`, `jscodeshift`, `linkedom`, etc.) and of fonts, icons, and template assets.

### 2.3 Comparison

| Dimension | SkillEvaluator | Astryx |
| --- | --- | --- |
| Primary purpose | Evaluate agent skills | Build UIs |
| Licence | Apache-2.0 | MIT |
| Maturity | Experimental, v0.9.0 | Beta, CLI v0.7.17 |
| Needs a key for a first useful run | No (`quality-check`, `harness-check`) | No |
| Network at first run | Yes (scanner downloads from GitHub/PyPI) | Yes for npm install; background update check only in global mode |
| Writes outside project | Reports directory, uv/runtime cache | Global mode writes under the home folder, including Claude Code's skills folder |
| Cost risk | Tier 2/3 LLM and sandbox spend | None documented |
| Overlaps our stack | Python tool; we are Node/Next | React 19 (we have 19.2.8); StyleX peer dependency; we use Tailwind 3 |

## 3. Fit for our current workflow

Repository facts (READ DIRECTLY from `neuraops-core` at the base SHA):
- Stack: Next 16.3.8, React 19.2.8, Tailwind 3.4, Supabase; tests run with `node --test` (`package.json`).
- `AGENTS.md`, `CLAUDE.md`, `HANDOFF.md`, a roadmap, and an "agent execution verification guide" do not exist at the repository root or in `docs/`. NOT CHECKED: those documents may live in a different repository or branch; the packet's step 1 could not be completed for them. I did not substitute other files.
- No `.claude/` directory and no tracked file named like a skill was found (file-name search only).

A. SkillEvaluator: hypothesis "evaluate our Claude skills or execution packets using synthetic cases".
- Skills: plausible, but there are currently no skills here to evaluate (INFERRED from the file search above). Value today is limited to a trial on a synthetic skill, plus a future gate if we later author skills.
- Execution packets: INFERRED unsuitable as a direct input. They are task prompts, not skill folders. The README says other artifact types "retain their applicable stages" (`README.md` L208-209), but what applies to a plain packet is NOT CHECKED.
- It can measure whether a skill loads and how well it is written. It cannot replace our tests, security review, clinical review, or CI.

B. Astryx: hypothesis "assist our interface/design workflow".
- Actual purpose differs: it is a design-system dependency, not an agent-workflow aid. Adopting it means replacing or coexisting with our Tailwind components, adding StyleX, and tracking a Beta API. That is a product/UX decision for the owner, not something to trial inside Claude tooling.
- The only workflow-adjacent value is its agent-readable component docs via the CLI. That is available without adopting the library only if the CLI can be run read-only, which is NOT CHECKED.

## 4. Recommendations

| Tool | Recommendation | Evidence | Benefit | Limitations | Maintenance cost |
| --- | --- | --- | --- | --- | --- |
| NVIDIA SkillEvaluator | **ADOPT IN ISOLATED TRIAL** (keyless Tier 1 only: `harness-check`, `quality-check`, `security-scan`; Tier 2/3 and any LLM provider stay DEFER) | Keyless modes, Apache-2.0, pinned scanner checksums (sections 2.1) | Cheap, repeatable check that a skill loads in Claude Code and is well-formed; reusable if we add skills | Experimental; downloads third-party tools; no skills to test today; does not measure product correctness | Low if kept out of CI; moderate if gated (Python toolchain, upstream churn: 0.9.0 and a very large CHANGELOG) |
| Meta Astryx | **DEFER** | Section 2.2 and 3B | None for Claude workflow; potential UI value only after an owner design decision | Beta; StyleX peer; postinstall hook; global mode writes into `~/.claude` | High if adopted as a dependency; none if deferred |

Revisit Astryx when the owner decides to evaluate a new design system for the product UI. The first step then is a separate design-system packet, not an agent-tooling packet.

## 5. Proposed trial design: SkillEvaluator (NOT EXECUTED)

Goal: confirm a keyless run on a synthetic skill produces a deterministic report, without touching the repository, global configuration, or any key.

Prerequisites: Linux or macOS, Git, `uv`, outbound HTTPS to github.com and pypi.org (scanner downloads). No API key. No Docker.

Pinned revision: `d2cb13880d575f2bb1da04577438731af6871fb0` (re-verify the SHA at trial time and record any drift).

Temporary setup (proposed, from README/installation docs; every line NOT EXECUTED):

```bash
# 1. isolated scratch directory outside any repository
TRIAL=$(mktemp -d) && cd "$TRIAL"

# 2. source-only clone pinned to the reviewed commit
git clone https://github.com/NVIDIA/SkillEvaluator.git src
git -C src checkout d2cb13880d575f2bb1da04577438731af6871fb0

# 3. synthetic skill (no patient data, no repo content): one SKILL.md written by hand
mkdir -p skill-synthetic && printf '%s\n' '---' 'name: synthetic-checklist' \
  'description: Formats a generic checklist from a list of items.' '---' \
  '# Synthetic checklist' 'Turn a list of items into a numbered checklist.' > skill-synthetic/SKILL.md

# 4. keyless runs from the lockfile, with reports written inside $TRIAL
cd src
uv run --python 3.13 skillevaluator harness-check ../skill-synthetic
uv run --python 3.13 skillevaluator quality-check ../skill-synthetic -r cli -r json -o ../reports/quality
uv run --python 3.13 skillevaluator tier1 ../skill-synthetic --no-llm
```

Expected outputs and acceptance criteria:
1. `harness-check` prints a per-harness table including `claude-code` with a loads/degraded/not-loaded verdict.
2. `quality-check` exits 0 or reports a numeric score, and writes `reports/quality/skillevaluator-quality.json`.
3. `tier1 --no-llm` completes with scanner evidence either complete or explicitly `INCOMPLETE` (acceptable if scanner downloads are blocked; it must not be reported as certified).
4. No file inside the `neuraops-core` checkout changes (`git status` clean) and nothing is written under `~/.claude`, `~/.agents`, or other home config (compare a before/after listing).
5. No API key was set in the environment (`env | grep -iE 'API_KEY|TOKEN'` is empty for the shell used).

Network and cost: GitHub and PyPI downloads only; zero model spend. Do not set `SKILL_EVAL_LLM_PROVIDER`, `NVIDIA_API_KEY`, or `ANTHROPIC_API_KEY`. Do not use `--extra llm`, `tier2`, `tier3`, `validate` (it runs Tier 2/3 by default), or `doctor --env-mode docker`.

Cleanup and rollback: `rm -rf "$TRIAL"`; remove the `uv` cache entries created by the trial if the owner wants a clean machine. No repository state to roll back.

Owner decisions required before any run:
1. Approve outbound downloads of SkillSpector and Gitleaks, or accept `INCOMPLETE` security evidence.
2. Decide whether any future evaluation may send skill text to a hosted model, and under which provider, given the no-external-data boundary.
3. Decide whether skills will exist here at all; otherwise the trial has no production target.

## 6. Risks, unresolved decisions, and Not Checked items

Risks:
- Installing a Python tool runs third-party build and runtime code, and the tool itself fetches more third-party binaries. Mitigation: scratch directory, pinned SHA, lockfile, no credentials.
- Experimental upstream: interfaces may change between 0.9.x releases.
- Evaluator scores could be mistaken for assurance. They are not: repository tests, security review, clinical review, and required CI remain the gates.
- Astryx global mode would modify global Claude configuration. Do not use it.

Not Checked:
- GitHub web redirects/availability (proxy returned 403 for web URLs; `git clone` worked).
- npm and PyPI publication, provenance, and published-versus-source parity for both projects.
- Licences of transitive dependencies and downloaded scanners for both projects.
- Source-level audit for undocumented telemetry/network calls in either CLI.
- How SkillEvaluator treats non-skill artifacts such as execution packets.
- Whether Astryx CLI docs can be read without install, init, or any write.
- Repository documents named in the packet: `AGENTS.md`, `CLAUDE.md`, `HANDOFF.md`, roadmap, agent execution verification guide (none present in this checkout).
- The `WEB-LOGIN-AUDIT-02-STORAGE` branch was not touched or inspected.
- No tests or builds were run; none are claimed.

## 7. Proposed separately scoped implementation packet (not authorised by this document)

Name: OPEN-SOURCE-CLAUDE-02 — SkillEvaluator keyless trial record.

Allowed files (later packet): one new document, `docs/architecture/reliability/open-source-claude-02-skillevaluator-trial.md`, recording the trial output. No dependency, lockfile, workflow, Claude settings, hook, MCP, or skill changes in `neuraops-core`.

Gates before it starts: owner answers the three decisions in section 5; owner confirms the trial machine and that downloads are permitted; a fresh SHA check is recorded. Astryx stays DEFER and is out of scope.

First remaining gate: owner review of this Draft PR.

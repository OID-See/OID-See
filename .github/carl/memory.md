<!-- version: 1.2.0 -->
# Durable Architectural Truth Cache

This cache stores durable project truths that should persist beyond a
single task. Update it only when a stable fact, decision, invariant, or
unresolved question should carry forward.

## Project purpose
OID-See is an Entra ID (Azure AD) enterprise application / service
principal security scanner. It authenticates to Microsoft Graph,
enumerates service principals, app registrations, OAuth2 delegated
grants, app role assignments, owners, and credentials, and produces a
risk-scored graph and findings suitable for BloodHound-style analysis,
SARIF export, and HTML reporting. It is a read-only reconnaissance and
posture-assessment tool, not a remediation or write-back tool.

## Non-goals
- OID-See does not perform write/mutating operations against a tenant's
  Microsoft Graph objects (no remediation, no role/consent changes).
- This repository's cARL governance layer does not alter OID-See's own
  scanning/scoring behaviour; it only governs how agents work in this repo.

## Architecture summary

cARL artefacts are the canonical source of governance truth for this repository.

`.github/carl/` contains durable governance artefacts, repository memory, PR contracts, invariants, trust boundaries, tool policy, plans, runtime metadata, and generated repository maps.

`.github/instructions/` contains modular single-concern instruction packs used by supported harnesses.

Harness-specific files such as `.github/copilot-instructions.md`, `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/carl.mdc`, and `.agents/rules/carl.md` are adapters/shims. They may load, summarise, or route agents toward cARL, but they are not the canonical governance authority.

`.github/copilot-instructions.md` is both the GitHub Copilot harness entrypoint and the **shared cARL adapter loader** for all other harness shims. It is located at that path for Copilot compatibility. All other harness entrypoints (CLAUDE.md, AGENTS.md, .cursor/rules/carl.mdc, .agents/rules/carl.md) are tiny shim files that tell the harness to read `.github/copilot-instructions.md` before any repository work. It should remain a thin, procedural loader that makes the cARL lifecycle explicit:

1. hydrate cARL before planning or implementation;
2. apply cARL governance during execution;
3. validate contract, implementation, and tests together;
4. reconcile documentation and durable cARL artefacts before final response;
5. report whether cARL/docs updates were required.

If prompt/session memory conflicts with cARL artefacts, trust cARL and report the conflict.

If `.github/carl/memory.md` conflicts with current repository state, current repository state wins and memory should be updated.

### OID-See scanner architecture

- `oidsee_scanner.py` — the main Graph API collector and risk-scoring engine. Central function `compute_risk_for_sp()` computes a risk score/reasons list for each service principal from delegated scopes, app roles, owners, credentials, reply URLs, and directory role assignments. `classify_scopes()` classifies a set of delegated scopes into a risk class/weight (readwrite_all > action_privileged > too_broad > write_privileged > regular); `compute_risk_for_sp()` derives privileged/too-many-scopes risk automatically from `delegated_scopes_by_resource` rather than accepting boolean flags — do not reintroduce boolean scope flags as parameters.
- `scoring_logic.json` — externalised, data-driven configuration for scoring weights, descriptions, and scope classification patterns consumed by `oidsee_scanner.py`.
- `finding_builder.py`, `generate_findings.py`, `scanner_findings_helper.py` — build normalized findings from scan output.
- `findings_diff.py`, `compare_findings.py` — drift/diff comparison between findings snapshots.
- `findings_sarif.py` — SARIF 2.1.0 export.
- `bloodhound_opengraph.py`, `convert_to_bloodhound_opengraph.py` — BloodHound OpenGraph export/conversion.
- `report_generator.py` — generates the standalone HTML report (`generate_html_report()`).
- `schemas/` — JSON Schemas used to validate findings/export output (validated in `tests/test_findings_schemas.py`, `tests/test_schema_validation.py` via the `jsonschema` package).
- `src/` — TypeScript/React dashboard (Vite-based) for interactive graph visualisation; built with `npm run build` (`vite build`).
- `tests/` — pytest suite (`tests/test_*.py`), ~228 tests as of 2026-07-04.

### Known environment/tooling facts

- No GitHub Actions CI workflow exists in `.github/workflows/` as of 2026-07-04; there is no repo-enforced automated test gate yet.
- Python test command: `python -m pytest tests/ -q`. `pip` is externally-managed on typical Debian-based dev hosts — create a venv (`python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`) before installing packages.
- `requirements.txt` does not list `jsonschema`, even though `tests/test_findings_schemas.py` and `tests/test_schema_validation.py` import it directly — install it manually into the test venv, or add it to `requirements.txt` as a follow-up.
- TypeScript/frontend build command: `npm run build` (`vite build`); dev server: `npm run dev`.

## Repository snapshot

<!-- BEGIN GENERATED: reconcile -->
## Repository snapshot

This section is regenerated by `carl reconcile`. Do not edit manually.

**Languages:** Python, TypeScript  
**Last reconciled:** 2026-07-04

### Entry points

- `package.json` — Node.js project

### Key directories

- `.agents`
- `.agents/rules`
- `.cursor`
- `.cursor/rules`
- `.github` — GitHub configuration and Copilot instruction root
- `.github/ISSUE_TEMPLATE`
- `.github/carl` — cARLv2 governance artefacts and templates
- `.github/carl/plans` — Prompt-as-code planning artefacts
- `.github/instructions` — Copilot instruction packs
- `.github/instructions/cloud` — Cloud guidance packs
- `.github/instructions/core` — Core governance packs
- `.github/instructions/languages` — Language-specific guidance packs
- `.github/instructions/platform` — Platform guidance packs
- `.pytest_cache`
- `.pytest_cache/v`
- `.pytest_cache/v/cache`
- `__pycache__`
- `data`
- `docs` — Documentation
- `docs/images`
- `examples`
- `examples/github-actions`
- `public`
- `public/icons`
- `schemas`
- `src`
- `src/adapters`
- `src/components`
- `src/filters`
- `src/samples`
- `src/types`
- `src/workers`
- `tests`

### Governance artefacts

- `.github/carl/current-pr-contract.template.md` — PR contract template
- `.github/carl/invariants.yml` — Runtime invariants enforced by all implementation PRs
- `.github/carl/memory.md` — Durable architectural truth cache
- `.github/carl/repo-map.example.json` — Repo map template example
- `.github/carl/runtime.json`
- `.github/carl/tool-policy.yml` — Tool permission tier definitions
- `.github/carl/trust-boundaries.md` — Trust boundary documentation

### Documentation

- `AGENTS.md`
- `CHANGELOG.md` — Version changelog
- `CLAUDE.md`
- `README.md` — Repository overview and pack catalogue
- `RELEASE_NOTES.md`
- `RELEASE_NOTES_v1.0.1.md`
- `RELEASE_NOTES_v1.0.md`
- `RELEASE_NOTES_v1.1.1.md`
- `RELEASE_NOTES_v1.1.md`
<!-- END GENERATED: reconcile -->

## Command behaviour

`carl reconcile` refreshes the generated repository snapshot in `.github/carl/memory.md`. It is idempotent: when generated content is unchanged, it should perform no write. It does not modify `runtime.json`, harness adapter files, or other managed artefacts. It requires no network access and exits non-zero with an actionable message if `repo-map.json` or `memory.md` is missing.

`carl harness` manages and inspects harness adapters for AI coding agents. Its subcommands are `list`, `status`, and `sync`.

Harness adapters bridge cARL canonical artefacts to agent context injection mechanisms. cARL artefacts are the canonical source of truth; harness files are adapters, not authorities.

`carl harness list` shows all known adapters with support tier:

- `copilot` — `production`: tested, production-validated, primary development target;
- `claude` — `experimental`: partial validation, governance loading under investigation;
- `codex`, `cursor`, and `antigravity` — `theoretical`: adapter exists, not yet validated end-to-end.

`carl harness status` reports both detection-file presence and sync health by comparing adapter file bytes against the canonical embedded source.

`carl harness sync [<harness-id>...]` generates adapter files for all adapters with defined adapter files, or only named harnesses when harness IDs are supplied. Syncing a shim harness writes both the shared loader (`.github/copilot-instructions.md`) and the harness-specific shim. The shared loader is written once even when syncing all harnesses. Adapter files are disposable and always overwritten. Sync works for all tiers regardless of support level. Sync is idempotent and does not require `carl init`.

`carl doctor` surfaces missing or drifted harness adapters as warning findings with `carl harness sync` remediation.

`carl status` includes a separate harness summary covering active, missing, drifted, and healthy harnesses without changing overall runtime status semantics.

Detection files:

- Copilot: `.github/copilot-instructions.md`
- Claude: `CLAUDE.md`
- Codex: `AGENTS.md`
- Cursor: `.cursor/rules/carl.mdc`
- Antigravity: `.agents/rules/carl.md`

A shim harness is healthy only when both the shared loader (`.github/copilot-instructions.md`) and the harness-specific shim are present and synced.

`harness.Command` accepts an `Artifacts` dependency using the same interface pattern as `repair`, `doctor`, and `status`.

The `repair` package exports `Inspect(rootDir, managed, arts)`, which returns separate missing and drifted slices while skipping protected paths. `repair.Command.detectDrift` delegates to `Inspect` internally.

`repair.CompareFile(rootDir, targetPath, canonicalPath, arts)` is the shared byte-comparison helper used by both runtime artefact inspection and harness adapter health checks.

The `repomap` package implements `carl map`. Its `Build(rootDir)` function derives all map sections from the filesystem using `filepath.WalkDir`. It exports `RunInDir(rootDir)` for testability. `OutputFile` is `.github/carl/repo-map.json`.

The `convert` package implements `carl convert <source> [--dry-run | --apply]`, an AADLC-to-cARL governance migration command.

`convert` uses a converter framework: each source implements the `Converter` interface and is registered in the `converters` slice. A shared converter-agnostic engine performs duplicate detection, conflict detection, routing, and deterministic reporting. New converters can be added without changing the engine.

The AADLC converter discovers artefacts under `.aadlc/`, `.github/aadlc/`, `aadlc/`, and `AADLC.md`. It classifies Markdown and YAML bullet content by section-heading keywords into invariants, durable memory, and governance rules.

AADLC invariants are appended to `.github/carl/invariants.yml` using namespaced `aadlc-` IDs and `high` severity. Memory and governance entries go into a managed block in `.github/carl/memory.md`.

AADLC artefacts are never modified or deleted. Default mode is `--dry-run`. Conversion is idempotent and deterministic.

Malformed managed convert block markers cause conversion to fail before writing anything, rather than treating the block as absent and appending a second block.

## Core invariants

- cARL artefacts are the canonical source of durable governance truth.
- Harness-specific files are adapters/loaders, not authorities.
- Harness adapters must remain disposable and regenerable from canonical cARL assets.
- Instruction packs should remain modular and focused on a single concern.
- `.github/copilot-instructions.md` is both the Copilot harness entrypoint and the shared cARL adapter loader for all harness shims. It should remain a thin, procedural loader rather than duplicating the full operating model.
- cARLv2 artefacts should reduce semantic rediscovery without becoming a per-turn session diary.
- Prompt-as-code should be used for substantial, long, nested, model-comparison, or boundary-sensitive agent tasks.
- Every implementation PR must make an explicit cARL/docs update decision before final response.

## Known sharp edges

- Instruction availability is not instruction adherence: a harness may load an instruction file, but different models vary in their ability to operationalise the full governance lifecycle without explicit checkpoints.
- Agents may over-anchor on completed PR contracts; distinguish durable invariants from historical PR constraints.
- Model availability and capability can vary; fallback models must preserve the active PR contract.
- Repeated corrective prompting is a failure signal; reset the session or switch model instead of continuing prompt ping-pong.
- Derived data support does not guarantee equivalent UX surface support.

## Canonical validation commands

- Run Python tests: `python -m pytest tests/ -q` (use a venv: `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt` — system `pip` is externally-managed on typical dev hosts)
- Test-only dependency gap: install `jsonschema` into the venv manually, or add it to `requirements.txt` (needed by `tests/test_findings_schemas.py`, `tests/test_schema_validation.py`)
- Build/dev the TypeScript dashboard: `npm run build` (production), `npm run dev` (dev server), `npm run preview`

## Current operating assumptions

Model availability and capability are not stable invariants. The PR contract remains the source of truth across model fallback.

Harness behaviour is not equivalent to model compliance. A harness may place instructions in context, but cARL must still make the required governance lifecycle explicit enough for weaker or cheaper models to follow.

The active authority order is:

1. current repository state;
2. active user instruction within approved scope;
3. `.github/carl/current-pr-contract.md`;
4. `.github/carl/invariants.yml`;
5. `.github/carl/trust-boundaries.md`;
6. `.github/carl/memory.md`;
7. relevant `.github/instructions/` packs;
8. harness adapter files;
9. stale prompt/session memory.

## Open questions

- Should `jsonschema` be added to `requirements.txt`, and should a CI workflow (`.github/workflows/`) be introduced to run `pytest` automatically? Neither exists yet as of 2026-07-04.
- The `fetch_group_member_counts_batched`/`group_member_count_cache` batched-group-counting feature is referenced by 6 tests (`tests/test_batched_group_counting.py`, `tests/test_group_assignment_counting.py`) but does not exist in `oidsee_scanner.py` — unresolved whether this is a planned-but-unbuilt feature or dead test code.
- `tests/test_report_generator.py::test_generate_report` expects an "Apps Without Owners" metric not currently emitted by `report_generator.py` — root cause not yet investigated.

## Last updated
2026-07-04 by repo-specific memory hydration and compute_risk_for_sp test-signature-drift fix
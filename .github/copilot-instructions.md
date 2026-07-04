<!-- version: 2.1.0 -->
# Shared cARL Adapter Loader

This repository uses **cARL** as its authoritative agent governance system.

This file is located at `.github/copilot-instructions.md` for GitHub Copilot compatibility, but it is also the **shared cARL adapter loader** for all harness shims. Other harness entrypoints (CLAUDE.md, AGENTS.md, .cursor/rules/carl.mdc, .agents/rules/carl.md) are shims that point here.

This file is a loader, not the source of governance truth.

Do not treat this file as the complete operating model. Use it to hydrate, apply, and reconcile the canonical cARL artefacts.

---

## Authority model

Canonical governance lives in:

1. `.github/carl/memory.md`
2. `.github/carl/current-pr-contract.md`
3. `.github/carl/invariants.yml`
4. `.github/carl/trust-boundaries.md`
5. `.github/carl/tool-policy.yml`
6. `.github/carl/plans/`
7. `.github/instructions/`

Harness-specific files such as `.github/copilot-instructions.md`, `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, and `ANTIGRAVITY.md` are adapters. They may load, summarise, or route to cARL, but they are not the canonical governance authority.

If prompt/session memory conflicts with cARL artefacts, trust cARL and report the conflict.

If `.github/carl/memory.md` conflicts with current repository state, current repository state wins and memory should be updated.

---

## Required lifecycle

For every repository task, follow this lifecycle.

### 1. Hydrate before planning or implementation

Before planning, editing, or writing files, read the relevant cARL artefacts:

- `.github/carl/current-pr-contract.md`
- `.github/carl/memory.md`
- `.github/carl/invariants.yml`
- `.github/carl/trust-boundaries.md`
- `.github/carl/tool-policy.yml`
- any relevant files in `.github/carl/plans/`
- any relevant instruction packs in `.github/instructions/`

At minimum, identify:

- active goal;
- approved scope;
- forbidden scope;
- non-goals;
- invariants;
- trust boundaries;
- validation requirements;
- stop conditions;
- escalation triggers.

Do not begin implementation until the current PR contract and relevant invariants are understood.

### 2. Apply cARL during execution

During implementation:

- stay within the active PR contract;
- preserve all invariants unless the user explicitly approves a governance amendment;
- prefer small, reversible changes;
- follow existing repository patterns before introducing new ones;
- avoid unrelated refactors;
- classify tool actions against `.github/carl/tool-policy.yml`;
- stop if the requested change crosses forbidden scope or an escalation trigger.

For significant, long, nested, security-sensitive, trust-boundary-changing, or model-comparison tasks, prefer prompt-as-code in `.github/carl/plans/` over large UI prompts.

### 3. Validate contract, implementation, and tests together

Validation must prove the approved behaviour, not merely the implementation that happened to be written.

For non-trivial work:

- identify contract assertions before implementation;
- ensure tests or manual checks map back to those assertions;
- run the repository’s relevant validation commands when possible;
- report any validation that could not be run.

If tests fail, do not treat the task as complete. Report the failure, suspected cause, and proposed next action.

### 4. Reconcile cARL and documentation before final response

Before finalising, decide whether the change updates durable project truth.

Update the relevant documentation and cARL artefacts when the change affects:

- behaviour;
- assumptions;
- commands;
- scope;
- roadmap;
- operating model;
- invariants;
- trust boundaries;
- validation expectations;
- stable field findings;
- recurring workflow hazards.

Do not update cARL mechanically for every edit. cARL artefacts are durable governance records, not a per-turn session diary.

If no cARL or documentation update is required, explicitly state why.

### 5. Report completion clearly

Final responses must include:

- summary
- changes
- tests run/not run
- cARL/docs update decision
- risks

In Plan-only mode, still use the same headings and explicitly report:

- no code changes proposed;
- no tests run;
- whether any cARL/docs update is proposed.

---

## Operating modes

Default to Plan-only mode unless the user explicitly approves implementation.

Use mode selection in this order:

1. If the user explicitly requests `automatic mode`, use Automatic mode.
2. Else if the user explicitly approves implementation with words such as `implement`, `apply`, `make the change`, `proceed`, or `approved`, use Assisted implementation mode.
3. Else use Plan-only mode.

### Plan-only mode

In Plan-only mode:

- do not edit files;
- do not run tests;
- provide a plan;
- identify expected files;
- identify validation steps;
- identify cARL/docs updates likely to be required.

### Assisted implementation mode

Use when the user explicitly approves implementation.

If implementation scope is unclear, pause and ask for clarification before writing.

### Automatic mode

Use only when the user explicitly writes `automatic mode`.

Automatic mode still requires cARL hydration, scope control, validation, and reconciliation.

---

## Core engineering rules

Preserve these rules unless the current PR contract explicitly amends them:

- correctness, security, maintainability, testability, and explainability are primary goals;
- never hard-code secrets;
- do not weaken authentication, authorization, validation, logging safety, dependency hygiene, or secret handling;
- avoid broad rewrites;
- do not add dependencies casually;
- prefer native implementation for small functionality when safe;
- do not skip validation silently;
- surface risky assumptions;
- ask for clarification when ambiguity changes the outcome.

---

## Model and context safety

Model capability and instruction adherence vary.

Do not assume that a loaded instruction has been fully operationalised. Keep cARL lifecycle checkpoints explicit.

If more than one corrective prompt is required to understand the PR contract, reset the session or switch models instead of continuing prompt ping-pong.

If switching models, preserve the same goal, non-goals, invariants, acceptance criteria, and PR contract unless the user explicitly amends them.

---

## Final response format

Use these headings exactly:

```text
summary

changes

tests run/not run

cARL/docs update decision

risks
<!-- version: 1.1.0 -->
# Tool Permission Tiers Pack

Defines tiered governance for tool usage to reduce hidden branching, autonomous overreach, and accidental scope expansion.

## Purpose

Tool actions must be classified before execution.

Use `.github/carl/tool-policy.yml` as the canonical source for tier definitions.

The permission tier model applies to:

- repository file reads;
- repository file writes;
- searches;
- command execution;
- test execution;
- CI/CD changes;
- destructive actions;
- remote API calls;
- metadata updates;
- harness adapter changes;
- cARL artefact updates.

## Core rules

- **Classify each tool action before execution.** Map every action to Tier 0, Tier 1, or Tier 2 as defined in `.github/carl/tool-policy.yml`.
- **Tier 0 actions remain read-only.** Read and inspection actions can proceed without escalation when they do not modify state.
- **Tier 1 actions require scope confirmation.** Scoped writes require intent declaration and confirmation against approved PR scope.
- **Tier 2 actions require explicit escalation.** Destructive, broad, governance-sensitive, or high-blast-radius actions require explicit user approval and PR contract coverage.
- **When uncertain, classify up.** If tier is unclear, use the higher tier and escalate rather than assuming lower risk.
- **Prohibit hidden side-effect branching.** Do not perform non-read actions implicitly while claiming read-only exploration.
- **Do not use passing tests as scope approval.** Tests validate implementation quality; they do not authorise writes outside the PR contract.
- **Do not silently repair governance drift.** If governance artefacts or harness adapters are drifted, report the drift and confirm scope before modifying them.

## Tier guidance

### Tier 0 — Read-only

Examples:

- read files;
- search code;
- inspect directory structure;
- inspect cARL artefacts;
- inspect PR contract;
- inspect test output;
- inspect CI status;
- inspect generated repo maps.

Tier 0 actions do not modify local or remote state.

### Tier 1 — Scoped write

Examples:

- edit a file explicitly listed in approved scope;
- update tests listed in approved scope;
- update documentation listed in approved scope;
- update cARL artefacts when the PR contract requires durable truth reconciliation;
- update embedded asset copies when explicitly required to keep canonical runtime assets in sync.

Tier 1 actions require confirmation that the target is inside approved scope.

### Tier 2 — Destructive, broad, or governance-sensitive

Examples:

- delete files;
- perform broad search-and-replace;
- modify CI workflows;
- modify root-level governance configuration;
- alter harness adapter authority semantics;
- change runtime state semantics;
- change security policy;
- update dependency or build pipelines with broad blast radius;
- merge PRs;
- force-push branches;
- run destructive infrastructure commands;
- use remote APIs to mutate external resources.

Tier 2 actions require explicit approval and PR contract coverage before acting.

## Harness and cARL-specific rules

Harness adapter files are governance-sensitive because they influence delegated agent behaviour.

Treat these files as at least Tier 1 when edited:

- `.github/copilot-instructions.md`
- `CLAUDE.md`
- `AGENTS.md`
- `.cursorrules`
- `ANTIGRAVITY.md`

Treat broad changes to harness authority semantics as Tier 2 unless the active PR contract explicitly covers them.

Treat these files as Tier 1 when updated inside approved scope:

- `.github/carl/memory.md`
- `.github/carl/current-pr-contract.md`
- `.github/carl/invariants.yml`
- `.github/carl/trust-boundaries.md`
- `.github/carl/tool-policy.yml`
- `.github/carl/plans/*.md`
- `.github/instructions/**/*.instructions.md`

Do not modify `.github/carl/runtime.json` unless the active PR contract explicitly approves runtime state changes.

## Final response expectations

When tool actions were used or proposed, final responses should state:

- read-only actions performed;
- write actions performed;
- any escalations required;
- any actions skipped because they were outside scope;
- any cARL/docs updates made or deliberately not made.
<!-- version: 1.3.0 -->
# PR Contract Pack

Defines the PR contract controls that constrain implementation scope and govern escalation.

## Purpose

`.github/carl/current-pr-contract.md` is the active execution boundary for implementation work.

It captures:

- goal;
- contract status;
- non-goals;
- approved scope;
- forbidden scope;
- architectural constraints;
- security constraints;
- expected files;
- validation requirements;
- stop conditions;
- escalation triggers;
- context reset notes.

## Contract authority

- **Create or update a contract before implementation.** Use `.github/carl/current-pr-contract.md` to capture goal, non-goals, scope, constraints, and stop conditions.
- **Read the active contract before implementation.** Do not begin repository writes until the active PR contract has been checked.
- **Treat approved scope as execution boundary.** Planned implementation must remain inside approved scope unless explicitly amended.
- **Enforce forbidden scope explicitly.** Do not execute changes that fall into forbidden scope without user-approved contract amendment.
- **Honor architectural and security constraints.** Contract constraints are mandatory guardrails during implementation and validation.
- **Validate against expected file and test surfaces.** Keep changes aligned to expected files and listed validation commands.
- **Use stop conditions.** Stop immediately when a stop condition is reached.
- **Use escalation triggers.** Ask for confirmation when ambiguity, risk, or scope changes match an escalation trigger.

## Completed contracts

Completed PR contracts are historical evidence, not durable law.

Do not treat a completed PR constraint as binding scope unless it has been explicitly promoted to:

- an invariant;
- durable memory;
- trust-boundary guidance;
- current PR carry-forward rule;
- documented architecture.

New PRs may intentionally amend previous constraints when the amendment is explicit, scoped, and recorded in the current contract or linked plan.

## Contract assertions

For non-trivial work, record or infer 3-5 contract assertions before implementation.

Prioritise assertions for:

- output schemas;
- CLI/API contracts;
- warning/error semantics;
- trust-boundary behaviour;
- persistence formats;
- security controls;
- failure modes;
- validation modes;
- user-visible behaviour.

Tests must trace directly to contract assertions. Tests that merely encode implementation drift are insufficient evidence, even when they pass.

## Contract amendments

Contract amendments must be explicit.

If a request changes approved scope, forbidden scope, trust boundaries, command behaviour, validation expectations, or durable assumptions:

1. stop;
2. identify the amendment;
3. update the contract or linked plan;
4. proceed only when the amendment is covered.

Do not silently broaden scope.

## Harness and loader changes

Harness loader or adapter changes are governance-sensitive.

When changing files such as `.github/copilot-instructions.md`, `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, or `ANTIGRAVITY.md`, the PR contract must explicitly cover:

- which harness files may change;
- whether embedded asset copies must change;
- whether instruction packs may change;
- how canonical cARL artefacts remain authoritative;
- how final cARL/docs reconciliation will be reported.

Harness adapter files are not independent authorities. They must route agents toward canonical cARL artefacts and preserve the active PR contract.

## Context reset

At the end of a PR:

- close, supersede, or reset the active contract as appropriate;
- promote only durable lessons into invariants, memory, trust boundaries, or documentation;
- avoid leaving stale active contracts that constrain unrelated future work;
- record reset notes when future sessions may otherwise over-anchor on completed scope.
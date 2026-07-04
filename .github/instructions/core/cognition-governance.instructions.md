<!-- version: 1.3.0 -->
# Cognition Governance Pack

Defines how reasoning depth is selected, how ambiguity is reduced, and how governance checkpoints are preserved across model and harness differences.

## Core principles

- **Use the minimum sufficient reasoning depth.** Start with the lightest depth that can safely satisfy the task, then escalate only if required.
- **Reasoning depth is orthogonal to operating mode.** Plan-only, Assisted implementation, and Automatic modes do not force a fixed reasoning depth.
- **Classify uncertainty before escalation.** Identify whether uncertainty is routine, ambiguous, novel, conflicting, security-sensitive, or governance-sensitive before increasing reasoning depth.
- **Reduce ambiguity before costly execution.** If scope, constraints, trust-boundary effects, or durable governance effects are unclear, pause and clarify before executing.
- **Avoid assumption-driven execution.** Do not convert unresolved ambiguity into implicit assumptions that drive code, configuration, documentation, or governance changes.
- **Escalate when risk dominates.** If wrong assumptions could violate invariants, exceed PR scope, weaken security, or create high rework cost, escalate to explicit user clarification.
- **Treat model availability as unstable.** Do not assume a named model will remain available or equally capable across sessions.
- **Treat model capability as variable.** Do not assume all models will operationalise the same loaded instructions with equal reliability.
- **Preserve the contract across model fallback.** If switching models, keep the same goal, non-goals, scope, invariants, and acceptance criteria unless the user explicitly amends them.
- **Use a correction budget.** One corrective prompt is acceptable. Two means reset the session. Three means abandon the session/model and restart with a clearer plan.
- **Treat test drift as comprehension failure.** If tests validate implementation drift instead of the approved contract, treat that as a contract-comprehension failure rather than successful validation.
- **Escalate repeated assertion corrections.** If the same contract assertion must be corrected more than once in implementation or tests, consume the correction budget and reset the session or switch models instead of continuing prompt repair.

## Required governance checkpoints

For implementation tasks, preserve these checkpoints explicitly:

1. **Hydration checkpoint** — read the active PR contract, memory, invariants, trust boundaries, tool policy, relevant plans, and relevant instruction packs.
2. **Scope checkpoint** — confirm the requested work fits approved scope and does not hit forbidden scope or stop conditions.
3. **Execution checkpoint** — implement the smallest reversible change that satisfies the contract.
4. **Validation checkpoint** — validate contract, implementation, and tests together.
5. **Reconciliation checkpoint** — decide whether documentation or cARL artefacts require updates.
6. **Final report checkpoint** — report the cARL/docs update decision and remaining risks.

Do not rely on inference alone for these checkpoints. Make them explicit in plans and final responses.

## Harness and model reality

Instruction availability is not instruction adherence.

A harness may load an instruction file, but that does not guarantee the selected model will:

- treat it as binding;
- preserve it across multiple turns;
- apply it after implementation;
- reconcile durable artefacts before final response;
- detect stale prompt/session memory conflicts.

Therefore, harness loaders should use short, procedural lifecycle instructions that make hydration, execution, validation, reconciliation, and reporting explicit.

For lower-cost or weaker-reasoning models, restate lifecycle checkpoints in follow-up prompts when needed.

For higher-reasoning models, still require explicit final reporting so governance adherence is auditable rather than assumed.

## Correction budget guidance

Use corrective prompts as evidence.

- **One correction**: acceptable; continue if the model demonstrates understanding.
- **Two corrections**: reset the session or rehydrate from cARL before continuing.
- **Three corrections**: abandon the current session/model and restart with a clearer plan or stronger model.

Repeated missed surfaces, missed cARL/doc reconciliation, stale contract anchoring, or tests that encode drift count against the correction budget.

## Cost-aware escalation

Use cheaper models for bounded, well-scoped implementation only when:

- the PR contract is clear;
- expected files are known;
- tests are available;
- cARL lifecycle checkpoints are explicit;
- human review will check product intent and governance reconciliation.

Escalate to stronger models when:

- architecture is changing;
- trust boundaries are changing;
- security-sensitive behaviour is changing;
- the model has already missed equivalent surfaces;
- the model failed to update or check cARL/docs after implementation;
- the task requires inference across many loosely connected surfaces.
<!-- version: 1.0.1 -->
# Baseline Pack

Defines core engineering operating model, modes, and expectations.

When in doubt on edge cases, state assumptions explicitly, ask a clarifying question if the choice changes the outcome, and prefer the safer interpretation.

-   Plan before code: for any non-trivial change, write a brief plan first. The plan must include Goal, Affected files, Step-by-step changes, Test strategy, and Risks. If the user requests code directly, respond with the brief plan first and ask for confirmation before producing the implementation.
-   Small, reversible changes: each change should touch one logical unit or approximately 50 lines, and should be revertable via a single `git revert` without data migration.
-   Do not skip tests: for every code change, run the existing test suite, add tests covering new behavior, and never disable or delete tests without explicit user approval. If no test framework is present, propose one and add at least one test for the change. If tests cannot be executed, state this explicitly and list the tests that should be run manually.
-   Security rules: never hardcode secrets, validate all external inputs, prefer parameterized queries, flag any change that touches auth or crypto for explicit user review.
-   Precedence when principles conflict: Security > Tests > Reversibility > Small scope. Surface the trade-off to the user before proceeding.
-   Modes: (1) Plan-only — output a numbered plan with no code or file edits. (2) Implement — produce code changes after a plan is approved. Default to Plan-only. Switch to Implement only when the user explicitly says "implement", "apply", or "go ahead". A Plan must include: Goal, Affected files, Step-by-step changes, Test strategy, and Risks. To leave Plan-only mode, the user must say "approve" or "implement".

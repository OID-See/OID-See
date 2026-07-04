<!-- version: 1.2.0 -->
# Baseline Pack

Defines the core engineering operating model, modes, and response expectations.

## General behaviour

When in doubt on edge cases, state assumptions explicitly, ask a clarifying question if the choice changes the outcome, and prefer the safer interpretation.

Do not optimise for “done.” Optimise for correct, maintainable, secure, testable, and explainable change.

## Core rules

- **Plan before code.** For any non-trivial change, write a brief plan first. The plan must include Goal, Affected files, Step-by-step changes, Test strategy, Risks, and cARL/docs update expectation.
- **Small, reversible changes.** Each change should touch one logical unit where practical and should be revertible via a single `git revert` without data migration.
- **Existing patterns first.** Inspect the repository before introducing a new pattern. Prefer existing naming, file layout, error handling, logging, dependency, testing, and CI/CD conventions.
- **No unrelated refactors.** Do not clean up or redesign adjacent code unless explicitly in scope.
- **Do not skip tests.** For every code change, run the relevant existing validation where possible and add/update tests for changed behaviour when appropriate.
- **Tests are contract assertions, not post-hoc justifications.** Make tests prove the approved behaviour, not whatever was implemented first.
- **Security rules.** Never hardcode secrets, validate external inputs, avoid unsafe execution, preserve authentication and authorization controls, and flag any change that touches auth or crypto for explicit user review.
- **Dependency discipline.** Do not add dependencies casually. Prefer native implementation for small functionality when safe.
- **Precedence when principles conflict.** Security > PR contract > invariants > tests > reversibility > small scope > style. Surface the trade-off to the user before proceeding.
- **Governance reconciliation.** Before final response, decide whether docs or cARL artefacts need updates. If they do, update them. If they do not, explicitly state why.

## Operating modes

Default to Plan-only mode.

Switch modes only by explicit user instruction.

### Plan-only mode

Use when the user has not explicitly approved implementation.

In Plan-only mode:

- do not apply code changes;
- do not run tests;
- provide a numbered or structured plan;
- identify affected files;
- identify validation steps;
- identify likely cARL/docs updates;
- ask for approval before implementation.

### Assisted implementation mode

Use only when the user explicitly says something like:

- `implement`
- `apply`
- `make the change`
- `proceed`
- `approved`
- `go ahead`

In Assisted implementation mode:

- hydrate cARL before edits;
- stay inside the active PR contract;
- make focused changes;
- run relevant validation where possible;
- reconcile docs/cARL before final response.

### Automatic mode

Use only when the user explicitly writes `automatic mode`.

Automatic mode allows end-to-end implementation without pausing between steps, but it does not bypass:

- cARL hydration;
- PR contract scope;
- invariants;
- tool policy;
- validation;
- cARL/docs reconciliation;
- final risk reporting.

## Required final response

Final responses must include:

    summary

    changes

    tests run/not run

    cARL/docs update decision

    risks

In Plan-only mode, report:

- no code changes proposed;
- tests not run because Plan-only mode;
- whether cARL/docs updates are expected if the plan is implemented.

Under `cARL/docs update decision`, state one of:

- cARL/docs updated, with files listed;
- no cARL/docs update required, with reasoning;
- cARL/docs update needed but not completed, with reason and recommended follow-up.
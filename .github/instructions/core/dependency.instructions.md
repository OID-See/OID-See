<!-- version: 1.2.0 -->
# Dependency Pack

Defines dependency discipline for code, tooling, generated artefacts, and agent-governed runtime assets.

## Core rule

Do not add dependencies casually.

A dependency is approved only when it is necessary, justified, scoped, maintainable, and safer than a small native implementation.

## Dependency decision criteria

Before adding or upgrading a dependency, check:

- **Necessity** — is the dependency required to satisfy the PR contract?
- **Scope** — is the dependency inside approved PR scope?
- **Blast radius** — does it affect runtime, build, tests, release, CI/CD, or generated artefacts?
- **Maintenance** — is it actively maintained and reasonably stable?
- **Security** — does it introduce known vulnerabilities, unsafe transitive dependencies, or risky behaviours?
- **Licence** — is the licence compatible with the project?
- **Alternatives** — can the standard library or existing dependencies solve this safely?
- **Reversibility** — can the change be reverted cleanly?

If any answer is unclear, escalate before implementation.

## Preferred approach

Prefer, in order:

1. existing repository utilities and patterns;
2. language standard library;
3. small local implementation;
4. narrowly scoped dependency with clear justification;
5. broad framework or toolchain dependency only with explicit approval.

## Go-specific dependency guidance

For Go projects:

- prefer the standard library where practical;
- avoid introducing dependencies for simple parsing, formatting, filesystem traversal, or CLI output unless complexity clearly warrants it;
- keep `go.mod` and `go.sum` changes intentional and reviewable;
- run `go mod tidy` only when dependency changes require it;
- do not allow unrelated `go.mod` or `go.sum` churn;
- validate with `go test ./...` when dependency state changes;
- explain any dependency addition in final response.

## Generated and embedded assets

Generated or embedded assets may create hidden dependency paths.

When changing managed runtime assets, embedded assets, or generated artefacts:

- identify the source of truth;
- identify whether embedded copies must remain byte-identical;
- avoid manual drift between source and embedded managed copies;
- validate install, repair, sync, or health-check behaviour where relevant;
- avoid introducing build-time dependencies without explicit approval.

## CI/CD and toolchain dependencies

Changes to CI/CD tooling, release tooling, build actions, linters, formatters, or package managers are high-blast-radius.

Treat these as governance-sensitive unless the active PR contract explicitly covers them.

When changing CI/CD dependencies:

- minimise permissions;
- pin versions where possible;
- avoid untrusted remote script execution;
- avoid broad token scopes;
- validate workflow syntax or document why validation was not possible;
- describe release or build impact in final response.

## Agent and harness dependencies

Harness adapters and instruction packs should not depend on model-specific quirks unless the dependency is explicit, documented, and resilient to fallback.

Do not make governance depend on:

- a single model’s inferred behaviour;
- prompt/session memory;
- undocumented harness behaviour;
- UI-specific behaviour that cannot be validated;
- hidden ordering between instruction files.

If model-specific handling is required, document it as a field finding or harness limitation.

## Final response expectations

When dependencies are added, removed, upgraded, or intentionally avoided, final response must state:

- dependency changed or avoided;
- reason;
- scope;
- validation run;
- residual risk;
- whether cARL/docs updates were required.
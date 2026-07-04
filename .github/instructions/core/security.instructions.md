<!-- version: 1.2.0 -->
# Security Pack

Defines baseline security expectations for implementation, validation, and governance-sensitive changes.

## Core security rules

- **Never hardcode secrets.** Do not commit credentials, tokens, private keys, API keys, connection strings, passwords, certificates, signing material, or secret-derived test fixtures.
- **Preserve authentication controls.** Do not weaken authentication, authorization, session handling, token validation, identity boundaries, or access checks without explicit user approval and PR contract coverage.
- **Validate external input.** Treat CLI arguments, environment variables, config files, network responses, file paths, user-controlled repository content, and generated artefacts as untrusted unless explicitly proven otherwise.
- **Avoid unsafe execution.** Do not introduce shell execution, dynamic code execution, unsafe deserialization, path traversal, template injection, or command composition without explicit validation and escaping.
- **Use least privilege.** Keep filesystem, network, token, and tool access as narrow as possible.
- **Prefer deterministic behaviour.** Security-sensitive code should avoid hidden side effects, non-deterministic mutation, or silent fallback behaviour.
- **Fail safely.** Prefer explicit errors with actionable messages over silent success, partial writes, or ambiguous degraded states.
- **Protect managed artefacts.** Do not overwrite protected files, runtime state, or user-owned memory unless the active PR contract authorises the change.

## cARL-specific security boundaries

cARL controls how delegated agents receive and apply repository governance. Treat governance files as security-relevant because they influence future autonomous or semi-autonomous behaviour.

Security-sensitive cARL surfaces include:

- `.github/copilot-instructions.md`
- `CLAUDE.md`
- `AGENTS.md`
- `.cursorrules`
- `ANTIGRAVITY.md`
- `.github/carl/invariants.yml`
- `.github/carl/trust-boundaries.md`
- `.github/carl/tool-policy.yml`
- `.github/carl/current-pr-contract.md`
- `.github/carl/current-pr-contract.template.md`
- `.github/carl/memory.md`
- `.github/instructions/**/*.instructions.md`
- embedded managed asset copies under `embedded/assets/.github/**`
- CI/CD workflows under `.github/workflows/**`

Changes to these surfaces must remain inside the approved PR contract and should be called out in final response.

## Harness adapter safety

Harness adapter files are not authorities. They are loaders that route agents toward canonical cARL artefacts.

Adapter files must not:

- redefine governance independently from cARL;
- contradict `.github/carl/*` artefacts;
- bypass the active PR contract;
- weaken validation or reconciliation requirements;
- hide cARL/docs update obligations;
- instruct agents to trust prompt/session memory over repository cARL state.

Adapter files should:

- make hydration explicit;
- make validation explicit;
- make cARL/docs reconciliation explicit;
- preserve the authority order;
- direct agents toward canonical cARL artefacts;
- report remaining risk and validation gaps.

## File and path safety

When code reads or writes repository files:

- normalise and validate paths;
- keep writes inside the repository root;
- reject path traversal outside expected roots;
- avoid following symlinks for managed artefact writes unless explicitly intended and tested;
- avoid broad writes unless the PR contract authorises them;
- make write operations idempotent where possible;
- prefer compare-before-write for managed artefact repair or sync operations;
- preserve user-owned files unless overwrite is explicit and documented.

## Supply chain and dependency rules

- Do not add dependencies unless explicitly justified.
- Prefer the standard library for small, bounded functionality.
- Do not introduce unpinned remote scripts, curl-pipe-shell patterns, or dynamic installer execution.
- Treat generated artefacts and embedded assets as supply-chain relevant when they are used to install, repair, or sync managed governance files.
- Validate dependency or build-pipeline changes with explicit tests or manual review notes.

## CI/CD safety

Changes to workflows, release automation, generated artefacts, signing, publishing, or permissions are high-impact.

When touching CI/CD:

- minimise permissions;
- avoid broad token scopes;
- avoid untrusted script execution;
- preserve reproducibility;
- document release-impacting behaviour;
- validate workflow syntax or state why it could not be validated.

## Validation expectations

For security-sensitive changes, validation should include at least one direct check for the relevant security property.

Examples:

- path validation rejects traversal;
- protected files remain protected;
- sync/repair does not overwrite excluded files;
- malformed managed blocks fail safely;
- warnings do not become silent success;
- governance files remain byte-identical where required;
- harness adapters continue to route to cARL rather than duplicating authority.

If direct validation is not possible, final response must state the gap and the manual review required.

## Final response expectations

When a change touches security-sensitive surfaces, final response must state:

- what security boundary was touched;
- whether the active PR contract covered it;
- what validation was run;
- what validation was not run;
- whether cARL/docs were updated or not required;
- any residual risk.
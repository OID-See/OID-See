<!-- version: 1.3.0 -->
# Current PR Contract

## Goal
Improve the project metadata by adding a concise set of relevant Shields.io
badges and making the repository's declared Apache 2.0 licensing explicit
through a canonical root licence file.

## Contract status
active

## Non-goals
- Changing application code, scoring logic, schemas, tests, or dependencies.
- Adding CI workflows or badges that imply an automated test/build status.
- Claiming capabilities or compatibility not evidenced by the repository.

## Approved scope
- Update the badge block near the top of `README.md`.
- Remove or correct an existing badge when its target is missing or stale.
- Add the canonical Apache License 2.0 text as `LICENSE`.
- Restore the Apache 2.0 badge and link it to `LICENSE`.
- Keep this contract aligned with the metadata-only implementation scope.

## Intentional amendments
This contract supersedes the completed `compute_risk_for_sp()` test-signature
sync contract merged in PR #89. No durable invariant or trust boundary is
amended. The user explicitly expanded scope to add the Apache 2.0 licence
already declared in `README.md`.

## Forbidden scope
- No changes outside `README.md`, `LICENSE`, and this contract.
- No dependency, application, schema, test, CI, or release changes.

## Architectural constraints
- Badges must use Shields.io image URLs.
- Static version claims must match the current repository manifests and code.
- Badge links must point to relevant repository documentation or authoritative
  project pages.
- `LICENSE` must reproduce the canonical Apache License 2.0 text.

## Security constraints
- Do not add secrets, tokens, private endpoints, or badges requiring embedded
  credentials.
- Describe Microsoft Graph access as read-only, consistent with project
  invariants.

## Files expected to change
- `README.md`
- `LICENSE`
- `.github/carl/current-pr-contract.md`

## Tests / validation
- Inspect the rendered Markdown structure and badge targets.
- Compare the licence heading and sections with the canonical Apache source.
- Verify version/capability claims against repository files.
- Run `git diff --check`.

## Stop conditions
Stop if an appropriate badge would require a secret, external account
configuration, a new workflow, or an unsupported compatibility claim.

## Escalation triggers
Ask before expanding the change beyond project licensing and the README badge
block.

## Context reset notes
Close or supersede this contract when the README badge change is committed,
merged, or abandoned. No new durable invariant is expected.

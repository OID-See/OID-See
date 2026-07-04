<!-- version: 1.1.0 -->
# Current PR Contract

This contract constrains implementation scope for the active PR. Update
it when scope is explicitly amended. If a requested action falls outside
approved scope, stop and escalate before proceeding.

Use this contract to distinguish active PR constraints, completed PR
constraints, durable invariants, and intentional amendments. Completed
PR constraints are historical evidence unless they are explicitly
promoted to durable invariants.

## Goal
Fix the 18 failing pytest tests caused by `compute_risk_for_sp()` API
drift: restore alignment between the test suite and the current function
signature in `oidsee_scanner.py` after commit `10c5b3e` removed the
`has_privileged_scopes`/`has_too_many_scopes` (and related
`has_readwrite_all_scopes`/`has_action_scopes`) boolean parameters in
favour of deriving scope risk from `delegated_scopes_by_resource` via
`classify_scopes()`.

## Contract status
active
<!-- Uncommitted in the working tree as of 2026-07-04; not yet opened as a GitHub PR. -->

## Non-goals
- Fixing the missing `fetch_group_member_counts_batched`/
  `group_member_count_cache` batched-group-counting feature (6 unrelated
  failing tests) — this is a separate, larger feature gap, not test debt.
- Fixing `tests/test_report_generator.py::test_generate_report`'s missing
  "Apps Without Owners" metric — separate root cause in
  `report_generator.py`.
- Adding `jsonschema` to `requirements.txt` (documented as a follow-up,
  not required to fix the target failures).
- Any change to production scoring/business logic in `oidsee_scanner.py`.
- Any broad refactor, dependency upgrade, or CI workflow addition.

## Carry-forward rules
The `scanner-signature-test-sync` invariant (added to
`.github/carl/invariants.yml` in this same change) is a durable rule and
carries forward beyond this PR. The specific list of 6 touched test files
below is scoped to this PR only and is not a durable constraint.

## Approved scope
- Remove stale/obsolete keyword arguments from `compute_risk_for_sp(...)`
  call sites in:
  - `tests/test_appownership_risk_logic.py`
  - `tests/test_empty_replyurls.py`
  - `tests/test_enrichment_filtering.py`
  - `tests/test_integration_e2e.py`
  - `tests/test_new_scoring_contributors.py`
  - `tests/test_tier_scoring.py`
- Where a removed boolean flag was set to `True` and asserted on
  (`test_integration_e2e.py::test_combined_scenario` expecting
  `HAS_PRIVILEGED_SCOPES`), substitute an equivalent
  `delegated_scopes_by_resource` entry so the test still exercises the
  intended behaviour through the current API.

## Intentional amendments
None. This PR does not amend any existing invariant or trust boundary;
it adds new repo-specific invariants and durable memory (see cARL/docs
update decision in final response).

## Forbidden scope
- No changes to `oidsee_scanner.py` or any other production file.
- No changes to test files outside the 6 listed above.
- No dependency additions or version bumps.
- No CI workflow creation.

## Architectural constraints
Scope-risk detection must remain sourced from `delegated_scopes_by_resource`
processed through `classify_scopes()`; tests must exercise this real path
rather than reintroducing removed boolean flags.

## Security constraints
No authentication, authorization, validation, or secret-handling behaviour
is affected by this PR.

## Files expected to change
- `tests/test_appownership_risk_logic.py`
- `tests/test_empty_replyurls.py`
- `tests/test_enrichment_filtering.py`
- `tests/test_integration_e2e.py`
- `tests/test_new_scoring_contributors.py`
- `tests/test_tier_scoring.py`

## Tests / validation
- `python -m pytest tests/ -q` — result: 25 failed / 203 passed before the
  fix; 7 failed / 221 passed after (the 7 remaining failures are the
  explicitly out-of-scope issues listed under Non-goals).
- Targeted reruns of each of the 6 touched files individually — all green.

## Stop conditions
Stop and escalate if fixing the target failures would require modifying
`oidsee_scanner.py` (it should not — production code is already correct
per the intentional `10c5b3e` refactor).

## Escalation triggers
If any of the 7 remaining out-of-scope failures turn out to share the
same root cause as the in-scope fix, pause and confirm with the user
before expanding scope.

## Context reset notes
Close this contract once the test-file changes are committed/merged (or
explicitly abandoned). At that point, promote no additional constraints
beyond the `scanner-signature-test-sync` invariant already recorded in
`.github/carl/invariants.yml`.

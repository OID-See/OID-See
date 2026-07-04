<!-- version: 1.0.0 -->
# cARL Plans
This directory stores version-controlled planning artefacts for substantial, long, or boundary-sensitive agent tasks.

Use prompt-as-code when a task is long, nested, security-sensitive,
trust-boundary-changing, or likely to suffer UI prompt truncation or
misparse.

Plan files are contracts, not scratchpads.

The coding agent should read the relevant plan file and produce
plan-only output before implementation.

Temporary root-level `PLAN.md` files are acceptable during
feature-branch work, but should be removed or moved into
`.github/carl/plans/` before merge.

Plan files must not contain secrets, tenant data, private customer data,
or live credentials.

Recommended naming:

`.github/carl/plans/prN-short-description.md`

## When to use prompt-as-code

- long or nested prompt
- boundary-sensitive work
- trust-boundary amendment
- model comparison
- repeated prompt misunderstanding
- work requiring line-addressable instructions
- mobile/UI prompt fragility

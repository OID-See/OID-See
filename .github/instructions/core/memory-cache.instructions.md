<!-- version: 1.2.0 -->
# Memory Cache Pack

Defines how to maintain a durable architectural truth cache without turning it into a per-turn session diary.

## Purpose

`.github/carl/memory.md` captures durable project truth:

- stable purpose;
- architecture facts;
- invariants;
- trust boundaries;
- operating assumptions;
- persistent open questions;
- recurring workflow hazards;
- stable field findings that should influence future work.

It is not a scratchpad, session transcript, or running implementation diary.

## Authority

Treat `.github/carl/memory.md` as durable guidance, but verify it against current repository state when it appears stale, incomplete, or conflicting.

If `.github/carl/memory.md` conflicts with current repository state, current repository state wins and memory should be updated.

If prompt/session memory conflicts with `.github/carl/memory.md`, trust `.github/carl/memory.md` unless repository state proves it stale.

## Update rules

- **Use memory as durable architecture truth.** Record facts, decisions, invariants, trust boundaries, assumptions, and open questions that should persist beyond the current task.
- **Update only when persistence is warranted.** Do not update memory for every implementation detail or transient execution note.
- **Do not force phase-by-phase logging.** Avoid mechanical per-phase writes that create noise without durable value.
- **Prefer stable wording over transient detail.** Keep entries focused on enduring guidance rather than ephemeral session events.
- **Validate stale entries before reliance.** When context changes materially, confirm memory content against current repository state.
- **Preserve open questions explicitly.** Persist unresolved high-impact questions so future tasks do not rediscover the same ambiguity.
- **Record durable field-test lessons.** Persist recurring workflow hazards such as prompt transport failures, stale contract anchoring, model availability gaps, model capability gaps, harness adapter drift, and repeated correction loops when they should influence future planning.
- **Store workflow-relevant findings selectively.** Field-test findings may be stored as durable project truth when they affect future workflow, but do not store all session chatter.
- **Capture stable failure modes only.** Record prompt transport issues, model availability issues, instruction-adherence issues, and repeated failure modes when they are stable enough to guide future work.
- **Record authority changes.** Update memory when the relationship between canonical cARL artefacts, instruction packs, and harness adapter files changes.
- **Record lifecycle lessons.** Update memory when a model or harness requires a new durable checkpoint such as explicit hydration, reconciliation, or cARL/docs update reporting.

## Reconciliation decision

Before final response, decide whether memory should be updated.

Update memory when the change affects:

- durable architecture;
- operating model;
- command behaviour;
- governance authority;
- trust boundaries;
- stable assumptions;
- accepted non-goals;
- validation expectations;
- recurring agent failure modes;
- roadmap-relevant facts.

Do not update memory when the change is only:

- a local implementation detail;
- a small bug fix that does not alter durable behaviour;
- a test-only change with no durable lesson;
- a documentation wording tweak that does not change project truth;
- a completed task note with no future relevance.

If no memory update is required, explicitly state why.
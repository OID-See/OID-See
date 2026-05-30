<!-- version: 1.0.0 -->
# Memory Cache Pack

Defines how to maintain a durable architectural truth cache without turning it into a per-turn session diary.

-   **Use memory as durable architecture truth.** `.github/aadlc/memory.md` captures stable purpose, invariants, trust boundaries, and persistent open questions.
-   **Update only when persistence is warranted.** Record facts, decisions, invariants, or unresolved questions that should survive beyond the current task.
-   **Do not force phase-by-phase logging.** Avoid mechanical per-phase cache writes that create noise without durable value.
-   **Prefer stable wording over transient detail.** Keep entries focused on enduring guidance rather than ephemeral execution notes.
-   **Validate stale entries before reliance.** When context changes materially, confirm cache content against current repository state.
-   **Preserve open questions explicitly.** Persist unresolved high-impact questions so future tasks do not rediscover the same ambiguity.

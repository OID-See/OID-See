<!-- version: 1.0.0 -->
# Cognition Governance Pack

Defines how reasoning depth is selected and when ambiguity must be reduced before execution.

-   **Use the minimum sufficient reasoning depth.** Start with the lightest depth that can safely satisfy the task, then escalate only if required.
-   **Reasoning depth is orthogonal to operating mode.** Plan-only, Assisted implementation, and Automatic modes do not force a fixed reasoning depth.
-   **Classify uncertainty before escalation.** Identify whether uncertainty is routine, ambiguous, novel, or conflicting before increasing reasoning depth.
-   **Reduce ambiguity before costly execution.** If scope, constraints, or trust-boundary effects are unclear, pause and clarify before executing.
-   **Avoid assumption-driven execution.** Do not convert unresolved ambiguity into implicit assumptions that drive code or configuration changes.
-   **Escalate when risk dominates.** If wrong assumptions could violate invariants or create high rework cost, escalate to explicit user clarification.

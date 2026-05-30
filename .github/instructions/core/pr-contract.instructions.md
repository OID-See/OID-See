<!-- version: 1.0.0 -->
# PR Contract Pack

Defines the PR contract controls that constrain implementation scope and govern escalation.

-   **Create a contract before implementation.** Use `.github/aadlc/current-pr-contract.md` to capture goal, non-goals, scope, constraints, and stop conditions.
-   **Treat approved scope as execution boundary.** Planned implementation must remain inside approved scope unless explicitly amended.
-   **Enforce forbidden scope explicitly.** Do not execute changes that fall into forbidden scope without user-approved contract amendment.
-   **Honor architectural and security constraints.** Contract constraints are mandatory guardrails during implementation and validation.
-   **Validate against expected file and test surfaces.** Keep changes aligned to expected files and listed validation commands.
-   **Use escalation triggers and reset notes.** Escalate when trigger conditions are met and document context reset expectations on completion.

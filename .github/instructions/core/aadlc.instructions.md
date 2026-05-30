<!-- version: 1.0.0 -->
# AADLCv2 Cognition Governance Pack

Defines the AADLCv2 governance model that coordinates shaping, planning, execution, validation, and context reset.

-   **Delegated cognition is a governed resource.** Treat agent cognition as accountable project capacity, not ambient background activity.
-   **Separate work phases deliberately.** Keep shaping, planning, execution, validation, and context reset distinct to reduce hidden branching.
-   **Use the minimum sufficient reasoning depth.** Increase depth only when uncertainty, novelty, or risk warrants the additional cost.
-   **Preserve primary engineering goals.** Correctness, security, maintainability, and testability remain primary objectives across all phases.
-   **Reduce ambiguity before expensive or autonomous execution.** Clarify uncertain requirements before broad changes, high-impact tool use, or autonomous execution steps.
-   **Constrain execution with a PR contract.** Use `.github/aadlc/current-pr-contract.md` to define approved scope, constraints, and escalation triggers.
-   **Reuse durable knowledge.** Use `.github/aadlc/memory.md` as a durable architectural truth cache to avoid repeated semantic rediscovery.
-   **Enforce tool-permission tiers.** Apply tiered tool governance via `.github/aadlc/tool-policy.yml` and `tool-permission-tiers.instructions.md`.

<!-- version: 1.0.0 -->
# Tool Permission Tiers Pack

Defines tiered governance for tool usage to reduce hidden branching and autonomous overreach.

-   **Classify each tool action before execution.** Map every action to Tier 0, Tier 1, or Tier 2 as defined in `.github/aadlc/tool-policy.yml`.
-   **Tier 0 actions remain read-only.** Read and inspection actions can proceed without escalation when they do not modify state.
-   **Tier 1 actions require scope confirmation.** Scoped writes require intent declaration and confirmation against approved PR scope.
-   **Tier 2 actions require explicit escalation.** Destructive or broad actions require explicit user approval and contract coverage.
-   **When uncertain, classify up.** If tier is unclear, use the higher tier and escalate rather than assuming lower risk.
-   **Prohibit hidden side-effect branching.** Do not perform non-read actions implicitly while claiming read-only exploration.

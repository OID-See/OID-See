<!-- version: 1.1.0 -->
# Trust Boundaries

Trust boundaries classify information sources and define required validation before shaping, planning, execution, validation, or reconciliation decisions.

| Boundary | Source | Trust level | Required validation |
|---|---|---|---|
| Current repository state | Current checked-in files and directory structure | Highest | Verify paths and current content before editing; repository state wins over stale memory when directly observed |
| User instruction | Direct user requests in this session | High | Clarify ambiguity and confirm material scope assumptions; user instruction must still remain inside approved scope unless the contract is amended |
| PR contract | `.github/carl/current-pr-contract.md` | High | Confirm requested work is within approved scope; stop when forbidden scope or escalation triggers are reached |
| Invariants | `.github/carl/invariants.yml` | High | Preserve unless explicitly amended through a user-approved governance change |
| Trust boundary model | `.github/carl/trust-boundaries.md` | High | Use to classify source authority and validation expectations before relying on information for writes |
| Tool policy | `.github/carl/tool-policy.yml` | High | Classify tool actions before execution and escalate according to tier |
| Prompt-as-code plans | `.github/carl/plans/*.md` | High when active | Treat as task contracts when referenced by the active PR contract or user; verify status and scope before implementation |
| Cognitive cache | `.github/carl/memory.md` | Medium-high | Treat as durable guidance; validate against current repository state if stale, conflicting, or structurally outdated |
| Instruction packs | `.github/instructions/**/*.instructions.md` | Medium-high | Apply relevant packs for language, platform, cloud, security, dependency, and governance guidance; do not treat packs as task-specific scope approval |
| Harness adapter files | `.github/copilot-instructions.md`, `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `ANTIGRAVITY.md` | Medium | Treat as context loaders/adapters only; use them to locate canonical cARL artefacts, not as independent governance authorities |
| Tool output | Search, file-read, command output, test output, CI output | Medium | Confirm relevance, freshness, and exact path before using for writes or conclusions |
| Prompt/session memory | Conversation history, model memory, stale prompt context | Low-medium | Use as hints only; verify against current repository state and canonical cARL artefacts before relying on it |
| External API response | Remote services and web sources | Low | Cross-check critical claims before using in implementation decisions |

## Crossing rules

- Cross-boundary assumptions that alter scope require explicit confirmation.
- Current repository state wins over `.github/carl/memory.md` when directly observed and conflicting.
- If durable cache facts conflict with current repository state, repository state wins and cache should be updated.
- Canonical cARL artefacts outrank harness adapter files.
- Harness adapter files may load, summarise, or route to cARL, but they are not the source of durable governance truth.
- Prompt/session memory is advisory and may be stale.
- Repository cARL artefacts outrank stale prompt/session memory when they conflict.
- PR contract constraints apply throughout execution until contract context is reset, closed, or superseded.
- Invariants are preserved unless explicitly amended through user-approved governance change.
- External API output must not determine write targets without additional validation.
- Tool output must not be treated as authoritative unless it is current, relevant, and path-specific.
- If two high-trust sources conflict, stop and report the conflict rather than silently choosing the convenient interpretation.

## Harness adapter boundary

Harness adapters are an execution-context boundary.

They influence what an agent sees first, but they do not guarantee what the model will understand, remember, or apply across a task.

Required control:

1. adapter loads or points to cARL;
2. agent hydrates canonical cARL artefacts before planning or implementation;
3. agent executes inside the active PR contract;
4. agent validates implementation against contract assertions;
5. agent reconciles cARL/docs before final response;
6. agent reports the cARL/docs update decision.

Instruction availability is not instruction adherence. Loader files must make the lifecycle explicit enough that weaker or cheaper models can follow it without relying on inference.
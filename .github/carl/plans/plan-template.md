<!-- version: 1.1.0 -->
# cARL Plan Template

## Plan metadata
- PR / branch:
- Status:
- Author:
- Created:
- Last updated:

## Task summary

## Current repository context

## Previous contract status

## Contract lifecycle note
Completed PR contracts are historical evidence, not binding scope. Only constraints explicitly promoted to durable invariants carry forward. This plan may intentionally amend previous constraints when the amendment is explicit, scoped, and recorded here.

## Intentional contract amendments

## Goal

## Non-goals

## Approved scope

## Forbidden scope

## Trust boundaries

## Invariants to preserve

## Expected files / directories

## Implementation phases

## Acceptance criteria

## Contract assertions
List 3-5 acceptance criteria that must be directly asserted in tests for
non-trivial work. Prioritise output schemas, CLI/API contracts,
warning/error semantics, trust-boundary behavior, persistence formats,
security controls, and failure modes when they are in scope.

## Test strategy
Map each planned test back to the contract assertions above and note any
exact schema, interface, or failure-semantic checks that must hold.

## Prompt ping-pong budget
One corrective prompt is acceptable. Two corrective prompts means reset the session. Three means abandon the session/model and restart with a fresh model or clearer plan.

## Model fallback strategy
Model availability and capability are not stable invariants. If the preferred model is unavailable or repeatedly misinterprets the contract, switch model/session without changing the PR contract, non-goals, or acceptance criteria.

## Stop conditions

## Context reset requirements

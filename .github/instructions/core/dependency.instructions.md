<!-- version: 1.0.1 -->
# Dependency Discipline Pack

When edge cases arise, prefer human review over guessing.

-   Prefer the latest stable release that has no known Critical or High severity CVEs per the NVD or the package ecosystem's advisory database. If no version is free of Critical or High CVEs, do not add the dependency and surface the finding for human review along with suggested alternatives. If CVE data is unavailable for a candidate version, treat it as unverified and require explicit human approval before adoption.
-   Avoid adding a dependency when the required functionality can be implemented in fewer than 300 lines of code.
-   For every new direct dependency, include a justification in the PR description covering: purpose, alternatives considered, license, and last-release recency. Transitive dependencies do not require justification. When modifying code that uses an existing dependency, re-evaluate it against these rules and propose removal or upgrade if it now violates them. Reject dependencies whose license is incompatible with the project license.
-   Prefer the language standard library or in-house implementations over third-party packages when the implementation effort is under the 300 LOC threshold and no specialized expertise is required.

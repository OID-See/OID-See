<!-- version: 1.0.1 -->
# Security Pack

When edge cases arise, prefer the safer interpretation and ask a clarifying question if the choice changes the risk profile.

-   Never hard-code secrets. Store secrets in a managed secret store (for example, AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault) and access them at runtime with short-lived credentials; never commit secrets to source control or log them.
-   Validate all data crossing a trust boundary (HTTP requests, file uploads, environment variables, third-party API responses, IPC messages) using an explicit schema or allowlist before use. On validation, authentication, or authorization failure, return a generic 400, 401, or 403 without stack traces, internal IDs, or enumeration clues.
-   Enforce auth/authz boundaries. Log authentication, authorization, and privilege-change events, but never log secrets, tokens, PII, or full request bodies containing sensitive fields.
-   Avoid SSRF, injection, and unsafe execution. Prevent SSRF by allowlisting outbound URLs; prevent SQL injection with parameterized queries; prevent command injection by avoiding shell=true or equivalent; prevent XSS via output encoding; prevent template injection by not using user-controlled templates; and avoid eval, unsafe deserialization, and dynamic code loading.
-   Use vetted cryptographic libraries only. Hash passwords with bcrypt or argon2id. Use TLS 1.2 or later for all network traffic. Do not implement custom crypto.
-   Apply least privilege to all IAM roles, service accounts, DB users, API tokens, and container capabilities, and deny by default. Pin dependency versions, run SCA or vulnerability scans in CI, and prefer dependencies with signed provenance where available.
-   Manage identities, roles, and permissions declaratively in version-controlled config (IaC). Do not create users or roles ad hoc at runtime or via console.

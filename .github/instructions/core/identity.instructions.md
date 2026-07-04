<!-- version: 1.1.0 -->
# Identity & Trust Pack

Response behavior:

When you detect a violation of these rules in user code or designs, (1) explicitly call out the issue with severity, (2) explain the risk, and (3) propose a concrete remediation with a code example.

Apply this pack whenever the user's request involves authentication, authorization, token handling, service-to-service calls, identity propagation, delegated access, service principals, managed identities, workload identity, API keys, mTLS, SAS tokens, or trust-boundary design.

## Identity and trust rules

- Do not assume trust based on first-party status. Calls originating from services owned by the same organization or publisher must still be authenticated and authorized.

- When reviewing or generating authentication code, ensure JWT-based bearer tokens are validated for signature, issuer (`iss`), audience (`aud`), expiry (`exp`/`nbf`), and required scopes or roles before granting access. These rules apply to OAuth2/OIDC access tokens and ID tokens. For other credential types such as SAS, mTLS, API keys, managed identity tokens, or workload identity tokens, apply the equivalent integrity, expiry, audience/resource binding, and least-privilege checks appropriate to that mechanism.

- Treat control-plane and data-plane operations as separate trust boundaries. Require distinct tokens, scopes, and audit logging for each, and flag any code path that uses a control-plane credential to perform data-plane operations. If the code's trust boundary or plane cannot be determined from context, ask the user to clarify before recommending an identity model.

- Flag any code where a privileged service performs an action on behalf of a less-privileged caller without re-validating the caller's authorization on the target resource. This is a confused deputy pattern.

- If the user requests code that disables or weakens identity validation, warn about the risk, provide the requested code only with prominent comments marking it as non-production, and suggest a safer alternative.

- Do not treat possession of a token as proof of authorization. Validate that the token is intended for the receiving service, current operation, target resource, caller, tenant, and trust boundary.

- Do not conflate authentication with authorization. A valid identity proves who or what the caller is; it does not prove the caller is allowed to perform the requested action.

- Do not rely on client-controlled claims, headers, device metadata, group names, application names, publisher labels, or tenant display names as security boundaries unless they are cryptographically protected or independently validated by a trusted authority.

- Prefer explicit allow-lists for trusted issuers, audiences, tenants, applications, scopes, roles, certificate authorities, and service identities.

- For multi-tenant or cross-tenant identity flows, validate tenant boundaries explicitly. Do not assume a token from a valid issuer is acceptable for all tenants or all resources.

- For service-to-service calls, prefer short-lived credentials, managed identity, workload identity federation, mTLS, or certificate-based authentication over long-lived shared secrets where practical.

- For delegated flows, preserve caller context where needed and re-check authorization at the resource boundary. Do not let a backend service’s stronger privileges silently bypass the caller’s weaker permissions.

- For application permissions or daemon flows, ensure least privilege, explicit resource scoping, auditability, and compensating controls where user context is absent.

## Review guidance

When reviewing an identity design or implementation, check:

- who the caller is;
- who issued the credential;
- who the credential is intended for;
- what resource or operation the credential authorizes;
- whether the operation is control-plane or data-plane;
- whether caller authorization is revalidated at the target resource;
- whether token lifetime and replay risk are acceptable;
- whether audit logs can distinguish caller, service, target resource, and action;
- whether a confused deputy path exists;
- whether any trust decision relies on mutable or client-controlled metadata.

## cARL governance note

Identity and trust-boundary changes are security-sensitive.

If a change touches authentication, authorization, token validation, delegated access, service identity, control-plane/data-plane boundaries, or trust propagation, the active PR contract must explicitly cover the change.

Final responses for identity-sensitive work must state:

- which trust boundary was touched;
- what identity property was validated or protected;
- what authorization decision was enforced;
- what validation was run;
- any residual identity or confused-deputy risk.
<!-- version: 1.0.1 -->
# Identity & Trust Pack

Response behavior:

When you detect a violation of these rules in user code or designs, (1) explicitly call out the issue with severity, (2) explain the risk, and (3) propose a concrete remediation with a code example.

Apply this pack whenever the user's request involves authentication, authorization, token handling, service-to-service calls, or identity propagation.

-   Do not assume trust based on first-party status (that is, calls originating from services owned by the same organization or publisher must still be authenticated and authorized).
-   When reviewing or generating authentication code, ensure JWT-based bearer tokens are validated for signature, issuer (iss), audience (aud), expiry (exp/nbf), and required scopes or roles before granting access. These rules apply to OAuth2/OIDC access tokens and ID tokens; for other credential types such as SAS, mTLS, API keys, or managed identity tokens, apply the equivalent integrity, expiry, and least-privilege checks appropriate to that mechanism.
-   Treat control-plane and data-plane operations as separate trust boundaries: require distinct tokens, scopes, and audit logging for each, and flag any code path that uses a control-plane credential to perform data-plane operations. If the code's trust boundary or plane cannot be determined from context, ask the user to clarify before recommending an identity model.
-   Flag any code where a privileged service performs an action on behalf of a less-privileged caller without re-validating the caller's authorization on the target resource (confused deputy pattern). If the user requests code that disables or weakens identity validation, warn about the risk, provide the requested code only with prominent comments marking it as non-production, and suggest a safer alternative.

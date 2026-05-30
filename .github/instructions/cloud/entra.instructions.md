<!-- version: 1.0.1 -->
# Microsoft Entra ID Pack

Use this guidance when working with Microsoft Entra ID, identity configuration, Conditional Access, app registrations, enterprise applications, devices, roles, authentication, or authorization flows.

If tenant type or environment (commercial, GCC, GCC High, DoD, B2C) is unspecified and it affects the answer, ask before proceeding or state the assumed environment explicitly.

## Core approach

Treat identity as infrastructure.

Identity changes are security-sensitive by default. If the user explicitly requests a change that weakens these controls, do not silently comply. State the risk, propose a least-privilege alternative, and only proceed if the user confirms after acknowledging the risk.

Do not weaken authentication, authorization, device trust, Conditional Access, consent, app assignment, or privileged role controls to make implementation easier.

Prefer explicit, least-privilege, auditable changes.

If the user explicitly requests a change that weakens these controls, do not silently comply. State the risk, propose a least-privilege alternative, and only proceed if the user confirms after acknowledging the risk.

## Identity boundaries

Always distinguish:

- tenant boundary
- user vs workload identity
- delegated vs application permissions
- app registration vs enterprise application
- client app vs resource API
- token issuer
- token audience
- token scopes
- app roles
- directory roles
- Azure RBAC roles
- control-plane vs data-plane access

Do not assume first-party, internal, or familiar applications are automatically safe.

## App registrations and enterprise applications

When creating or modifying apps, consider:

Must verify:

- sign-in audience
- redirect URIs
- credential type
- owner assignment
- app role assignment requirement
- user assignment requirement
- required resource access
- exposed APIs
- consent model

Verify if relevant:

- public client settings
- implicit grant settings
- access token issuance
- ID token issuance
- certificate vs client secret credential
- credential expiry
- known client applications
- verified publisher
- publisher domain
- service principal owners

Treat the listed permissions as non-exhaustive examples. Apply the same caution to any permission granting tenant-wide read/write, credential management, role management, or mail/file access regardless of whether it appears in the list.

Avoid application permissions ending in `.All` or granting tenant-wide read/write; prefer resource-scoped or RSC permissions.

Avoid long-lived client secrets.

Prefer workload identity federation for Azure-hosted workloads and federated CI/CD; prefer certificates over client secrets in all other cases. Only use client secrets when neither is supported by the platform.

## Permissions and consent

Use least privilege.

Before adding permissions, identify:

- API/resource
- delegated or application permission
- exact scope or app role
- reason
- admin consent requirement
- data exposed
- blast radius
- safer alternative

Be especially cautious with:

- Directory.ReadWrite.All
- Application.ReadWrite.All
- AppRoleAssignment.ReadWrite.All
- RoleManagement.ReadWrite.Directory
- User.ReadWrite.All
- Group.ReadWrite.All
- Mail.ReadWrite
- Files.ReadWrite.All
- Sites.FullControl.All
- offline_access

Do not request `offline_access` unless refresh tokens are genuinely required.

## Conditional Access

Treat Conditional Access as a control system with edge cases.

When changing CA policies, consider:

Must verify:

- included users and groups
- excluded users and groups
- break-glass accounts
- included cloud apps
- grant controls
- session controls
- authentication strengths
- report-only vs enforced state

Verify if relevant:

- app dependencies
- device platform conditions
- location conditions
- client app conditions
- service principal exclusions
- policy ordering and interaction
- registration flows

Avoid targeting a single app where the real resource dependency is broader.

Prefer Office 365 app suite, Microsoft Admin Portals, or Windows Azure Service Management API bundle when app interdependencies matter.

Do not assume every token flow evaluates every CA condition equally.

## MFA and authentication methods

Be careful with:

- MFA registration
- authentication method registration campaigns
- authentication strengths
- FIDO2/passkey policies
- Temporary Access Pass
- passwordless methods
- device-bound vs syncable credentials
- phishing-resistant requirements

Do not treat syncable credentials as equivalent to attested device-bound credentials unless the policy explicitly accepts that assurance level.

## Devices and device trust

Do not assume device properties are trustworthy if they are client-controlled or mutable.

Consider:

- device registration
- join type
- compliance state
- hybrid join
- device ownership
- MDM enrollment
- Intune-managed attributes
- extension attributes
- hardware-backed identifiers
- attestation
- stale devices
- fake or spoofed registrations

Be clear about whether enforcement uses device state, device claims, compliance, or app/session context.

## Privileged access

For privileged roles and operations:

- prefer PIM
- require strong authentication
- require justification
- require approval for Global Administrator, Privileged Role Administrator, Privileged Authentication Administrator, and any role with directory-wide write scope
- limit duration
- audit activation
- avoid permanent assignment
- separate duties

Be cautious with roles that can modify identity controls, app permissions, credentials, Conditional Access, or role assignments.

## Logs and detection

Use relevant Entra logs:

- sign-in logs
- non-interactive sign-in logs
- service principal sign-in logs
- managed identity sign-in logs
- audit logs
- provisioning logs
- risk events where available

Do not assume the same activity appears in every log stream.

Be careful with first-party fan-out, service-to-service calls, and apparent user impersonation.

Treat the listed permissions as non-exhaustive examples. Apply the same caution to any permission granting tenant-wide read/write, credential management, role management, or mail/file access regardless of whether it appears in the list.

## Break-glass

Do not remove or weaken break-glass protections.

If a proposed change would include break-glass accounts in a restrictive CA policy, remove their exclusions, or alter their credentials, refuse and explain the risk before suggesting alternatives.

Break-glass accounts should generally be:

- cloud-only
- excluded from CA lockout scenarios
- strongly protected
- monitored
- rarely used
- tested
- documented

## Final response

When completing Entra work, include:

Structure the final response with these exact headings:

- Identity Objects Affected
- Permissions Changed
- CA/Auth Behavior Changed
- Tenant-wide Impact
- Audit/Logging
- Rollback
- Security Assumptions

- identity objects affected
- permissions changed
- CA or auth behaviour changed
- tenant-wide impact
- audit/logging considerations
- rollback path
- security assumptions

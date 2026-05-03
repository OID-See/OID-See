<!-- version: 1.0.0 -->
# Microsoft Entra ID Pack

Use this guidance when working with Microsoft Entra ID, identity configuration, Conditional Access, app registrations, enterprise applications, devices, roles, authentication, or authorization flows.

## Core approach

Treat identity as infrastructure.

Identity changes are security-sensitive by default.

Do not weaken authentication, authorization, device trust, Conditional Access, consent, app assignment, or privileged role controls to make implementation easier.

Prefer explicit, least-privilege, auditable changes.

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

- sign-in audience
- redirect URIs
- public client settings
- implicit grant settings
- access token issuance
- ID token issuance
- certificate vs client secret credential
- credential expiry
- owner assignment
- app role assignment requirement
- user assignment requirement
- required resource access
- exposed APIs
- known client applications
- verified publisher
- publisher domain
- service principal owners
- consent model

Avoid broad app permissions.

Avoid long-lived client secrets.

Prefer certificates or workload identity federation where practical.

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

- included users and groups
- excluded users and groups
- break-glass accounts
- included cloud apps
- app dependencies
- grant controls
- session controls
- authentication strengths
- device platform conditions
- location conditions
- client app conditions
- service principal exclusions
- report-only vs enforced state
- policy ordering and interaction
- registration flows

Avoid targeting a single app where the real resource dependency is broader.

Prefer Office 365 or appropriate app bundles when app interdependencies matter.

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
- use approval where appropriate
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

## Break-glass

Do not remove or weaken break-glass protections.

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

- identity objects affected
- permissions changed
- CA or auth behaviour changed
- tenant-wide impact
- audit/logging considerations
- rollback path
- security assumptions

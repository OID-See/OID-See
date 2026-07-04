<!-- version: 1.0.1 -->
# Microsoft Graph Pack

Use this guidance when working with Microsoft Graph APIs, SDKs, PowerShell, automation, app permissions, queries, or Graph-based integrations.

## Core approach

Treat Microsoft Graph as an identity and data control plane.

Use least privilege.

Be explicit about delegated vs application permissions.

Do not request broad permissions just because they are convenient.

Prefer v1.0 endpoints unless beta functionality is explicitly required.

If the target tenant is in a sovereign cloud (for example, US Gov or China), use the corresponding Graph endpoint and matching authority, and ask the user which cloud if unclear.

## Permissions

Before using or adding a Graph permission, identify the minimal required set:

- permission name
- delegated or application
- why it is required
- whether admin consent is needed
- whether a narrower permission exists

If the permission is on the caution list or is write/tenant-wide, also identify:

- resource/data exposed
- whether read-only permission is sufficient
- whether permission is tenant-wide
- how it will be audited and reviewed

Be cautious with:

- Directory.ReadWrite.All
- Application.ReadWrite.All
- AppRoleAssignment.ReadWrite.All
- RoleManagement.ReadWrite.Directory
- Group.ReadWrite.All
- User.ReadWrite.All
- Device.ReadWrite.All
- Policy.ReadWrite.ConditionalAccess
- Sites.FullControl.All
- Files.ReadWrite.All
- Mail.ReadWrite
- Mail.Send
- offline_access

Do not add `offline_access` unless refresh tokens are actually required.

If the user requests a cautioned permission, propose the narrowest alternative that satisfies the use case, explain the risk, and proceed only after explicit acknowledgement.

## Authentication

Prefer secure auth patterns:

- managed identity
- workload identity federation
- certificate credentials
- device code only for interactive tooling where appropriate
- delegated auth only when user context is required

Avoid:

- client secrets where certificate or federation is practical
- ROPC
- hard-coded tokens
- long-lived refresh tokens
- broad multi-tenant consent without justification

Always validate:

- tenant
- authority
- scopes
- audience
- issuer
- delegated vs application context

## SDK usage

Use the repository’s existing SDK style where present.

If no existing style is present, default to the official Microsoft Graph SDK for the repository's primary language.

Do not mix raw REST, SDK, Graph PowerShell, and CLI styles unnecessarily.

When using SDKs:

- handle pagination
- handle throttling
- request only needed fields
- avoid dumping raw objects into logs
- be explicit about beta vs v1.0 clients
- avoid over-broad queries

If using a repository primary language SDK, prefer Microsoft.Graph for .NET or @microsoft/microsoft-graph-client for JavaScript and TypeScript.

## Raw REST usage

When using raw Graph REST calls:

- use correct HTTP methods
- set headers explicitly
- handle pagination via `@odata.nextLink`
- handle throttling and retries
- parse errors safely
- avoid logging Authorization headers
- avoid logging full response bodies containing sensitive data

On 429 or 503 responses, honor the Retry-After header; if absent, use exponential backoff starting at 1 second with jitter, with a maximum of 5 retries. Surface persistent throttling to the caller.

Use `$select` to reduce returned data where practical.

Use `$filter` carefully and validate assumptions.

When using `$filter` with `not`, `endsWith`, `$search`, or `$count` on directory objects, include the `ConsistencyLevel: eventual` header and `$count=true` as required by Graph advanced queries.

When using `$batch`, iterate each sub-response, report per-request status, and do not treat HTTP 200 on the batch envelope as overall success.

## Pagination and scale

Do not assume one page is all data.

Handle:

- `@odata.nextLink`
- server-side paging
- throttling
- partial failures
- eventual consistency
- large tenants
- retry-after headers

Be careful with scripts that enumerate tenant-wide objects.

Include dry-run or scoping options for high-impact operations.

## Beta endpoints

Use beta only when needed.

When using beta:

- state why beta is required
- isolate beta-specific logic
- avoid relying on undocumented behaviour
- document instability risk
- prefer a fallback or clear failure mode

## Writes and destructive actions

For write operations:

- require explicit user confirmation before any write, update, or delete operation against directory, security, or policy objects listed under Security-sensitive objects
- support dry-run mode
- log object IDs and intended changes without secrets
- avoid tenant-wide changes by default
- validate target objects before modification
- for reversible operations such as property updates or role assignments, capture prior state before modification and provide a rollback script
- for irreversible operations such as deletes, state that rollback is not possible and require confirmation

Be cautious with:

- deleting objects
- changing credentials
- granting app roles
- changing CA policies
- changing authentication methods
- modifying role assignments
- modifying app registrations
- modifying service principals

## Security-sensitive objects

Be extra careful with:

- app registrations
- service principals
- app role assignments
- OAuth2 permission grants
- Conditional Access policies
- authentication methods policies
- device objects
- privileged role assignments
- directory roles
- groups used for access control
- administrative units

## Logging

Never log:

- access tokens
- refresh tokens
- client secrets
- private keys
- authorization headers
- full credential objects
- secretText values
- raw sensitive payloads

Redact sensitive values.

## Final response

When completing Microsoft Graph work, include:

- endpoints used
- permissions required
- delegated/application context
- beta/v1.0 usage
- pagination/throttling handling
- write operations performed or proposed
- tests or dry-run results

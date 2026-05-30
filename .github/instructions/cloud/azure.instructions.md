<!-- version: 1.0.1 -->
# Azure Cloud Pack

Use this guidance when working with Microsoft Azure resources, infrastructure, SDKs, scripts, IaC, CI/CD, or operational automation.

If the target environment is a sovereign cloud (Azure Government, China), verify service availability and use the correct endpoint suffixes before applying any guidance below.

## Precedence and override rule

If the user requests an action that violates these guidelines, explain the specific risk, propose a least-privilege alternative, and only proceed with the original request after explicit user confirmation.

If the target environment (dev, staging, production) is unclear, ask the user before applying changes that affect shared, staging, or production resources.

## Core approach

Treat Azure changes as security-sensitive by default.

Prefer small, explicit, reviewable changes.

Do not broaden permissions, scopes, network exposure, or public access to make implementation easier.

Respect existing project patterns for:

- Azure SDK usage
- Azure CLI usage
- Terraform, Bicep, ARM, or Pulumi
- naming conventions
- tagging
- environments
- deployment pipelines
- secrets and identity

Do not introduce a new IaC tool or deployment pattern unless explicitly requested.

## Identity first

Prefer identity-based access over static secrets.

Prefer:

- managed identities
- workload identity federation
- service principals with least privilege
- certificate-based authentication when the workload already manages certificates or the platform requires mutual TLS
- Key Vault-backed secret retrieval where secrets are unavoidable

Avoid:

- client secrets in code
- connection strings in repo files
- long-lived credentials
- broad Owner or Contributor assignments
- tenant-wide permissions where resource-scoped permissions are enough

Always distinguish:

- user-assigned vs system-assigned managed identity
- control-plane vs data-plane permissions
- Azure RBAC vs application-level permissions
- delegated vs application identity flows

## Permissions and RBAC

Use least privilege.

Before adding a role assignment, identify:

- principal
- scope
- role
- reason
- whether a narrower built-in or custom role is suitable
- whether the assignment is temporary or permanent

Avoid high-blast-radius roles such as:

- Owner
- Contributor
- User Access Administrator
- Key Vault Administrator
- Storage Account Contributor
- Application Administrator
- Global Administrator

Do not grant wildcard access when a narrower operation is sufficient.

For cross-tenant access, prefer Azure Lighthouse delegations or multi-tenant app registrations with least-privilege scopes; do not add guest users with elevated roles.

## Resource scoping

Prefer the narrowest workable scope:

1. resource
2. resource group
3. subscription
4. management group
5. tenant

Do not default to subscription or tenant scope.

## Secrets

Never hard-code secrets, keys, SAS tokens, connection strings, certificates, or private keys.

Do not log secrets.

Redact:

- Authorization headers
- SAS URLs
- access tokens
- refresh tokens
- client secrets
- storage keys
- connection strings
- private keys
- certificate material

Prefer Key Vault or platform-native secret stores.

When using Key Vault, consider:

- RBAC vs access policies
- data-plane permissions
- purge protection
- soft delete
- private endpoints
- diagnostic logging
- secret rotation
- access review

## Network exposure

Avoid public exposure unless required.

Prefer:

- private endpoints when the resource supports them and the workload runs inside a VNet
- network ACLs
- managed identity
- service endpoints when private endpoints are not available and the workload runs inside a VNet
- explicit ingress and egress rules
- application gateway, WAF, or front door patterns when the resource is internet-facing

Be careful with:

- `0.0.0.0/0`
- `AllowAll`
- public storage containers
- public Key Vault access
- public database access
- broad NSG rules
- permissive CORS rules
- public App Service SCM exposure

## Storage

For storage accounts:

- disable shared key access on new storage accounts; for existing accounts, only disable it after confirming no callers depend on it
- prefer Entra ID authorization
- avoid public blob access
- use private endpoints when the workload runs inside a VNet
- be cautious with SAS generation and logging
- use SAS tokens with a maximum lifetime of 1 hour unless a longer lifetime is explicitly justified
- avoid account-level SAS unless necessary
- enable diagnostic logging where operationally required

## Azure Functions, Logic Apps, and App Services

Be careful with:

- managed identity permissions
- function keys
- callback URLs
- workflow run history
- secure inputs and outputs
- app settings
- deployment slots
- SCM/Kudu exposure
- public ingress
- CORS
- outbound network assumptions

For Logic Apps, treat run history and trigger/callback URLs as sensitive.

Use Secure Inputs and Secure Outputs where sensitive data may pass through workflow actions.

## Azure Resource Manager and control plane

Do not assume Reader is harmless.

Control-plane read access may expose sensitive metadata, generated URLs, workflow history, deployment outputs, or operational details.

When working with ARM APIs:

- distinguish metadata from secret material
- avoid logging response bodies blindly
- inspect response examples and live responses for embedded SAS URLs, keys, or sensitive references
- be careful with batch APIs and hidden sub-requests

## Infrastructure as Code

For IaC changes:

- keep diffs focused
- avoid unrelated formatting churn
- preserve remote state configuration
- avoid hard-coded environment-specific values
- use variables and locals consistently
- include least-privilege role definitions
- avoid broad wildcards
- document assumptions

For Terraform:

- do not modify state directly unless explicitly requested
- a plan is destructive if it includes any delete, replace, or force-new action on stateful resources (databases, storage, key vaults, etc.); do not run destructive plans automatically
- if terraform plan or bicep what-if shows unexpected drift, surface it to the user and do not silently reconcile
- show expected blast radius
- prefer plan review before apply
- protect sensitive outputs

For Bicep/ARM:

- avoid leaking secrets in outputs
- use secure parameters for secrets
- avoid deployment outputs that expose keys or connection strings

## Logging and monitoring

Prefer secure, useful diagnostics.

Avoid logging sensitive payloads.

Consider:

- Azure Activity Logs
- resource diagnostic settings
- Log Analytics
- Defender for Cloud
- workload-specific audit logs
- identity sign-in and audit logs

When adding logging, include security-relevant events without dumping raw secrets or payloads.

## CI/CD

Prefer workload identity federation over stored cloud credentials.

Do not add cloud credentials to repository secrets unless unavoidable.

Scope federated credentials narrowly by:

- repository
- branch
- environment
- workflow
- audience
- subject

Avoid deployment pipelines with broad tenant or subscription rights.

## Final response

When completing Azure work, include:

- resources affected
- scopes affected
- identities and permissions changed
- secrets created or avoided
- network exposure changed
- estimated cost impact or SKU changes
- tests or validation performed
- deployment or rollback notes

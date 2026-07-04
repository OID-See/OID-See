<!-- version: 1.0.1 -->
# Google Cloud Platform Pack

Use this guidance when working with Google Cloud Platform resources, IAM, service accounts, APIs, infrastructure, CI/CD, or application code.

## Core approach

Treat GCP changes as security-sensitive by default.

Prefer least privilege, short-lived credentials, and explicit resource scoping.

Respect existing project conventions for:

- Terraform or other IaC
- Google Cloud SDK usage
- service account patterns
- workload identity
- environment separation
- logging and monitoring
- deployment pipelines

Do not introduce new cloud architecture casually.

## Identity and IAM

Prefer identity-based, short-lived access.

Prefer:

- Workload Identity Federation
- service account impersonation
- managed workload identity patterns
- narrow predefined roles
- custom roles where justified
- resource-level IAM when a narrower resource-scoped role can satisfy the task

Avoid:

- long-lived service account keys
- broad primitive roles
- Owner
- Editor
- Viewer when a narrower predefined or custom role satisfies the task; use Viewer only for read-only inspection tasks
- domain-wide delegation unless explicitly required
- tenant/project-wide permissions for narrow tasks

Always identify:

- principal
- resource
- role
- reason
- scope
- whether access is temporary
- safer alternatives

## Service accounts

Treat service accounts as high-value identities.

When creating or modifying service accounts, consider:

- purpose
- owners
- allowed impersonators
- roles granted to the service account
- roles allowing use of the service account
- key creation restrictions
- audit logging
- workload identity federation
- rotation or decommissioning

Avoid service account keys.

If keys are unavoidable:

- store securely
- avoid committing them
- avoid printing them
- rotate them
- document why federation or impersonation is not suitable

## IAM role safety

Be cautious with:

- roles/owner
- roles/editor
- roles/iam.serviceAccountTokenCreator
- roles/iam.serviceAccountUser
- roles/iam.serviceAccountKeyAdmin
- roles/resourcemanager.projectIamAdmin
- roles/iam.securityAdmin
- roles/storage.admin
- roles/cloudfunctions.admin
- roles/run.admin
- roles/secretmanager.admin

Avoid granting administrative roles where task-specific roles are sufficient.

## Secrets

Never hard-code secrets, tokens, private keys, API keys, or service account JSON.

Prefer:

- Secret Manager
- Workload Identity Federation
- service account impersonation
- runtime environment secret injection when the workload can consume secrets at runtime without committing them

Do not log:

- service account JSON
- access tokens
- refresh tokens
- private keys
- API keys
- Authorization headers
- signed URLs

## Storage

For Cloud Storage:

- avoid public buckets unless the bucket must be publicly readable by design
- prefer uniform bucket-level access
- use signed URLs with a maximum lifetime of 1 hour unless a longer lifetime is explicitly justified
- scope signed URLs narrowly
- avoid logging signed URLs
- validate object names
- avoid path traversal or key injection
- be careful with overwrite semantics
- enable audit logging for buckets that store production or sensitive data

## Cloud Run, Functions, and App Engine

For serverless workloads:

- validate all inputs
- configure authentication deliberately
- avoid public unauthenticated invocation unless required
- use least-privilege runtime service accounts
- avoid default compute service accounts where possible
- handle environment variables safely
- do not log secrets
- set timeouts and resource limits deliberately
- validate outbound network assumptions

Do not assume internal workloads are safe because they are managed.

## Networking

Avoid public exposure unless the service must be internet-facing.

Be careful with:

- firewall rules
- `0.0.0.0/0`
- public IPs
- load balancers
- Cloud NAT
- VPC connectors
- private service access
- ingress settings
- egress settings
- serverless public endpoints

Prefer private connectivity when the service supports it and the workload runs inside a VPC.

## APIs and SDKs

When using Google APIs:

- use least-privilege scopes
- handle pagination
- handle retries and quota errors
- avoid dumping raw responses into logs
- validate organization, folder, and project context as applicable
- distinguish user credentials from service account credentials
- avoid Application Default Credentials ambiguity in production scripts

Be explicit about which project is targeted.

## CI/CD

Prefer Workload Identity Federation for GitHub Actions or other external CI/CD systems.

Avoid storing service account JSON keys in CI secrets.

Scope federation narrowly by:

- repository
- branch
- environment
- workflow
- audience
- subject

Use service account impersonation with minimal roles.

## Infrastructure as Code

For Terraform or other IaC:

- keep changes focused
- avoid unrelated formatting churn
- do not modify state directly unless explicitly requested
- avoid sensitive outputs
- protect remote state
- use variables consistently
- do not embed secrets in IaC files
- review planned IAM and network changes carefully

A plan is destructive if it deletes or replaces stateful resources or triggers force-new changes on them. Do not run destructive applies automatically.

## Logging and monitoring

Use useful audit and operational logs without leaking sensitive data.

Consider:

- Cloud Audit Logs
- Data Access logs where appropriate
- Cloud Logging
- Security Command Center
- workload-specific logs
- IAM audit events

Do not log full request or response bodies when they may contain secrets or personal data.

## Final response

When completing GCP work, include:

- projects/resources affected
- identities and IAM changes
- secrets created or avoided
- network exposure changed
- APIs enabled or used
- estimated cost or quota impact
- tests or validation performed
- deployment and rollback notes

<!-- version: 1.0.0 -->
# Terraform Language Pack

Use this guidance when working with Terraform configurations.

## Core approach

Prefer clear, predictable, and auditable Terraform over clever abstractions.

Keep configurations readable and maintainable.

Follow existing project structure, module usage, naming, and variable patterns.

Do not introduce new module structures or patterns unless explicitly requested.

## Plan before apply

Always reason about the expected plan before applying changes.

Prefer showing or describing the plan before making changes.

Never assume a change is safe without understanding its impact.

Highlight:

- resources to be created
- resources to be modified
- resources to be destroyed
- potential blast radius

## State safety

Treat Terraform state as sensitive and critical.

Do not:

- manually edit state
- expose state contents
- log state data
- commit state files to source control

Respect remote state configuration.

## Dependencies and modules

Follow dependency discipline:

- prefer existing modules
- avoid introducing new modules for small functionality
- avoid overly generic modules that obscure intent
- pin provider versions
- avoid unbounded version constraints

When using modules, clearly understand:

- inputs
- outputs
- side effects
- permissions granted

## Variables and outputs

Use variables for configuration, not hard-coded values.

Avoid embedding secrets in variables or outputs.

Mark sensitive values appropriately.

Do not expose secrets in outputs.

## Secrets and credentials

Never hard-code secrets, keys, or credentials.

Use:

- environment variables
- secret stores (e.g. Key Vault, Secret Manager)
- identity-based authentication

Ensure Terraform does not log sensitive values.

## Providers

Pin provider versions explicitly.

Avoid using latest without constraints.

Be aware of breaking changes between provider versions.

## Security

Apply least privilege:

- narrow IAM roles
- minimal permissions
- scoped resource access

Avoid:

- wildcard permissions
- overly broad roles
- public exposure without need

Be careful with:

- network rules
- storage access
- identity bindings
- public endpoints

## Drift and lifecycle

Be aware of drift between state and real infrastructure.

Use lifecycle rules deliberately:

- prevent_destroy
- ignore_changes

Do not suppress drift without understanding why.

## Destructive changes

For destructive changes:

- require explicit approval
- highlight impact clearly
- suggest safer alternatives
- recommend backups or snapshots where relevant

## Formatting and validation

Run:

- terraform fmt
- terraform validate

Do not introduce formatting churn unrelated to the change.

## Testing and validation

Where possible:

- run terraform plan
- describe expected outcomes
- validate assumptions

Do not claim apply success unless actually executed.

## Final response

When completing Terraform work, include:

- resources affected
- expected plan summary
- destructive changes (if any)
- provider versions
- modules used or added
- secrets handling approach
- validation steps performed

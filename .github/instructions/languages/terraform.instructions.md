<!-- version: 1.0.1 -->
# Terraform Language Pack

Use this guidance when working with Terraform configurations.

## Core approach

Prefer clear, predictable, and auditable Terraform over clever abstractions.

Keep configurations readable and maintainable.

Follow existing project structure, module usage, naming, and variable patterns.

Do not introduce new module structures or patterns unless explicitly requested.

For new modules, mirror the existing package layout. For new standalone files, place them alongside the existing Terraform root or in the project's established module folders.

## Plan before apply

Always reason about the expected plan before applying changes.

Run `terraform plan` and present its output before any apply. If plan cannot be executed, explicitly state that and provide a written description of expected changes.

Never assume a change is safe without understanding its impact.

If `terraform validate` or `terraform fmt` is unavailable or fails, report the failure and do not proceed with apply.

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

Before any plan or apply, confirm the active workspace and target environment with the user. Never assume the default workspace is the intended one.

If a state lock error occurs, do not force-unlock automatically; report the lock ID and owner to the user and wait for guidance.

## Dependencies and modules

Follow dependency discipline:

- prefer existing modules
- do not create a new module unless it encapsulates 3 or more related resources reused in 2 or more places
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

For importing existing resources, write the resource block first, run `terraform import`, then run `terraform plan` to verify zero diff before any apply.

## Destructive changes

For destructive changes:

- before proceeding with destructive changes, ask the user to confirm with an explicit "yes, proceed" message and do not act until received
- highlight impact clearly
- suggest safer alternatives
- recommend backups or snapshots where relevant

## Formatting and validation

Run:

- terraform fmt
- terraform validate

If these commands fail or are unavailable, report the failure and do not proceed with apply.

Do not introduce formatting churn unrelated to the change.

## Testing and validation

Where possible:

- run `terraform plan` whenever a terraform binary is available in the environment; otherwise, state that plan was skipped and why
- describe expected outcomes
- validate assumptions

If plan output contains destroys not explicitly requested by the user, halt and surface each one before continuing.

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

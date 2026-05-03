<!-- version: 1.0.0 -->
# CI/CD Pack

Use this guidance when working with CI/CD pipelines, GitHub Actions, Azure DevOps, GitLab CI, build scripts, release workflows, deployment automation, or repository automation.

## Core approach

Treat CI/CD as a privileged automation plane.

Pipeline changes are security-sensitive by default.

Prefer small, reviewable, least-privilege changes.

Do not trade security for convenience.

Respect existing project conventions for:

- workflow structure
- environments
- branch protections
- approvals
- secrets
- deployment stages
- package publishing
- test gates
- artifact handling

## Trust boundaries

Always distinguish:

- pull request workflows
- push workflows
- scheduled workflows
- manual dispatch workflows
- forked PRs
- protected branches
- protected environments
- build-time vs deploy-time permissions
- repository secrets vs environment secrets
- OIDC/federated credentials vs stored credentials

Do not expose privileged secrets to untrusted code.

## GitHub Actions

For GitHub Actions:

- minimise `GITHUB_TOKEN` permissions
- set explicit `permissions`
- pin third-party actions to commit SHA where practical
- avoid untrusted pull request access to secrets
- be careful with `pull_request_target`
- avoid running untrusted code with privileged token context
- prefer OIDC to long-lived cloud credentials
- scope environment approvals
- avoid broad write permissions
- avoid leaking secrets in logs
- avoid shell injection through workflow inputs

Default to:

```yaml
permissions:
  contents: read
```

and grant additional permissions explicitly.

## Azure DevOps

For Azure DevOps:

- avoid storing service account JSON, client secrets, or certificates in plain variables
- understand that secret variables can still be exfiltrated by pipeline code with access
- prefer Key Vault-backed variable groups where appropriate
- secure service connections
- restrict pipeline permissions
- avoid broad project collection permissions
- protect environments
- review approvals and checks
- avoid granting pipelines unnecessary access to all repositories

Do not treat "secret variable" as a complete security boundary.

## OIDC and workload identity federation

Prefer OIDC/federated credentials over stored cloud secrets.

Scope federation narrowly by:

- repository/project
- branch
- environment
- workflow
- audience
- subject
- service account or app registration

Do not create broad federation rules that allow any branch, repo, or workflow to assume production identity.

## Secrets

Never print secrets.

Never echo tokens.

Never dump environment variables blindly.

Be careful with:

- build logs
- debug logs
- shell tracing
- artifact uploads
- test reports
- cache contents
- dependency manager config
- deployment outputs

Redact sensitive values.

## Dependencies and supply chain

Follow repository dependency discipline.

For CI dependencies:

- pin versions
- avoid curl-pipe-shell patterns
- verify downloads where practical
- prefer official package sources
- avoid untrusted setup scripts
- avoid implicit latest tags
- cache carefully
- avoid poisoning caches from untrusted branches

## Artifacts

Treat artifacts as data boundaries.

Be careful with:

- build artifacts containing secrets
- test reports containing tokens
- logs uploaded as artifacts
- coverage reports with source disclosure
- signing keys
- deployment packages
- SBOMs containing sensitive internal paths

Set retention deliberately.

## Deployment safety

For deployments:

- use environments
- require approvals for production where appropriate
- separate build and deploy permissions
- promote immutable artifacts rather than rebuilding for production
- avoid deploying from untrusted branches
- include rollback strategy
- avoid automatic production deploys from arbitrary workflow triggers

## Commands and shell safety

Avoid shell injection.

Validate workflow inputs.

Quote variables carefully.

Avoid interpolating untrusted values into shell commands.

Prefer action inputs or structured commands where possible.

## Testing gates

Do not bypass tests to make deployment succeed.

Prefer:

- lint
- type checks
- unit tests
- integration tests where available
- security checks where useful
- dependency vulnerability checks
- IaC validation
- policy checks

If a test is flaky or failing, explain rather than silently disabling it.

## Final response

When completing CI/CD work, include:

- pipelines/workflows changed
- triggers affected
- permissions changed
- secrets or federated identities affected
- deployment impact
- tests/checks changed
- rollback considerations

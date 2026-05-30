<!-- version: 1.0.1 -->
# CI/CD Pack

Use this guidance when working with CI/CD pipelines, GitHub Actions, Azure DevOps, GitLab CI, build scripts, release workflows, deployment automation, or repository automation.

## Core approach

Treat CI/CD as a privileged automation plane.

Pipeline changes are security-sensitive by default.

Prefer small, reviewable, least-privilege changes.

Do not trade security for convenience.

If existing project conventions conflict with the security guidance in this pack, follow the security guidance for new code and note the inconsistency with existing conventions in the final response.

If a requested change requires elevated permissions or weakened controls, implement the least-privileged version and explicitly call out the trade-off and any safer alternatives in the final response.

If you discover pre-existing security issues outside the scope of the requested change, flag them in the final response rather than silently fixing them, unless the user asks for a broader cleanup.

If the user requests an action that violates these guidelines, refuse the unsafe approach, explain the risk, and propose a compliant alternative.

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

## GitLab CI

For GitLab CI:

- use protected branches and tags for sensitive pipelines
- mask and protect CI/CD variables that contain secrets
- prefer `rules:` over `only/except`
- keep `CI_JOB_TOKEN` scope as narrow as possible
- use runner tags deliberately
- prefer OIDC `id_tokens` for cloud federation where available
- do not expose protected variables to untrusted merge requests

## GitHub Actions

For GitHub Actions:

- minimise `GITHUB_TOKEN` permissions
- set explicit `permissions`
- pin all third-party actions to a full commit SHA; actions published by GitHub in the `actions/*` org may be pinned to a major version tag
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
- store any secret, certificate, or credential in a Key Vault-backed variable group rather than as a pipeline variable
- secure service connections
- restrict pipeline permissions
- avoid broad project collection permissions
- protect environments
- review approvals and checks
- avoid granting pipelines unnecessary access to all repositories

Do not treat “secret variable” as a complete security boundary.

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
- verify downloaded binaries with a published checksum or signature when one is available; otherwise note the absence in the PR description
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
- require at least one manual approval for any deployment to a production environment
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

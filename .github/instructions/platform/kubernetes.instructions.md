<!-- version: 1.0.0 -->
# Kubernetes Pack

Use this guidance when working with Kubernetes manifests, Helm charts, Kustomize overlays, operators, controllers, admission policies, or cluster automation.

## Core approach

Treat Kubernetes changes as security-sensitive by default.

Prefer small, explicit, reviewable changes.

Follow existing project conventions for:

- manifests
- Helm charts
- Kustomize overlays
- namespaces
- labels and annotations
- resource naming
- deployment environments
- ingress patterns
- secret management
- policy enforcement

Do not introduce a new deployment tool, chart structure, or operator pattern unless explicitly requested.

## Plan before apply

Before applying Kubernetes changes, identify:

- resources created
- resources modified
- resources deleted
- namespaces affected
- workloads restarted
- network exposure changed
- RBAC changed
- storage changed
- secrets affected

Do not run destructive `kubectl` commands automatically.

Do not delete resources without explicit approval.

## Least privilege and RBAC

Use least privilege.

Be careful with:

- ClusterRole
- ClusterRoleBinding
- wildcard verbs
- wildcard resources
- service account token access
- impersonation permissions
- privileged controllers
- admission webhooks
- namespace-wide admin rights

Prefer Role and RoleBinding scoped to a namespace where possible.

Avoid cluster-wide permissions unless required and justified.

## Service accounts

Use dedicated service accounts for workloads.

Do not use default service accounts for privileged workloads.

Avoid automounting service account tokens unless needed.

Set:

```yaml
automountServiceAccountToken: false
```

where service account tokens are not required.

## Pod security

Avoid privileged containers unless explicitly required.

Be cautious with:

- privileged: true
- hostNetwork
- hostPID
- hostIPC
- hostPath volumes
- added Linux capabilities
- running as root
- writable root filesystems
- unsafe sysctls
- Docker socket mounts

Prefer:

- runAsNonRoot
- readOnlyRootFilesystem
- allowPrivilegeEscalation: false
- dropping Linux capabilities
- seccomp profiles
- AppArmor where available
- non-root users
- explicit securityContext settings

## Images

Use trusted images.

Avoid `latest` tags.

Prefer pinned, immutable image tags or digests where practical.

Be aware of image provenance and vulnerability posture.

Do not introduce images with unresolved Critical or High CVEs unless explicitly approved with mitigation.

## Secrets and config

Never commit Kubernetes Secrets containing real credentials.

Avoid base64-encoded secrets as if they were encrypted.

Prefer external secret stores where available.

Be careful with:

- ConfigMaps containing sensitive data
- environment variables containing secrets
- mounted secret files
- logs exposing secrets
- Helm values files containing secrets
- generated manifests that include secret material

## Networking

Be explicit about network exposure.

Be careful with:

- LoadBalancer services
- NodePort services
- Ingress resources
- Gateway API routes
- permissive NetworkPolicies
- wildcard hosts
- permissive CORS
- internal vs external load balancer annotations

Prefer deny-by-default NetworkPolicy where supported.

Do not expose admin endpoints publicly.

## Resource management

Set resource requests and limits where appropriate.

Consider:

- CPU requests
- memory requests
- memory limits
- autoscaling behaviour
- disruption budgets
- readiness probes
- liveness probes
- startup probes

Avoid causing noisy restarts or resource starvation.

## Storage

Be careful with:

- PersistentVolumeClaims
- reclaim policies
- storage classes
- hostPath
- backup assumptions
- data deletion
- volume expansion
- access modes

Do not delete PVCs or PVs without explicit approval and backup consideration.

## Helm

When working with Helm:

- inspect rendered manifests where possible
- avoid secrets in values files
- avoid broad chart defaults
- pin chart versions
- avoid hidden RBAC or network exposure
- document values changed
- be careful with upgrade hooks and CRDs

Do not assume chart defaults are secure.

## Kustomize

When working with Kustomize:

- keep overlays focused
- avoid accidental cross-environment changes
- preserve base/overlay separation
- do not duplicate large resource blocks unnecessarily
- check generated manifests for security-sensitive changes

## Admission and policy

When working with policy engines such as Kyverno, OPA Gatekeeper, or admission webhooks:

- fail closed where appropriate
- avoid broad exemptions
- document exceptions
- include tests or examples where possible
- avoid policy rules that are too brittle or too vague

## Observability

Use logging and metrics without leaking secrets.

Consider:

- events
- pod logs
- audit logs
- workload metrics
- ingress logs
- policy violations

Do not dump full secret-bearing environment or config.

## Final response

When completing Kubernetes work, include:

- namespaces affected
- resources changed
- RBAC changes
- network exposure changes
- image changes
- secret handling
- apply/validation steps
- rollback considerations

<!-- version: 1.0.1 -->
# Kubernetes Pack

Use this guidance when working with Kubernetes manifests, Helm charts, Kustomize overlays, operators, controllers, admission policies, or cluster automation.

## Core approach

Treat Kubernetes changes as security-sensitive by default.

Prefer small, explicit, reviewable changes.

Precedence: Security > Least privilege > Project conventions > Style.

If existing project conventions violate these guidelines, surface the violation but do not fix unrelated issues unless the user requests a broader cleanup. Scope changes to the requested task.

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

Before running any `kubectl` command, confirm the active context and cluster. Never assume the current kubeconfig context is the intended target.

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

When a user explicitly requests a flagged pattern such as privileged, wildcard RBAC, or hostNetwork, state the risk, ask for confirmation, and document the justification in a comment in the manifest before proceeding.

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

StatefulSets: identify ordering implications, PVC retention policy, and headless service dependencies before modifying. Avoid changes that trigger full re-creation of stateful pods.

## Images

Use images from Docker Official Images, Verified Publishers, distroless/chainguard, or the project's internal registry. Flag any other source.

Avoid `latest` tags.

Pin images to a specific semver tag at minimum; prefer image digests (sha256) for production workloads.

Be aware of image provenance and vulnerability posture.

Do not introduce images with unresolved Critical or High CVEs unless CVE scan results are available or provided by the user and the user confirms acceptance with a documented mitigation before proceeding. Recommend trivy or grype if no scan is available.

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

If a user requests a secret in a manifest, refuse the unsafe approach, explain why, and propose runtime secret injection or an external secret store instead.

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

Always set CPU and memory requests, and memory limits. Do not set CPU limits unless the workload requires deterministic throttling.

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

For importing or adopting existing resources, write the resource definition first, then import, then run a plan or diff to verify zero unexpected change before any apply.

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

CRDs: treat CRD installation and upgrade as cluster-wide changes requiring explicit approval. Never delete CRDs without confirming no custom resources depend on them. Preserve existing CRD versions during upgrades.

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

If an apply or upgrade fails partway, report which resources were applied versus failed, and propose rollback or remediation steps before re-running.

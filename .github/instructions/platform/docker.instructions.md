<!-- version: 1.0.1 -->
# Docker Pack

Use this guidance when working with Dockerfiles, Docker Compose, container images, build pipelines, runtime configuration, or containerised development environments.

## Core approach

Treat containers as security boundaries with limits, not magic isolation.

Prefer simple, reproducible, minimal container builds.

If existing project conventions violate these guidelines (e.g. `:latest` tags, root user, embedded secrets), surface the violation but do not fix unrelated issues unless the user requests it. Scope changes to the task.

Follow existing project conventions for:

- Dockerfile structure
- Compose services
- image naming
- ports
- volumes
- environment variables
- build args
- health checks
- networks
- runtime users

Do not introduce unnecessary services or images.

## Base images

Use base images from: Docker Official Images, Verified Publishers, distroless/chainguard, or the project's internal registry. Flag any other source.

Avoid `latest` tags.

Pin versions unless the package is a transitive OS dependency with no stable tag or the project explicitly uses rolling versions. When skipping, state the reason in the final response.

Use minimal images (alpine, distroless) for production runtime stages; use full images for build stages or when diagnostics tools are required.

Do not introduce images with unresolved Critical or High CVEs unless the user states acceptance and a documented mitigation is provided.

If CVEs are present, surface them and ask the user to confirm acceptance with a documented mitigation before proceeding.

For multi-architecture needs, use buildx with explicit `--platform` flags. Match the target runtime architecture; do not assume host architecture.

## Build safety

Keep builds deterministic.

Prefer:

- explicit package versions where practical
- minimal layers
- clean package caches
- reproducible dependency installs
- non-root runtime users
- multi-stage builds for compiled artifacts
- `.dockerignore` to reduce build context

Where available, run hadolint for Dockerfile linting and recommend trivy or grype for image scanning.

Avoid:

- copying the whole repo unnecessarily
- embedding secrets in images
- using build args for secrets
- printing secrets during build
- curl-pipe-shell without verification
- installing unnecessary packages

If the user requests embedding a secret via `ARG`, `ENV`, or `COPY`, refuse and propose runtime secret injection (Docker secrets, BuildKit `--mount=type=secret`, or a platform secret store) instead.

## Secrets

Never bake secrets into images.

Do not store secrets in:

- Dockerfiles
- image layers
- Compose files
- build args
- committed `.env` files
- logs
- labels

Use runtime secret injection or platform-native secret stores where appropriate.

Be careful: build args and environment variables may leak through image metadata, logs, or history.

## Runtime user and privileges

Prefer non-root containers.

Be cautious with:

- `privileged: true`
- `--cap-add`
- host networking
- host PID namespace
- host IPC namespace
- Docker socket mounts
- hostPath-style bind mounts
- writable root filesystems
- device mounts

Drop capabilities where possible.

Use read-only filesystems where practical.

Avoid mounting `/var/run/docker.sock` unless explicitly required and justified.

If the user requests privileged mode, a docker.sock mount, or host networking without justification, ask for the use case before applying. If applied, document the justification in the final response.

## Networking

Expose only required ports.

Avoid binding services to all interfaces unless required.

Be explicit about internal vs external ports.

Use Compose networks deliberately.

Do not expose admin/debug services publicly.

## Volumes and filesystem

Be deliberate with volumes and bind mounts.

Validate host paths.

Avoid mounting sensitive host directories.

Be careful with:

- overwriting application directories
- writing as root to host-mounted volumes
- leaking host files into containers
- persistence assumptions
- file permission mismatches

## Docker Compose

For Compose files:

- keep services focused
- avoid unnecessary privilege
- avoid plaintext secrets
- use health checks when a service has a meaningful runtime or readiness check
- avoid broad host mounts unless the service requires host file access
- use named volumes when data should persist beyond container recreation
- isolate networks when services should not communicate on the default network
- document exposed ports

Do not add services that increase attack surface without clear need.

## Package managers

Follow dependency discipline.

For apt/apk/yum:

- install only required packages
- clean package caches
- avoid unnecessary recommends unless a required package depends on them
- pin or constrain versions unless the package manager requires a rolling channel or the project explicitly uses rolling versions; when skipping, state the reason in the final response
- avoid untrusted repositories

Use `--no-install-recommends` or the package-manager equivalent when it does not break required functionality.

For npm/pip/etc:

- use lockfiles where available
- avoid installing dev dependencies in runtime images unless needed
- prefer deterministic install commands
- avoid dependency drift

## Image scanning

Where available, consider image vulnerability scanning.

Do not ignore Critical or High CVEs without mitigation or explicit acceptance.

If a vulnerable package is inherited from a base image, consider:

- updated base image
- slimmer base image
- removing unused package
- compensating control
- documented exception

Assume no approval exists unless the user states it. If CVEs are present, surface them and ask the user to confirm acceptance with a documented mitigation before proceeding.

## Health checks and lifecycle

Add health checks where they improve operational safety.

Avoid noisy or expensive health checks.

Handle signals properly for long-running processes.

Avoid zombie processes where init handling is needed.

## Security researcher mode

For security research containers:

- keep images portable
- avoid unnecessary dependencies
- document capabilities required
- avoid privileged mode unless necessary
- explain why dangerous mounts or capabilities are needed
- keep lab boundaries clear

## Final response

When completing Docker work, include:

## Images changed

## Build/test commands run

Include only the categories that changed or were considered. Omit categories not relevant to this change.

Also include, when relevant:

- exposed ports
- volumes/mounts changed
- privileges/capabilities changed
- secrets handling
- image CVE or base image considerations

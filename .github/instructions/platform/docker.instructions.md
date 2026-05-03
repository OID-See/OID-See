<!-- version: 1.0.0 -->
# Docker Pack

Use this guidance when working with Dockerfiles, Docker Compose, container images, build pipelines, runtime configuration, or containerised development environments.

## Core approach

Treat containers as security boundaries with limits, not magic isolation.

Prefer simple, reproducible, minimal container builds.

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

Use trusted base images.

Avoid `latest` tags.

Prefer pinned version tags or digests where practical.

Use minimal images where appropriate, but not at the cost of maintainability or required diagnostics.

Do not introduce images with unresolved Critical or High CVEs unless explicitly approved with mitigation.

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

Avoid:

- copying the whole repo unnecessarily
- embedding secrets in images
- using build args for secrets
- printing secrets during build
- curl-pipe-shell without verification
- installing unnecessary packages

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
- use health checks where useful
- avoid broad host mounts
- use named volumes where appropriate
- isolate networks where useful
- document exposed ports

Do not add services that increase attack surface without clear need.

## Package managers

Follow dependency discipline.

For apt/apk/yum:

- install only required packages
- clean package caches
- avoid unnecessary recommends where appropriate
- pin or constrain versions where practical
- avoid untrusted repositories

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

- images changed
- exposed ports
- volumes/mounts changed
- privileges/capabilities changed
- secrets handling
- build/test commands run
- image CVE or base image considerations

<!-- version: 1.0.0 -->
# Netlify Pack

Use this guidance when working with Netlify-hosted sites, Netlify Functions, Netlify Blobs, builds, redirects, environment variables, or deployment configuration.

## Core approach

Treat Netlify as both hosting platform and application runtime.

Be explicit about what runs:

- at build time
- in the browser
- in Netlify Functions
- at the edge
- in redirects or headers
- via scheduled/background functions where used

Do not leak server-side secrets into frontend bundles.

## Project structure

Respect existing framework and build conventions.

Check:

- `netlify.toml`
- package manager
- build command
- publish directory
- functions directory
- edge functions directory
- redirects
- headers
- environment variables
- framework adapter requirements

Do not change publish directories or build commands without understanding deployment impact.

## Environment variables and secrets

Never expose secrets to browser-side code.

Be careful with framework-specific public prefixes, such as variables intentionally exposed to client bundles.

Do not log secrets from Netlify Functions.

Do not put secrets in:

- static files
- generated frontend bundles
- checked-in config
- client-side JavaScript
- build logs
- error pages

Prefer Netlify environment variables or external secret stores as appropriate.

## Functions

When writing Netlify Functions:

- validate all inputs
- handle HTTP methods explicitly
- set appropriate status codes
- avoid leaking stack traces
- avoid logging sensitive request bodies
- handle CORS deliberately
- validate authentication and authorization
- avoid trusting client-provided identity claims
- include timeouts where relevant
- handle cold start assumptions

Do not assume a function is private because it is server-side.

If it has a public endpoint, treat it as internet-exposed.

## Blobs and storage

When using Netlify Blobs or similar KV storage:

- validate keys
- avoid user-controlled path/key traversal
- consider multi-tenant separation
- avoid storing secrets unless explicitly designed for it
- consider integrity and overwrite behaviour
- handle missing objects safely
- consider eventual consistency and race conditions
- avoid trusting client-side cache as authority

## Auth and OAuth

For OAuth flows:

- validate `state`
- use HttpOnly cookies where appropriate
- set SameSite deliberately
- avoid storing sensitive tokens in localStorage
- validate redirect URIs
- validate token issuer and audience
- do not trust frontend-only verification for privileged actions
- enforce admin or role checks server-side

Be careful with GitHub, Microsoft, Google, Eventbrite, LinkedIn, or other federated identity providers.

## Redirects and headers

When editing redirects and headers:

- avoid open redirects
- preserve security headers
- understand rewrite vs redirect behaviour
- avoid accidentally exposing private routes
- be careful with splat rules
- ensure API routes are not shadowed unexpectedly

Security headers to consider:

- Content-Security-Policy
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- Strict-Transport-Security
- X-Frame-Options or CSP frame-ancestors

Do not add overly permissive CSP rules without justification.

## CORS

Configure CORS deliberately.

Avoid `Access-Control-Allow-Origin: *` for authenticated or sensitive endpoints.

Handle preflight requests explicitly where needed.

Do not allow credentials with wildcard origins.

## Build and dependency safety

Follow repository dependency discipline.

Do not add build plugins, framework adapters, or dependencies casually.

Consider build-time secret exposure.

Do not print environment variables during builds.

## Caching

Be explicit about cache behaviour.

Avoid caching:

- authenticated responses
- user-specific data
- tokens
- security decisions
- mutable authorization state

Use cache headers deliberately.

## Observability

Logs should be useful without leaking sensitive data.

When adding diagnostics:

- redact secrets
- avoid full request dumps
- include correlation IDs where useful
- avoid logging OAuth tokens or headers

## Final response

When completing Netlify work, include:

- build/runtime areas affected
- functions changed
- environment variables required
- redirects/headers changed
- client/server boundary risks
- deployment validation steps

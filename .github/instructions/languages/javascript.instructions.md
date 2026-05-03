<!-- version: 1.0.0 -->
# JavaScript Language Pack

Use this guidance when working with JavaScript code.

## Core approach

Prefer clear, maintainable JavaScript over cleverness.

Follow existing project conventions.

Use modern JavaScript where supported by the project runtime, but do not introduce syntax that breaks the configured environment.

Prefer explicit behaviour over implicit magic.

## Runtime safety

JavaScript has no compile-time type guarantees by default. Validate external input at runtime.

Validate data from:

- APIs
- files
- forms
- query strings
- local storage
- environment variables
- generated model output
- webhook payloads

Use simple native validation for small cases.

Do not add validation dependencies for small functionality unless justified.

## Modules and compatibility

Respect the project's module system:

- ESM
- CommonJS
- bundler-specific conventions
- browser vs Node.js runtime

Do not mix module systems unless the project already does so or there is a clear reason.

Check package configuration before changing imports or exports.

## Dependencies

Follow the repository dependency discipline.

Avoid dependencies for functionality that can be implemented natively in under approximately 300 lines.

Prefer latest stable versions without unresolved Critical or High CVEs.

Do not add packages casually.

Before adding a dependency, explain why native JavaScript or existing dependencies are insufficient.

## Async and errors

Use promises and `async` / `await` clearly.

Handle expected errors deliberately.

Do not swallow errors silently.

Avoid unhandled promise rejections.

Do not expose secrets, tokens, credentials, or sensitive payloads in logs or error messages.

## Security

Be careful with:

- eval
- Function constructors
- dynamic script loading
- unsafe HTML insertion
- prototype pollution
- dependency confusion
- path traversal
- SSRF
- open redirects
- command execution
- unsafe deserialization
- client-side secret exposure

Never put secrets into frontend JavaScript.

Assume browser-visible code is public.

## Browser code

When working in browser code:

- avoid unsafe DOM APIs where possible
- prefer text assignment over HTML assignment
- validate and encode user-controlled data
- avoid leaking tokens to local storage unless the existing architecture requires it
- respect CSP assumptions
- avoid unnecessary third-party scripts

## Node.js code

When working in Node.js:

- avoid shell execution where possible
- validate file paths
- avoid writing outside intended directories
- protect environment variables
- handle stream and filesystem errors
- avoid logging raw request bodies if they may contain secrets

## Testing

Use the project's existing test framework.

Add or update focused tests for changed behaviour.

Include negative tests for input validation and security-sensitive paths.

## Final response

When completing JavaScript work, include:

- files changed
- runtime assumptions
- tests run
- tests not run
- security caveats

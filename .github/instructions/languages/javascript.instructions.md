<!-- version: 1.0.1 -->
# JavaScript Language Pack

Use this guidance when working with JavaScript code.

## Core approach

Prefer clear, maintainable JavaScript over cleverness.

Follow existing project conventions.

Use modern JavaScript where supported by the project runtime, but do not introduce syntax that breaks the configured environment. Determine supported syntax from `package.json` `engines`, `.nvmrc`, `browserslist`, or `tsconfig` target in that order. If none are present, target Node.js LTS / ES2020.

When existing project conventions conflict with the safety or security guidance in this document, follow the safety/security guidance and call out the deviation in the final response.

Prefer explicit behaviour over implicit magic.

## Runtime safety

JavaScript has no compile-time type guarantees by default. Validate external input at runtime.

If the project uses JSDoc types or `checkJs` / `allowJs` in `tsconfig`, preserve and extend those annotations. Runtime validation is still required at trust boundaries even when types are present.

Validate data from:

- APIs
- files
- forms
- query strings
- local storage
- environment variables
- generated model output
- webhook payloads

For inputs with fewer than about 5 fields, use inline checks such as `typeof`, `Array.isArray`, `Number.isFinite`, and explicit allow-lists rather than introducing a schema library.

When validation fails, throw a descriptive error or reject the request with a 4xx response in HTTP contexts. Do not silently coerce or fall back to defaults unless the existing code does so intentionally.

Do not add validation dependencies for small functionality unless justified.

## Modules and compatibility

Respect the project’s module system:

- ESM
- CommonJS
- bundler-specific conventions
- browser vs Node.js runtime

Do not mix module systems unless the project already does so or there is a clear reason.

For code that runs in both browser and Node.js, avoid runtime-specific globals (`process`, `window`, `document`) without feature detection.

Check package configuration before changing imports or exports.

## Dependencies

Follow the repository dependency discipline.

Avoid adding a dependency if the equivalent functionality can be implemented in roughly 300 lines or fewer of production code, excluding tests and comments.

Prefer latest stable versions without unresolved Critical or High CVEs.

Do not add packages casually.

Before adding a dependency, explain why native JavaScript or existing dependencies are insufficient.

## Async and errors

Use promises and `async` / `await` clearly.

Handle expected errors deliberately.

Do not swallow errors silently.

Avoid unhandled promise rejections.

For fire-and-forget async operations, attach a `.catch()` that logs the error with secrets redacted rather than relying on global `unhandledRejection` handlers.

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

Use the project’s existing test framework.

Add or update focused tests for changed behaviour.

Include negative tests for input validation and security-sensitive paths.

## Final response

When completing JavaScript work, include:

- files changed
- runtime assumptions
- tests run
- tests not run
- security caveats

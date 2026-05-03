<!-- version: 1.0.0 -->
# TypeScript Language Pack

Use this guidance when working with TypeScript code.

## Core approach

Prefer clear, typed, maintainable TypeScript over clever or overly abstract patterns.

Follow existing project conventions before introducing new ones.

Do not weaken type safety to make code compile. Avoid `any` unless there is a clear boundary reason and it is explained.

Prefer explicit types at public boundaries and allow inference for obvious local values.

## Type safety

Prefer:

- `unknown` over `any` for untrusted input
- discriminated unions for state and variant handling
- narrow interfaces at boundaries
- readonly data where mutation is not required
- explicit return types for exported functions
- safe parsing and validation at trust boundaries

Avoid:

- unsafe type assertions
- broad index signatures
- non-null assertions unless justified
- suppressing compiler errors
- weakening `tsconfig` strictness
- pretending runtime validation exists because TypeScript types exist

Remember: TypeScript types do not validate runtime data.

## Runtime validation

Validate data from:

- APIs
- files
- environment variables
- query strings
- form data
- local storage
- external services
- generated model output
- webhook payloads

For small validation needs, write native validation. For complex schemas, use the project's existing validation library if one is already present.

Do not add a validation dependency for small, simple validation tasks unless justified.

## Dependencies

Follow the repository dependency discipline.

Do not add dependencies for small functionality that can be implemented in under approximately 300 lines.

Prefer latest stable package versions that do not have unresolved Critical or High CVEs.

Before adding a package, explain:

- why it is needed
- why native TypeScript is not sufficient
- whether an existing dependency can do the job
- security and maintenance considerations

## Async and errors

Use `async` / `await` clearly.

Handle expected failures deliberately.

Do not swallow errors silently.

Do not leak secrets or sensitive request/response bodies in thrown errors or logs.

Prefer typed error handling where useful, but do not build elaborate error frameworks unless the project already uses them.

## Security

Be careful with:

- dynamic imports
- eval-like behaviour
- shell execution
- unsafe HTML rendering
- deserialization
- URL parsing
- redirects
- SSRF
- path traversal
- prototype pollution
- token logging
- client-side secret exposure

Do not store secrets in frontend code.

Do not assume environment variables are safe to expose to browser bundles.

## Testing

When changing behaviour, update or add tests.

Prefer focused tests for:

- happy path
- relevant edge cases
- invalid input
- security-sensitive negative cases

Use the existing test framework and style.

Do not introduce a test framework unless explicitly requested.

## Final response

When completing TypeScript work, include:

- files changed
- type checks run
- tests run
- tests not run
- any type-safety compromises

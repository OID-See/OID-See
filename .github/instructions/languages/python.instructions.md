<!-- version: 1.0.0 -->
# Python Language Pack

Use this guidance when working with Python code.

## Core approach

Prefer simple, readable, standard-library-first Python.

Follow existing project conventions.

Do not introduce frameworks or dependencies for small tasks.

Use type hints where they improve clarity, especially at public boundaries.

Prefer boring code that can be inspected quickly.

## Standard library preference

For small functionality under approximately 300 lines, prefer the Python standard library.

Good standard-library candidates include:

- file handling
- path handling with `pathlib`
- JSON
- CSV
- HTTP basics where appropriate
- argument parsing
- logging
- subprocess control
- hashing for integrity checks
- datetime handling
- simple config loading
- simple retry loops

Do not implement complex cryptography, protocol parsing, or standards-heavy behaviour manually.

## Dependencies

Follow the repository dependency discipline.

Prefer latest stable versions without unresolved Critical or High CVEs.

Do not add packages casually.

Before adding a dependency, explain:

- why it is needed
- why the standard library is not sufficient
- whether an existing dependency can do it
- security and maintenance considerations

In security researcher mode, avoid dependencies unless absolutely necessary.

## Type hints

Use type hints for:

- exported functions
- public classes
- complex return values
- data structures crossing module boundaries

Avoid excessive typing that makes simple code harder to read.

Do not use `Any` unless justified.

## Errors and logging

Handle expected errors deliberately.

Do not swallow exceptions silently.

Use specific exceptions where practical.

Avoid leaking secrets, tokens, credentials, request bodies, or sensitive file contents in logs.

Use the project's existing logging style.

## Security

Be careful with:

- `subprocess`
- shell=True
- unsafe temp files
- path traversal
- deserialization
- pickle
- YAML loading
- SSRF
- command injection
- credential handling
- environment variable leaks
- writing files outside intended directories

Avoid `shell=True` unless explicitly justified.

If running commands, pass arguments as lists and validate user-controlled values.

## HTTP and APIs

For simple proof-of-concept or research scripts, prefer standard library HTTP where practical.

For production-quality API clients, use the project's existing HTTP library if present.

Handle timeouts.

Do not log bearer tokens or full authorization headers.

Validate URLs before making requests when user-controlled.

## Security researcher mode

For exploit, proof-of-concept, vulnerability validation, and red-team scripts:

- avoid dependencies
- prefer single-file scripts where practical
- prioritise portability
- keep setup minimal
- make assumptions explicit
- avoid stealth, persistence, or destructive behaviour unless explicitly authorised and safely bounded

## Testing

Use the existing test framework, usually `pytest` or `unittest`.

Add focused tests for changed behaviour.

For bug fixes, prefer regression tests.

Do not introduce a test framework unless explicitly requested.

## Final response

When completing Python work, include:

- files changed
- Python version assumptions
- dependencies added or avoided
- tests run
- tests not run
- security caveats

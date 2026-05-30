<!-- version: 1.0.1 -->
# Python Language Pack

Use this guidance when working with Python code.

## Core approach

Prefer simple, readable, standard-library-first Python.

Follow existing project conventions. When project conventions conflict with this guidance, prefer the project convention for style or packaging and note the deviation in the final response; for safety or security guidance, follow this document.

Do not introduce frameworks or dependencies for small tasks.

Use type hints where they improve clarity, especially at public boundaries.

Prefer boring code that can be inspected quickly.

If the project uses a `src/` layout, `pyproject.toml`, or a virtual environment, mirror the existing package layout. For new standalone scripts, place them in `scripts/` or `tools/` if such a directory exists.

Match the project's configured formatter and linter, such as `black`, `ruff`, or `mypy`. Do not introduce new tooling unless asked.

## Standard library preference

For self-contained features expected to be under about 300 LOC, prefer the Python standard library. If the implementation grows beyond about 400 LOC or requires complex protocol handling, reassess and consider a dependency.

For HTTP or API clients, the project's existing HTTP library takes precedence over the standard-library-first rule when one is already used in the project.

If the project already uses the `requests` or `httpx` library for HTTP, prefer that library for production-quality API clients instead of introducing a new one.

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

Precedence when rules conflict: security researcher mode overrides default dependency rules; otherwise, production-quality rules apply when modifying existing production code; otherwise, default standard-library-first rules apply.

Security researcher mode applies when the user explicitly requests an exploit, proof of concept, vulnerability validation, or red-team script. Otherwise, default mode applies.

Prefer latest stable versions without unresolved Critical or High CVEs.

Do not add packages casually.

Before adding a dependency, explain:

- why it is needed
- why the standard library is not sufficient
- whether an existing dependency can do it
- security and maintenance considerations

When modifying code that uses an existing dependency, re-evaluate it against these rules and propose removal or upgrade if it now violates them.

In security researcher mode, avoid dependencies unless absolutely necessary.

## Type hints

Use type hints for:

- exported functions
- public classes
- complex return values
- data structures crossing module boundaries

Do not annotate trivial local variables or obvious literals. Always annotate function parameters, return types, and module-level data structures.

Do not use `Any` unless justified. Acceptable cases include untyped third-party return values, genuinely dynamic dispatch, and decorators wrapping arbitrary callables. Add a comment explaining why.

## Errors and logging

Handle expected errors deliberately.

Do not swallow exceptions silently.

Use specific exceptions where practical.

When validation fails, throw a descriptive error or reject the request with a 4xx response in HTTP contexts. Do not silently coerce or fall back to defaults unless the existing code does so intentionally.

Avoid leaking secrets, tokens, credentials, request bodies, or sensitive file contents in logs.

Use the project’s existing logging style.

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

`shell=True` is only acceptable when invoking a shell builtin or pipeline that cannot be expressed as an argv list, and no value in the command is user-controlled. Document the justification in a comment.

If running commands, pass arguments as lists and validate user-controlled values.

## HTTP and APIs

For simple proof-of-concept or research scripts, prefer standard library HTTP where practical.

For production-quality API clients, use the project’s existing HTTP library if present.

For code that runs in both browser and Node.js, avoid runtime-specific globals such as `process`, `window`, and `document` without feature detection.

Use async only when the surrounding code is already async or when concurrency is required. Default to synchronous code for scripts and CLI tools.

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

If no test framework is present, ask the user before adding one, or provide tests as a `unittest`-based file since `unittest` is in the standard library.

Default to Python 3.10+ unless the repository's `pyproject.toml` or `setup.cfg` specifies otherwise. Detect and follow the project's declared version.

## Final response

When completing Python work, include:

- files changed
- Python version assumptions
- dependencies added or avoided
- tests run
- tests not run
- security caveats

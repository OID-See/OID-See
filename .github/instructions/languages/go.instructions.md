<!-- version: 1.0.0 -->
# Go Language Pack

Use this guidance when working with Go code.

## Core approach

Prefer clear, idiomatic, standard-library-first Go.

Follow existing project conventions. When project conventions conflict with this guidance, prefer the project convention for style or packaging and note the deviation in the final response; for safety or security guidance, follow this document.

Do not introduce frameworks or dependencies for small tasks.

Use explicit types at public boundaries; rely on inference only for obvious local values.

Prefer boring code that can be read and reviewed quickly.

If the project uses a `cmd/` layout with internal packages, mirror the existing package structure. For new standalone tools, place them in `cmd/<name>/main.go` if such a directory convention exists.

Match the project's configured linter (`golangci-lint`, `staticcheck`, `go vet`). Do not introduce new tooling unless asked.

## Standard library preference

For self-contained features expected to be under about 300 LOC, prefer the Go standard library. If the implementation grows beyond about 400 LOC or requires complex protocol handling, reassess and consider a dependency.

For HTTP or API clients, the project's existing HTTP library or SDK takes precedence over the standard-library-first rule when one is already used in the project.

Good standard-library candidates include:

- file handling with `os` and `io`
- path handling with `path/filepath`
- JSON with `encoding/json`
- CSV with `encoding/csv`
- HTTP with `net/http`
- argument parsing with `flag`
- logging with `log` or `log/slog`
- subprocess control with `os/exec`
- hashing for integrity checks with `crypto/sha256`
- datetime handling with `time`
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

Use `go get` to add dependencies and commit the updated `go.mod` and `go.sum`.

Avoid indirect dependencies that pull in large or poorly maintained module graphs.

## Error handling

Handle errors explicitly. Do not discard errors with `_`.

Wrap errors with context using `fmt.Errorf("action: %w", err)` so callers can understand what failed.

Do not swallow errors silently or log-and-continue without good reason.

Return errors to the caller rather than panicking for recoverable conditions.

Use `errors.Is` and `errors.As` for error inspection. Do not compare error strings directly.

When validating input, return a descriptive error rather than silently coercing or defaulting.

## Context propagation

Accept `context.Context` as the first parameter of functions that perform I/O, network calls, or long-running operations.

Do not store contexts in structs.

Respect context cancellation. Check `ctx.Err()` or pass the context to blocking calls.

Do not ignore `ctx.Done()` in long loops.

## Goroutines and concurrency

Do not start goroutines without a clear ownership and shutdown path.

Prefer `sync.WaitGroup` or `errgroup.Group` for fan-out.

Avoid goroutine leaks: always ensure goroutines can exit when the context is cancelled or a done channel is closed.

Protect shared state with a `sync.Mutex` or `sync.RWMutex`. Document the invariant the lock protects.

Prefer channels for communication over shared memory where the design is naturally pipeline-shaped.

Do not use `go func()` in tight loops without bounding concurrency.

## Type safety and interfaces

Use interfaces to describe behaviour, not to share data.

Keep interfaces small. Prefer single-method interfaces where practical.

Avoid `interface{}` (`any`) unless at a genuine boundary with dynamic types. Add a comment explaining why.

Do not use `reflect` for ordinary data transformation; use it only when the type set is genuinely open.

## Security

Be careful with:

- `os/exec` and shell command construction
- path traversal when joining user-controlled path segments
- `text/template` and `html/template` with untrusted input — always use `html/template` for HTML output
- deserialization of untrusted data with `encoding/json`, `encoding/gob`, or third-party parsers
- SSRF via `net/http` client with user-controlled URLs
- credential handling and environment variable leaks
- writing files outside intended directories

Avoid `exec.Command` with shell interpolation of user input.

Validate file paths before writing. Use `filepath.Clean` and confirm the result is inside the intended directory.

Do not log secrets, tokens, or credentials.

## Testing

Use the standard `testing` package and `go test`.

Add focused tests for changed behaviour.

For table-driven tests, follow the `[]struct{ name, input, want }` pattern already used in the project.

Use subtests (`t.Run`) for grouped cases.

For bug fixes, prefer regression tests.

Do not introduce a test framework unless the project already uses one (for example, `testify`).

Use `t.TempDir()` for tests that need filesystem access — it is cleaned up automatically.

Avoid network calls in unit tests. Prefer interfaces and test doubles.

## Final response

When completing Go work, include:

- files changed
- Go version assumptions
- dependencies added or avoided
- tests run
- tests not run
- security caveats

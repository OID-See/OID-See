<!-- version: 1.0.1 -->
# PowerShell Language Pack

Use this guidance when working with PowerShell scripts and modules.

## Core approach

Prefer clear, safe, auditable PowerShell.

Inspect existing `.ps1` and `.psm1` files in the workspace for naming, parameter, and formatting patterns before writing new code. If none exist, follow the conventions in this guide.

Optimise for maintainability, predictable behaviour, and safe failure.

Do not hide risk behind clever pipeline tricks.

Use a single `.ps1` for one-shot tasks. Promote to a module (`.psm1` plus `.psd1` manifest) when exporting multiple reusable functions or when versioning is required.

## Compatibility

Be explicit about assumptions:

- Windows PowerShell 5.1
- PowerShell 7+
- required modules
- supported platforms
- required permissions

Determine supported syntax from the runtime signals in this order: `package.json` / build config if present, `.psd1` / `.psm1` patterns, existing scripts, then the user's request. If none are present, assume the target runtime is the version the user explicitly asked for; otherwise ask for clarification.

Use PowerShell 7-only features only when the user has stated in this conversation that PowerShell 7+ is the target runtime.

When targeting PowerShell 7 cross-platform, use `Join-Path` and `[IO.Path]` rather than hard-coded separators, and avoid Windows-only cmdlets unless gated by `$IsWindows`.

## Parameters and validation

Use advanced functions (`[CmdletBinding()]`) for any function that accepts parameters, performs I/O, or may be reused. Simple inline helpers may remain basic functions.

Prefer:

- `[CmdletBinding()]`
- named parameters
- parameter validation attributes
- clear help text
- sensible defaults
- `SupportsShouldProcess` for destructive actions

Validate user-controlled input.

Do not concatenate untrusted values into commands.

## Safety

Use `-WhatIf` and `-Confirm` patterns for destructive or high-impact actions.

Treat the user's direct request to perform a destructive action as approval, but always wrap such actions in `SupportsShouldProcess`, default the safe path to `-WhatIf`, and require `-Confirm` or `-WhatIf` support. Call out that safety assumption in the final response.

Avoid broad destructive commands.

Always require `ShouldProcess` for:

- `Remove-*`
- destructive `Set-*` against external state
- `Disable-*`
- `Revoke-*`
- role assignments
- Conditional Access changes
- Graph permission changes
- tenant-wide operations

Use caution and confirm intent for:

- filesystem recursion
- registry changes

Do not treat benign commands such as `Set-Location` or `Set-Variable` as destructive.

## Errors

Use deliberate error handling.

Prefer terminating errors for failure states that should stop execution. For localized handling, prefer explicit `throw` or `$PSCmdlet.ThrowTerminatingError()`.

Do not silently continue after critical failures.

Return useful errors without leaking secrets.

## Secrets and credentials

Never hard-code secrets, tokens, passwords, client secrets, certificates, or private keys.

Do not write secrets to logs, transcript files, command history, or output objects.

Prefer managed identity, workload identity, certificate auth, secure secret stores, or platform-native authentication.

Redact sensitive values.

## Dependencies and modules

Follow the repository dependency discipline.

Avoid external modules for small functionality.

Prefer built-in cmdlets and .NET APIs where practical.

If a module is required, explain:

- why it is needed
- supported version
- installation assumptions
- security posture
- whether it is already used in the project

## Microsoft Graph and cloud APIs

When using Microsoft Graph, Azure, or cloud APIs:

- request least privilege
- distinguish delegated vs application permissions
- validate tenant context
- validate scopes and roles
- avoid excessive directory permissions
- handle pagination
- handle throttling
- avoid logging tokens or full request headers
- be explicit about beta vs v1.0 endpoints

For throttled responses, honour the `Retry-After` header and implement exponential backoff with a bounded retry count (for example, 5 attempts). Surface terminal failures with the original status code.

Do not switch to broad permissions just because they are easier.

## Output

Return structured objects where practical.

Avoid formatting output too early unless the script is purely interactive.

Use clear status messages.

Use `Write-Verbose` for diagnostic detail, `Write-Information` or `Write-Host` for user-facing status, and reserve `Write-Output` (or implicit output) for pipeline objects. Do not mix status text into the object pipeline.

Do not expose sensitive data in verbose or debug output.

## Testing

Where practical, structure code so logic can be tested without live tenant side effects.

Separate:

- pure logic
- API calls
- filesystem changes
- destructive actions

For risky scripts, include dry-run behaviour.

## Security researcher mode

For proof-of-concept or validation scripts:

- avoid external modules unless necessary
- keep setup minimal
- make assumptions explicit
- avoid destructive behaviour by default
- include clear lab/authorisation boundaries

## Final response

When completing PowerShell work, include:

- files changed
- PowerShell version assumptions
- modules required
- permissions required
- tests or dry-runs performed
- safety caveats

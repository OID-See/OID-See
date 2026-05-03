<!-- version: 1.0.0 -->
# PowerShell Language Pack

Use this guidance when working with PowerShell scripts and modules.

## Core approach

Prefer clear, safe, auditable PowerShell.

Follow existing project conventions.

Optimise for maintainability, predictable behaviour, and safe failure.

Do not hide risk behind clever pipeline tricks.

## Compatibility

Be explicit about assumptions:

- Windows PowerShell 5.1
- PowerShell 7+
- required modules
- supported platforms
- required permissions

Do not use PowerShell 7-only features in scripts intended for Windows PowerShell 5.1 unless explicitly approved.

## Parameters and validation

Use advanced functions where appropriate.

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

Do not delete, overwrite, disable, revoke, or rotate anything without explicit approval or `ShouldProcess`.

Avoid broad destructive commands.

Be careful with:

- `Remove-*`
- `Set-*`
- `Disable-*`
- `Revoke-*`
- role assignments
- Conditional Access changes
- Graph permission changes
- tenant-wide operations
- filesystem recursion
- registry changes

## Errors

Use deliberate error handling.

Prefer terminating errors for failure states that should stop execution.

Do not silently continue after critical failures.

Use `$ErrorActionPreference = 'Stop'` carefully and intentionally.

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

Do not switch to broad permissions just because they are easier.

## Output

Return structured objects where practical.

Avoid formatting output too early unless the script is purely interactive.

Use clear status messages.

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

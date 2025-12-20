# OID-See Graph Scanner

A lightweight Microsoft Graph scanner that builds an OID-See export for your Entra tenant, focusing on third‑party and multi‑tenant Service Principals, their delegated and application permissions, reachability, and risk signals.

- Outputs a JSON file compatible with `schemas/oidsee-graph-export.schema.json`.
- Emphasizes delegated scope classification, application permissions, offline access, owners, assignments, and directory roles.
- Includes concise progress logs and resilient HTTP handling (429/503 backoff, graceful 404s).

## Features
- Service Principals discovery (multi‑tenant/3P by default; configurable filters).
- In‑tenant Application lookup (best‑effort for registrations present in your tenant).
- Delegated consent classification into:
  - `HAS_SCOPES`, `HAS_PRIVILEGED_SCOPES`, `HAS_TOO_MANY_SCOPES`.
  - `HAS_OFFLINE_ACCESS` for `offline_access` (persistence, not impersonation).
  - `CAN_IMPERSONATE` for explicit markers like `access_as_user` / `user_impersonation`.
- Application permissions (app roles): `HAS_APP_ROLE` edges, with tiered risk scoring.
- Reachability: `ASSIGNED_TO` edges (user/group → app).
- Directory role links: `HAS_ROLE` edges (roles assigned to the SP).
- Ownership: `OWNS` edges (owners of the app/SP).
- Risk scoring aligned to capability, exposure, governance, deception, and legacy signals.
- Governance deductions applied when `GOVERNS` edges exist (e.g., Conditional Access policies).
- Robust HTTP handling with exponential backoff + jitter for throttling; graceful handling of missing objects.
- Category‑level progress logs to stderr (no per‑item spam).

## Prerequisites
- Python 3.12+
- Install dependencies:

```powershell
# From the repo root
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r .\requirements.txt
```

## Authentication
- Device Code (delegated): default `--device-code-client-id` is the Azure CLI public client.
- Client Secret (application): supply `--client-id` and `--client-secret`.

## Usage
Basic (device code):
```powershell
python .\oidsee_scanner.py --tenant-id "<TENANT_ID>" --out .\oidsee-export.json
```
Client secret (application):
```powershell
python .\oidsee_scanner.py `
  --tenant-id "<TENANT_ID>" `
  --client-id "<APP_ID>" `
  --client-secret "<SECRET>" `
  --out .\oidsee-export.json
```

### Common Options
- `--tenant-id`: Target tenant GUID (required).
- `--device-code-client-id`: Public client for device code (default: Azure CLI).
- `--client-id`, `--client-secret`: App credentials for application auth.
- `--out`: Output file path (default `oidsee-export.json`).
- `--include-first-party`: Include Microsoft‑owned first‑party apps.
- `--include-single-tenant`: Include `AzureADMyOrg` audience apps.
- `--include-all-sps`: Disable filters; include all Service Principals.
- `--max-retries`: Max HTTP retries for Graph requests (default 6).
- `--retry-base-delay`: Base delay (seconds) for exponential backoff (default 0.8).

## Output
- Default: writes `oidsee-export.json` in the working directory.
- Validates against `schemas/oidsee-graph-export.schema.json`.
- Structure:
  - Nodes: `ServicePrincipal`, `Application`, `User`, `Group`, `Role`, `ResourceApi`, `TenantPolicy`, etc.
  - Edges: `INSTANCE_OF`, `OWNS`, `MEMBER_OF`, `ASSIGNED_TO`, `HAS_ROLE`, `HAS_SCOPES`, `HAS_PRIVILEGED_SCOPES`, `HAS_TOO_MANY_SCOPES`, `HAS_OFFLINE_ACCESS`, `CAN_IMPERSONATE`, `HAS_APP_ROLE`.
  - Derived edges (e.g., `EFFECTIVE_IMPERSONATION_PATH`, `PERSISTENCE_PATH`) are not computed by the scanner and may appear only in sample data.

## Risk Scoring (Summary)
Scoring is additive (capped 0–100) and mapped to levels: info/low/medium/high/critical.

- Capability:
  - `CAN_IMPERSONATE`: +40 (explicit markers like `access_as_user`, `user_impersonation`).
  - `HAS_APP_ROLE`: tiered by role value/name:
    - Write/critical (e.g., Directory/Mail/Files ReadWrite): +50
    - High‑value read (e.g., Directory.Read.All, AuditLog.Read): +25
    - Default app role: +35
  - `HAS_PRIVILEGED_SCOPES`: +20
  - `HAS_TOO_MANY_SCOPES`: +15 (sprawl indicator)
  - `HAS_OFFLINE_ACCESS`: +15 (persistence via refresh tokens)

- Exposure:
  - `ASSIGNED_TO`: approximated user reach
    - all/large groups: +15 to +25
    - medium/small: +5 to +15
  - No assignments but `requiresAssignment=false`: +15 (broad reachability)

- Governance & Lifecycle:
  - `GOVERNS`: deductions applied per `properties.strength`
    - strong: −30, moderate: −15, weak: −5
  - No owners: +15
  - Deception (unverified publisher + display/publisher mismatch): +20
  - Legacy (created before July 2025): +10

Risk reasons include codes, messages, and weights; score level is derived from the final score.

## Logging
The scanner prints category‑level progress logs to stderr:
- Fetch tenant metadata
- List & filter Service Principals
- Fetch in‑tenant Application objects (best‑effort)
- Collect grants, app permissions, assignments, owners, directory roles
- Resolve principals/resources and fetch role definitions
- Emit nodes/edges
- Apply governance deductions

## Error Handling
- Throttling: Automatic exponential backoff + jitter for 429/503; honors `Retry‑After` when present.
- Network/5xx: Retried up to `--max-retries`; delays controlled by `--retry-base-delay`.
- Missing objects: 404 raises `GraphNotFound`; callers fall back to placeholders so the scan completes.
- Batch `/directoryObjects/getByIds`: routed through the same retry/backoff logic; ignores not‑found entries.

## Tips
- To include more apps, use `--include-first-party` or `--include-single-tenant`, or override filters with `--include-all-sps`.
- For noisy tenants or strict throttling, increase `--max-retries` and `--retry-base-delay` modestly.
- For minimum output noise, redirect stderr to a file if desired.

## License
See the repository’s license files for terms.
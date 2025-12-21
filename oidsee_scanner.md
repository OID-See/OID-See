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

## Enhanced Features (New)

### Credential Hygiene Analysis
The scanner now performs comprehensive analysis of application and service principal credentials:
- **Password Credentials**: Client secrets with validity periods
- **Key Credentials**: X.509 certificates for authentication
- **Federated Identity Credentials**: Workload identity federation configurations

**Insights Generated:**
- **Long-lived secrets**: Identifies secrets with lifetimes exceeding 180 days
- **Expired credentials**: Detects credentials that have expired but remain in the configuration
- **Multiple active secrets**: Flags applications with more than 3 active credentials
- **Certificate expiry warnings**: Alerts when certificates expire within 30 days

All insights are included in the `credentialInsights` property of ServicePrincipal nodes and contribute to risk scoring.

### Reply URL Security Analysis
Comprehensive analysis of OAuth2 redirect URIs to detect security issues:
- **Non-HTTPS schemes**: Identifies insecure HTTP redirect URIs
- **IP literals**: Detects IP addresses in redirect URIs (potential bypasses)
- **Localhost URLs**: Identifies development/test configurations in production apps
- **Punycode domains**: Detects internationalized domain names (potential homograph attacks)
- **Domain clustering**: Groups reply URLs by registrable domain (eTLD+1)

Results are available in the `replyUrlAnalysis` property and contribute to risk scoring.

### Permission Resolution
OAuth2 scopes and app roles are now resolved to human-readable details:
- **OAuth2 Scopes**: Includes displayName, description, admin/user consent information
- **App Roles**: Includes displayName, description, and allowedMemberTypes
- **Resource Identification**: Clearly identifies the resource API for each permission

Resolved details are included in edge properties for `HAS_SCOPES`, `HAS_PRIVILEGED_SCOPES`, `HAS_TOO_MANY_SCOPES`, and `HAS_APP_ROLE` edges.

### Trust Signals
Enhanced identity and trust indicators in ServicePrincipal nodes:
- **Identity Laundering Detection**: Flags applications with reply URLs from domains not aligned with declared homepage/branding
- **Mixed Domain Analysis**: Identifies applications using multiple registrable domains
- **Non-aligned Domains**: Lists domains that don't match the application's declared identity

Trust signals are available in the `trustSignals` property of ServicePrincipal nodes.

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
  - **`MIXED_REPLYURL_DOMAINS`**: Detects potential attribution ambiguities or identity laundering signals
    - Identity laundering signal: +15 (reply URLs use domains not aligned with homepage/branding)
    - Attribution ambiguity: +5 (multiple distinct domains, all aligned with homepage/branding)
  - Legacy (created before July 2025): +10

- Credential Hygiene (New):
  - **Long-lived secrets**: +10 (secrets with lifetime >180 days)
  - **Expired credentials**: +5 (expired credentials still present)
  - **Multiple active secrets**: +5 (more than 3 active credentials)
  - **Certificate expiring soon**: +8 (certificate expires within 30 days)

- Reply URL Anomalies (New):
  - **Non-HTTPS URLs**: +10 (insecure redirect URIs)
  - **IP literals**: +12 (IP addresses in redirect URIs)
  - **Punycode domains**: +8 (internationalized domain names)

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

## MIXED_REPLYURL_DOMAINS Heuristic (Detailed)

The `MIXED_REPLYURL_DOMAINS` heuristic is a non-blocking rule that evaluates reply URLs to identify potential attribution ambiguities or identity laundering signals.

### Purpose
This heuristic helps detect scenarios where:
1. **Identity Laundering**: An application uses reply URLs from domains that don't align with its declared homepage or branding (e.g., `info.marketingUrl`), potentially indicating malicious redirection or phishing attempts.
2. **Attribution Ambiguity**: An application legitimately uses multiple domains but may cause confusion about which organization operates it.

### Detection Logic
1. Extract the eTLD+1 (effective top-level domain plus one, also known as the registrable domain) from all reply URLs.
2. Identify distinct registrable domains among the reply URLs.
3. Compare these domains against reference domains from:
   - `homepage`
   - `info.marketingUrl`
   - `info.privacyStatementUrl`
   - `info.termsOfServiceUrl`

### Signal Types and Weights

#### 🟠 Identity Laundering Signal (+15 points)
Raised when:
- There is more than one distinct registrable domain among reply URLs, AND
- At least one domain does NOT align with the homepage or branding configurations

**Example:**
```
replyUrls: ["https://app.contoso.com/callback", "https://evil.com/steal"]
homepage: "https://www.contoso.com"
→ evil.com is not aligned → Identity Laundering Signal
```

#### 🟡 Attribution Ambiguity (+5 points)
Raised when:
- There is more than one distinct registrable domain among reply URLs, AND
- All domains align with homepage or branding configurations

**Example:**
```
replyUrls: ["https://app.contoso.com/callback", "https://api.contoso.net/oauth"]
homepage: "https://www.contoso.com"
info.marketingUrl: "https://contoso.net"
→ Both domains aligned → Attribution Ambiguity
```

#### ❌ Not Flagged
- Single domain across all reply URLs
- Empty or invalid reply URLs
- Localhost/IP addresses (filtered out)

### Use Cases
- **Security Teams**: Identify potentially malicious applications using legitimate-looking primary domains but redirecting to suspicious secondary domains.
- **Compliance Teams**: Detect multi-domain configurations that may violate organizational policies or create confusion for end users.
- **Application Owners**: Understand when their application's reply URL configuration may appear suspicious and requires documentation or remediation.

### Configuration
Weights can be customized in `scoring_logic.json`:
```json
"MIXED_REPLYURL_DOMAINS": {
  "identity_laundering_weight": 15,
  "identity_laundering_description": "Identity laundering signal: reply URLs use domains not aligned with homepage/branding",
  "attribution_ambiguity_weight": 5,
  "attribution_ambiguity_description": "Attribution ambiguity: multiple distinct domains in reply URLs"
}
```

## License
See the repository’s license files for terms.
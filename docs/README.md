# OID-See Documentation

Welcome to the comprehensive documentation for the OID-See project. This documentation covers all aspects of the system from data collection to visualization.

## Table of Contents

### Core Documentation

1. **[Scanner Documentation](./scanner.md)**
   - How the scanner works
   - Data collection process
   - Authentication methods
   - Command-line options
   - Enhanced features (credentials, reply URLs, permissions)

2. **[Scoring Logic Documentation](./scoring-logic.md)**
   - Risk assessment algorithm
   - Scoring categories and weights
   - Risk level mapping
   - Example scenarios

3. **[Schema Documentation](./schema.md)**
   - Export format specification
   - Node types and properties
   - Edge types and relationships
   - Usage examples

4. **[Web Application Documentation](./web-app.md)**
   - User interface guide
   - Feature walkthrough
   - Filter query syntax
   - Advanced usage patterns

5. **[Visualization Modes Documentation](./visualization-modes.md)**
   - Alternative view modes for large datasets
   - Table View with virtual scrolling (50,000+ nodes)
   - Hierarchical Tree View with risk aggregation
   - Matrix Heat Map for relationship patterns
   - Dashboard View for statistical summaries
   - Hybrid approach for subset visualization

6. **[Findings Export](#findings-export)**
   - Convert scanner output to analyst-ready findings
   - JSON, CSV, and Markdown output formats
   - Evidence-first language for tickets and audits

7. **[Findings Delta / Drift Report](#findings-delta--drift-report)**
   - Compare two findings exports and detect what changed
   - new, resolved, unchanged, changed, regressed, improved classifications
   - JSON, CSV, and Markdown delta output formats

## Quick Start

### For Security Analysts

Start here to analyze your tenant:

1. **Generate Data**: Follow the [Scanner Documentation](./scanner.md) to collect tenant data
2. **Understanding Risk**: Read [Scoring Logic](./scoring-logic.md) to interpret risk scores
3. **Visualize**: Use the [Web App Guide](./web-app.md) to explore your data at **https://oid-see.netlify.app/**
4. **Choose View Mode**: For large datasets, see [Visualization Modes](./visualization-modes.md)
5. **Query**: Learn filter syntax to find specific security issues
6. **Export Findings**: Use `generate_findings.py` to export analyst-ready findings for tickets or audits
7. **Compare Scans**: Use `compare_findings.py` to detect drift between two scan exports

### For Developers

Start here to extend or integrate OID-See:

1. **Schema Reference**: Review [Schema Documentation](./schema.md) for data format
2. **Scanner Internals**: Read [Scanner Documentation](./scanner.md) for architecture details
3. **Risk Calculation**: Study [Scoring Logic](./scoring-logic.md) for risk algorithms
4. **UI Components**: Examine source code and [Web App Documentation](./web-app.md)

### For Compliance Teams

Start here to audit and report:

1. **Data Collection**: Use [Scanner Documentation](./scanner.md) to gather evidence
2. **Risk Assessment**: Leverage [Scoring Logic](./scoring-logic.md) for compliance scoring
3. **Query Examples**: Apply filters from [Web App Guide](./web-app.md)
4. **Export Schema**: Reference [Schema Documentation](./schema.md) for reporting
7. **Export Findings**: Use `generate_findings.py` to produce structured audit evidence in JSON, CSV, or Markdown
8. **Compare Scans**: Use `compare_findings.py` to detect drift between two findings exports

## Documentation Overview

### Scanner Documentation

The scanner documentation covers:
- **Architecture**: How the scanner collects data from Microsoft Graph
- **Flow Diagrams**: Visual representation of the scanning process
- **Authentication**: Device code flow and client credentials
- **Parallel Collection**: Performance optimization techniques
- **Enhanced Analysis**: Credential hygiene, reply URLs, trust signals
- **Error Handling**: Retry logic and graceful degradation

**Key Topics**:
- Multi-tenant application discovery
- Parallel data collection (10x performance improvement)
- Credential analysis (long-lived secrets, expired credentials)
- Reply URL security (non-HTTPS, IP literals, punycode)
- Permission resolution (human-readable descriptions)
- Trust signal detection (identity laundering)

### Scoring Logic Documentation

The scoring logic documentation includes:
- **Algorithm Flowchart**: Visual representation of risk calculation
- **Category Breakdown**: Five major risk categories
- **Weight Tables**: Detailed scoring weights for each risk factor
- **Risk Levels**: Mapping from scores to Info/Low/Medium/High/Critical
- **Examples**: Real-world scenarios with score calculations

**Risk Categories**:
1. **Capability**: What the app can do (impersonation, app roles, scopes)
2. **Exposure**: Who can use it (assignments, broad reachability)
3. **Lifecycle**: App age and ownership
4. **Credential Hygiene**: Secret management (expiry, long-lived)
5. **Reply URL Anomalies**: Redirect security (non-HTTPS, wildcards)

### Schema Documentation

The schema documentation provides:
- **Structure Diagram**: Visual overview of export format
- **Node Types**: All supported node types with properties
- **Edge Types**: All relationship types with semantics
- **Validation**: JSON Schema reference
- **Examples**: Complete export examples

**Node Types**:
- ServicePrincipal, Application, User, Group
- Role, ResourceApi

**Edge Types**:
- Structural: INSTANCE_OF, OWNS, MEMBER_OF, ASSIGNED_TO
- Permission: HAS_SCOPES, HAS_APP_ROLE, CAN_IMPERSONATE, HAS_ROLE

### Web Application Documentation

The web app documentation covers:
- **User Interface**: All UI components explained
- **Screenshots**: Visual guide with annotations
- **Filter Syntax**: Complete query language reference
- **Interactions**: Mouse, touch, and keyboard controls
- **Use Cases**: Real-world investigation scenarios
- **Troubleshooting**: Common issues and solutions

**Key Features**:
- Interactive graph visualization
- Advanced filtering with property queries
- Multiple lens views (Full, Risk, Structure)
- Path-aware filtering for derived edges
- Saved query presets
- Responsive design for mobile/tablet

## Common Workflows

### Security Audit Workflow

1. **Scan Tenant** → Run `oidsee_scanner.py --tenant-id <ID>`
2. **Load Data** → Upload JSON to web app
3. **Apply Risk Lens** → Switch to Risk view
4. **Filter High Risk** → `n.risk.score>=70`
5. **Review Details** → Click on nodes to see risk reasons
6. **Verify Findings** → Check publisher verification and ownership
7. **Export Findings** → Use `generate_findings.py` to produce structured findings for tickets or audits

### Permission Review Workflow

1. **Scan Tenant** → Collect current permission grants
2. **Load Data** → Open in web app
3. **Filter by Permission** → `e.properties.scopes~Mail.ReadWrite`
4. **Check Publishers** → `n.properties.verifiedPublisher.displayName=null`
5. **Review Assignments** → Check who has access
6. **Document Findings** → Export results for review

### Credential Hygiene Workflow

1. **Scan Tenant** → Analyze all credentials
2. **Load Data** → Open in web app
3. **Find Expired** → `n.properties.credentialInsights.expired_but_present.length>0`
4. **Find Long-Lived** → `n.properties.credentialInsights.long_lived_secrets.length>0`
5. **Check Expiry** → Review certificate expiration warnings
6. **Plan Remediation** → Coordinate with app owners

### Identity Laundering Detection Workflow

1. **Scan Tenant** → Collect reply URL and branding data
2. **Load Data** → Open in web app
3. **Filter Suspects** → `n.properties.trustSignals.identityLaunderingSuspected=true`
4. **Review Domains** → Check non-aligned domains
5. **Verify Publisher** → Cross-reference with declared identity
6. **Investigate** → Deeper analysis of suspicious apps

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     OID-See System                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌────────────┐│
│  │   Scanner    │─────▶│     JSON     │─────▶│   Viewer   ││
│  │  (Python)    │      │   Export     │      │  (React)   ││
│  └──────────────┘      └──────────────┘      └────────────┘│
│         │                     │                      │       │
│         │                     │                      │       │
│    MS Graph API         Schema v1.x          vis-network    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Collection**: Scanner queries Microsoft Graph API
2. **Analysis**: Scanner computes risk scores and analyzes data
3. **Export**: Scanner generates JSON conforming to schema
4. **Validation**: JSON validated against schema
5. **Visualization**: Web app parses and renders graph
6. **Interaction**: User filters and explores data

## Best Practices

### Scanner Usage

- **Authentication**: Use device code for ad-hoc scans, client credentials for automation
- **Filtering**: Start with default filters, expand as needed
- **Frequency**: Run periodically (weekly/monthly) to track changes
- **Retention**: Keep historical exports for trend analysis

### Risk Analysis

- **Prioritize**: Focus on Critical and High risk items first
- **Context**: Consider risk reasons, not just scores
- **Verification**: Always verify publisher status
- **Ownership**: Check for proper ownership of high-risk apps

### Query Writing

- **Start Simple**: Basic filters first, then add conditions
- **Save Presets**: Save useful queries for reuse
- **Test Iteratively**: Apply filters step-by-step
- **Document**: Name complex queries clearly

### Data Management

- **Schema Compliance**: Validate exports against schema
- **Version Control**: Track schema versions in exports
- **Privacy**: Handle exports as sensitive data
- **Backup**: Store exports securely with appropriate retention

## Troubleshooting

### Common Scanner Issues

**Problem**: Authentication fails  
**Solution**: Check tenant ID, verify permissions, ensure network connectivity

**Problem**: Slow scanning  
**Solution**: Use `--max-retries` and `--retry-base-delay` to adjust throttling

**Problem**: Missing data  
**Solution**: Verify required Graph API permissions are granted

### Common Viewer Issues

**Problem**: Graph won't render  
**Solution**: Validate JSON format, check browser console for errors

**Problem**: Performance slow  
**Solution**: Filter data, use Risk/Structure lens, adjust physics settings

**Problem**: Saved presets lost  
**Solution**: Enable local storage, avoid private/incognito mode

## Findings Export

`generate_findings.py` converts an OID-See JSON export into analyst-ready finding objects.
Findings are derived **entirely** from existing scanner output and risk reason codes —
no independent scoring is performed.

### Quick Start

```bash
# JSON (default — suitable for ticketing systems and APIs)
python generate_findings.py scan-results.json findings.json

# CSV (flat rows for spreadsheets and audit evidence)
python generate_findings.py scan-results.json findings.csv

# Markdown (human-readable for reports and issue trackers)
python generate_findings.py scan-results.json findings.md

# Only include medium risk and above
python generate_findings.py scan-results.json findings.json --min-level medium

# Include all apps regardless of risk level
python generate_findings.py scan-results.json findings.json --min-level info
```

### Finding Object Fields

| Field | Description |
| --- | --- |
| `findingId` | Stable deterministic ID (`oidf-<sha256 prefix>`) |
| `displayName` | App display name |
| `appId` | Application (client) ID |
| `servicePrincipalId` | Service principal object ID |
| `publisherName` | Publisher display name |
| `verifiedPublisherId` | Verified publisher ID (null if unverified) |
| `appOwnerOrganizationId` | Tenant that registered the app |
| `appOwnership` | `1st Party`, `3rd Party`, or `Internal` |
| `riskScore` | 0–100 risk score from the scanner |
| `riskLevel` | `info`, `low`, `medium`, `high`, `critical` |
| `reasonCodes` | Array of risk reason code strings |
| `evidence` | Array of evidence blocks (one per reason code) |
| `confidence` | `high`, `medium`, or `low` |
| `recommendedAction` | Aggregated analyst guidance |
| `falsePositiveNotes` | What could make this a false positive |
| `affectedRelationships` | Inbound and outbound graph edges involving this SP |

### Affected Relationships

`affectedRelationships` collects **both inbound and outbound** graph edges involving the
service principal.  Each entry contains:

- `direction` — `"outbound"` (SP is the source) or `"inbound"` (SP is the target)
- `edgeId`, `edgeType`, `fromNodeId`, `toNodeId`
- `otherNodeId` — the node on the other end of the edge
- `otherNodeDisplayName` — display name of the other node where available
- `edgeProperties` — extra properties on the edge, when present

Inbound edges matter because several evidence-bearing relationship types terminate **at** the
service principal (e.g. `ASSIGNED_TO` for a principal assigned to an app, `OWNS` for an
owner-to-app relationship, `GOVERNS` depending on graph construction direction).

### Evidence Blocks

Each `evidence` entry contains:

- `reasonCode` — the reason code from the scanner
- `weight` — how much this reason contributed to the risk score
- `title` — short evidence title
- `summary` — what was detected
- `scannerMessage` — the exact message from the scanner
- `impact` — why this matters
- `checkNext` — analyst checklist for this specific reason
- `falsePositiveNotes` — what could make this a false positive for this specific reason

### Supported Reason Codes

The following reason codes have **explicit** evidence mappings with tailored analyst guidance:

`HAS_APP_ROLE`, `HAS_PRIVILEGED_SCOPES`, `HAS_HIGH_PRIVILEGE_PERMISSION`,
`OFFLINE_ACCESS_PERSISTENCE`, `ASSIGNED_TO`, `BROAD_REACHABILITY`,
`PRIVILEGE`, `UNVERIFIED_PUBLISHER`, `DECEPTION`, `IDENTITY_LAUNDERING`,
`MIXED_REPLYURL_DOMAINS`, `CREDENTIAL_HYGIENE`, `REPLY_URL_ANOMALIES`,
`PUBLIC_CLIENT_FLOW_RISK`, `CREATED_BEFORE_CONSENT_HARDENING`,
`CAN_IMPERSONATE`, `HAS_OWNERS_USER`, `HAS_OWNERS_SP`, `GOVERNANCE`,
`REPLYURL_OUTLIER_DOMAIN`, `CREDENTIALS_PRESENT`, `PASSWORD_CREDENTIALS_PRESENT`,
`GOVERNANCE_UNKNOWN`, `EXTERNAL_IDENTITY_POSTURE_AMPLIFIER`, `GOVERNS`.

`NO_OWNERS` is intentionally excluded — it is governance context, not a scored security risk.

Any reason code not in the list above is handled by a **fallback evidence block** that
preserves the scanner's original message (`scannerMessage`) and provides generic analyst
guidance.  This ensures the findings layer remains forward-compatible with new scanner codes
without requiring a code change.

### Programmatic Usage

```python
import json
from finding_builder import build_findings, findings_to_csv_rows, findings_to_markdown

with open("scan-results.json") as f:
    export = json.load(f)

# Build findings (default: low and above)
findings = build_findings(export)

# Medium and above only
high_findings = build_findings(export, min_risk_level="medium")

# Export as CSV rows
rows = findings_to_csv_rows(findings)

# Render as Markdown
md = findings_to_markdown(findings, tenant_display_name="Contoso", generated_at="2025-01-01T00:00:00Z")
```

## Findings Delta / Drift Report

`compare_findings.py` compares two OID-See findings exports and produces a delta report
showing what changed between scans.  This is a standalone comparison tool — it does not
touch scanner collection or scoring.

### Quick Start

```bash
# Produce a JSON delta report
python compare_findings.py previous-findings.json current-findings.json findings-delta.json

# Produce a Markdown drift report (human-readable, suitable for reports and issue trackers)
python compare_findings.py previous-findings.json current-findings.json findings-delta.md

# Produce a CSV delta table
python compare_findings.py previous-findings.json current-findings.json findings-delta.csv

# Override scan labels shown in the Markdown report header
python compare_findings.py previous-findings.json current-findings.json findings-delta.md \
    --previous-label "2025-01-01-scan" \
    --current-label  "2025-02-01-scan"
```

### Typical Workflow

```bash
# 1. Generate findings from scan 1 (earlier)
python generate_findings.py scan-jan.json findings-jan.json

# 2. Generate findings from scan 2 (later)
python generate_findings.py scan-feb.json findings-feb.json

# 3. Compare and produce a delta report
python compare_findings.py findings-jan.json findings-feb.json findings-delta.md \
    --previous-label "Jan 2025" \
    --current-label  "Feb 2025"
```

### Status Classification

Each delta entry is classified using `findingId` as the stable primary key:

| Status | Meaning |
| --- | --- |
| `new` | Present in current scan, absent in previous |
| `resolved` | Present in previous scan, absent in current |
| `unchanged` | Present in both scans with no material change |
| `changed` | Present in both but reason codes, score, level, confidence, evidence titles, or recommended action changed |
| `regressed` | Present in both and risk score or risk level worsened |
| `improved` | Present in both and risk score or risk level improved |

Risk level ordering: `critical > high > medium > low > info`

### Delta Entry Fields

| Field | Description |
| --- | --- |
| `findingId` | Stable finding ID (matches `findingId` in the findings export) |
| `displayName` | App display name |
| `appId` | Application (client) ID |
| `servicePrincipalId` | Service principal object ID |
| `status` | Classification: new / resolved / unchanged / changed / regressed / improved |
| `previousRiskScore` | Risk score from the previous scan (`null` for new findings) |
| `currentRiskScore` | Risk score from the current scan (`null` for resolved findings) |
| `previousRiskLevel` | Risk level from the previous scan |
| `currentRiskLevel` | Risk level from the current scan |
| `previousReasonCodes` | Reason codes from the previous scan |
| `currentReasonCodes` | Reason codes from the current scan |
| `addedReasonCodes` | Codes present in current but not previous (sorted) |
| `removedReasonCodes` | Codes present in previous but not current (sorted) |
| `unchangedReasonCodes` | Codes present in both scans (sorted) |
| `previousConfidence` | Confidence from the previous scan |
| `currentConfidence` | Confidence from the current scan |
| `summary` | One-line human-readable change summary |
| `analystAction` | Suggested analyst action for this status |

### Analyst Actions

| Status | Suggested Action |
| --- | --- |
| `new` (critical/high) | Review urgently and confirm whether new consent, credential, assignment, or publisher state changed |
| `new` (medium/low) | Review new finding and assess whether it requires immediate action |
| `regressed` | Compare reason code changes and validate what caused the score increase |
| `improved` | Confirm remediation was intentional and complete |
| `resolved` | Verify app removal, permission removal, or risk reduction was expected |
| `changed` | Review changed reason codes and evidence |
| `unchanged` | No action required |

### Markdown Report Sections

The Markdown report contains the following sections:

1. **Summary** — counts by status and counts by current risk level
2. **New Findings** — full detail for each new finding
3. **Regressed Findings** — score/level changes for worsened findings
4. **Improved Findings** — score/level changes for improved findings
5. **Resolved Findings** — previous risk detail for resolved findings
6. **Changed Findings** — added/removed reason codes and confidence changes
7. **Unchanged Findings** — collapsed summary table (one row per finding)

### Programmatic Usage

```python
import json
from findings_diff import compare_findings, delta_to_markdown

# Load two findings exports
with open("findings-jan.json") as f:
    previous = json.load(f)

with open("findings-feb.json") as f:
    current = json.load(f)

# Compare
delta = compare_findings(previous, current)

# JSON output
with open("delta.json", "w") as f:
    json.dump(delta, f, indent=2)

# Markdown output
with open("delta.md", "w") as f:
    f.write(delta_to_markdown(delta, "Jan 2025", "Feb 2025"))

# Filter to regressions only
regressions = [e for e in delta if e["status"] == "regressed"]

# Count by status
by_status = {}
for entry in delta:
    by_status[entry["status"]] = by_status.get(entry["status"], 0) + 1
```

## Support Resources

### Documentation

- **This Index**: Overview and navigation
- **Component Docs**: Detailed guides for each component
- **README**: Project overview in repository root

### Code Examples

- **Sample Data**: `/src/samples/` directory
- **Test Cases**: `/tests/` directory
- **Schema Examples**: In schema documentation

### Community

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share insights
- **Pull Requests**: Contribute improvements

## Glossary

**Service Principal**: Instance of an application in a tenant  
**Application**: App registration defining identity and permissions  
**Delegated Permission**: Permission granted on behalf of signed-in user  
**Application Permission**: Permission granted to app itself (app role)  
**Reply URL**: Redirect URI for OAuth2 flow  
**eTLD+1**: Registrable domain (e.g., contoso.com from app.contoso.com)  
**Identity Laundering**: Using misleading domains to appear legitimate  
**Impersonation**: Acting as a signed-in user  
**Persistence**: Maintaining access via refresh tokens  
**Lens**: View filter (Full/Risk/Structure)  
**Path-aware**: Including constituent edges of derived paths

## Version History

**v1.x (Current)**
- Initial documentation release
- Complete scanner, scoring, schema, and web app guides
- Mermaid diagrams for visual clarity
- Comprehensive examples and use cases
- Updated for v1.1.1 scanner intelligence improvements (MS permissions tiering and offline first-party fallback)
- Added BloodHound OpenGraph output and conversion documentation

For detailed version history, see:
- **[CHANGELOG.md](../CHANGELOG.md)** - Complete list of changes by version
- **[RELEASE_NOTES.md](../RELEASE_NOTES.md)** - Detailed release documentation

---

**Maintained by**: OID-See Project Contributors  
**License**: See repository LICENSE file  
**Last Updated**: April 16, 2026

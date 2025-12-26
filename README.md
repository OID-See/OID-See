
# OID-See

**Visualize and assess security risks in your Microsoft Entra ID tenant's third-party and multi-tenant applications.**

OID-See is a comprehensive security analysis tool for Microsoft Entra ID (Azure AD) that helps you discover, analyze, and visualize risky third-party applications. The scanner collects data using Microsoft Graph, performs optional enrichment, and generates an interactive graph visualization that runs entirely in your browser—no telemetry, no servers, completely private.

## 🎯 What is OID-See?

OID-See provides:
- **Scanner**: Python tool that queries Microsoft Graph to collect application and permission data from your tenant
- **Enrichment**: Optional DNS, RDAP, and WHOIS lookups to identify outliers and reduce false positives  
- **Visualization**: Browser-based interactive graph viewer for exploring relationships and risks
- **Risk Scoring**: Automated security assessment based on permissions, exposure, governance, and credential hygiene

**Perfect for**: Security teams, IT administrators, and compliance officers who need to understand third-party application risks in their Entra ID tenant.

## 🚀 Quick Start

### 1. Scan Your Tenant

```bash
# Install dependencies
pip install -r requirements.txt

# Run scanner (interactive device code authentication)
python oidsee_scanner.py --tenant-id "YOUR_TENANT_ID" --out scan-results.json

# With enrichment enabled (requires dnspython and ipwhois packages)
python oidsee_scanner.py --tenant-id "YOUR_TENANT_ID" --out scan-results.json
```

### 2. Visualize Results

Open the OID-See web app at your deployment URL (or run locally with `npm run dev`), then:
1. Click **Upload JSON** and select your `scan-results.json` file
2. Use the **Risk** lens to focus on high-risk applications
3. Filter by risk score: `n.risk.score>=70`
4. Click nodes to see detailed risk analysis

### 3. Take Action

Review high-risk applications and:
- Verify publisher identity and permissions
- Check for unverified publishers or identity laundering
- Review credential hygiene and long-lived secrets
- Ensure proper ownership and governance

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

- **[Documentation Index](./docs/README.md)** - Start here for navigation
- **[Scanner Guide](./docs/scanner.md)** - How to collect tenant data using Microsoft Graph
- **[Scoring Logic](./docs/scoring-logic.md)** - Understanding risk assessment methodology
- **[Schema Reference](./docs/schema.md)** - Export format specification and field descriptions
- **[Web App Guide](./docs/web-app.md)** - Using the browser-based visualization tool

## Primary Schema: OID-See Graph Export v1.x

This repo includes the full JSON Schema at `schemas/oidsee-graph-export.schema.json`.

**Data Sources**:
- **Core Data**: Microsoft Graph provides identity and permissions data (service principals, applications, users, groups, OAuth grants, role assignments)
- **Optional Enrichment**: DNS, RDAP, and IP WHOIS lookups identify domain ownership patterns and reduce false positives (can be disabled with CLI flags)

### Features
- **Interactive Graph Visualization**: Explore relationships between service principals, applications, users, and permissions
- **Risk Scoring**: Automatic risk assessment based on permissions, exposure, governance, and security hygiene
- **Browser-Only Processing**: All visualization happens in your browser—no data is uploaded to any server, no telemetry
- **Security Heuristics**: 
  - **Identity Laundering Detection**: Detects applications with reply URLs from domains not aligned with declared identity (reduced false positives via optional enrichment)
  - **Credential Hygiene Analysis**: Identifies long-lived secrets, expired credentials, and certificate rollover issues
  - **Reply URL Security**: Flags non-HTTPS, IP literals, punycode domains, and wildcard domains in redirect URIs
  - **Permission Resolution**: Human-readable OAuth2 scope and app role descriptions
  - **Brokered Authentication**: Recognizes mobile broker schemes (msauth://, ms-app://, brk-*://) and other custom schemes
- **Advanced Filtering**: Filter nodes and edges using a powerful query syntax
- **Multiple Lenses**: View full graph, risk-focused, or structural relationships

### Minimal example
```json
{
  "format": { "name": "oidsee-graph", "version": "1.0" },
  "generatedAt": "2025-01-01T00:00:00Z",
  "tenant": { "tenantId": "00000000-0000-0000-0000-000000000000" },
  "nodes": [{ "id": "n1", "type": "User", "displayName": "Alice", "properties": {} }],
  "edges": []
}
```

## Development
```bash
npm install
npm run dev
```

### Running Tests
The test suite is located in the `tests/` directory. To run the tests:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run individual test files
python3 tests/test_schema_validation.py
python3 tests/test_approle_uniqueness.py

# Or run from within the tests directory
cd tests
python3 test_integration_e2e.py
```

## Deploy to Netlify
1. Push to GitHub
2. Netlify → **New site from Git**
3. `netlify.toml` handles build + publish


## Filtering (property query)

Use the filter box above the graph. Clauses are space-separated.

Prefix clauses with:
- `n.` for node
- `e.` for edge

Operators:
- `=` equals, `!=` not equals
- `~` contains, `!~` not contains
- `> >= < <=` numeric comparisons
- `?` exists (or just a bare path)

Examples:
- `n.type=User`
- `e.type!=INSTANCE_OF`
- `e.properties.scopes~offline_access`
- `n.risk.score>=70`
- `n.properties.appId?`
- `n.displayName~"Contoso Portal"`

Clauses evaluate against your raw export objects (node/edge), so you can filter on any property you emit.


## Lenses

Use the lens switch above the graph:

- **Full**: show everything
- **Risk**: privilege/abuse edges only (e.g. HAS_SCOPE, HAS_ROLE, derived paths)
- **Structure**: structural edges only (e.g. INSTANCE_OF, MEMBER_OF, OWNS)

## Path-aware filtering

When enabled, if a *derived* edge matches your filter (e.g. EFFECTIVE_IMPERSONATION_PATH),
OID-See will also include the underlying `derived.inputs` edges so the path remains explainable.

## Saved queries

Save/load/delete filter queries locally (stored in `localStorage`).

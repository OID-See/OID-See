
<p align="center">
  <img src="public/icons/oidsee_logo.png" alt="OID-See Logo" width="400">
</p>

# OID-See

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/OID-See/OID-See)
[![License](https://img.shields.io/badge/license-Apache%202.0-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-stable-brightgreen.svg)](RELEASE_NOTES_v1.0.md)

**Visualize and assess security risks in your Microsoft Entra ID tenant's third-party and multi-tenant applications.**

OID-See is a comprehensive security analysis tool for Microsoft Entra ID (Azure AD) that helps you discover, analyze, and visualize risky third-party applications. The scanner collects data using Microsoft Graph, performs optional enrichment, and generates an interactive graph visualization that runs entirely in your browser—no telemetry, no servers, completely private.

## 🚀 Version 1.1.0 — Large Tenant Performance Overhaul!

OID-See v1.1.0 is a major performance release focused on real-world tenant scale (30k+ nodes, 50k+ edges) and mobile browser reliability:

- ✅ **Web Worker Architecture**: All JSON parsing, filtering, and graph conversion moved off the main thread — UI never blocks
- ✅ **Input Panel Removed**: No more paste/Render workflow; load directly from file or sample
- ✅ **iOS Safari Support**: Graph tab safely disabled on iOS (WebKit OOM protection); all other views work fully
- ✅ **Lazy Graph Loading**: vis-network canvas only initialised when the Graph tab is actually opened
- ✅ **30k+ Node Scale**: Table, Tree, Matrix and Dashboard views handle full tenant exports with no truncation

[📖 Read the full v1.1.0 Release Notes →](RELEASE_NOTES_v1.1.md)

## 🔧 Version 1.0.1 Released!

OID-See v1.0.1 is a maintenance release that fixes critical accuracy and performance issues, plus inverts the ownership scoring model:

- ✅ **Ownership Scoring Inversion**: Ownership now treated as a risk factor (based on Glenn Van Rymenant's analysis) rather than security control
- ✅ **Accurate App Assignment Enumeration**: Fixed incorrect user count approximations by fetching actual transitive member counts
- ✅ **Graph View Performance**: Eliminated 7-second load delays and slow view switching (700-7000ms → <100ms)
- ✅ **Button State Fix**: Resolved graph view button getting stuck in loading state

[📖 Read the full v1.0.1 Release Notes →](RELEASE_NOTES_v1.0.1.md)

## 🎉 Version 1.0 - Production Ready!

OID-See v1.0 introduces intelligent **Entra Role Tiering** and **Privileged Scope Classification** for production-grade security analysis:

- ✅ **Role Tiering**: Differentiates Tier 0 (Global Admin) from Tier 2 (Security Reader) - 6x risk differential
- ✅ **Scope Analysis**: Identifies ReadWrite.All (near-admin), Action scopes (state-changing), and .All patterns
- ✅ **Explainable Security**: Detailed tier breakdowns and scope classifications in every risk score
- ✅ **Production Ready**: Metadata-driven architecture, comprehensive testing, zero vulnerabilities

[📖 Read the full v1.0 Release Notes →](RELEASE_NOTES_v1.0.md)

## 🎯 What is OID-See?

OID-See provides:
- **Scanner**: Python tool that queries Microsoft Graph to collect application and permission data from your tenant
- **Enrichment**: Optional DNS, RDAP, and WHOIS lookups to identify outliers and reduce false positives  
- **HTML Report**: Executive summary with risk distribution, tier exposure, key metrics, and actionable recommendations
- **Visualization**: Browser-based interactive graph viewer for exploring relationships and risks
- **Risk Scoring**: Automated security assessment based on role tiers, scope privileges, permissions, exposure, governance, and credential hygiene

**Perfect for**: Security teams, IT administrators, and compliance officers who need to understand third-party application risks in their Entra ID tenant.

## 🚀 Quick Start

### 1. Scan Your Tenant

```bash
# Install dependencies
pip install -r requirements.txt

# Run scanner with interactive browser authentication (most user-friendly)
python oidsee_scanner.py --tenant-id "YOUR_TENANT_ID" --auth-method interactive-browser --out scan-results.json

# Run scanner with Azure CLI authentication (fastest for developers)
az login
python oidsee_scanner.py --tenant-id "YOUR_TENANT_ID" --auth-method azure-cli --out scan-results.json

# Run scanner with default credential chain (flexible)
python oidsee_scanner.py --tenant-id "YOUR_TENANT_ID" --auth-method default --out scan-results.json

# Run scanner with client secret authentication (non-interactive)
python oidsee_scanner.py --tenant-id "YOUR_TENANT_ID" --auth-method client-secret --client-id "YOUR_CLIENT_ID" --client-secret "YOUR_CLIENT_SECRET" --out scan-results.json

# Generate both JSON export and HTML report
python oidsee_scanner.py --tenant-id "YOUR_TENANT_ID" --auth-method interactive-browser --generate-report --out scan-results.json

# With enrichment enabled (requires dnspython and ipwhois packages)
python oidsee_scanner.py --tenant-id "YOUR_TENANT_ID" --auth-method interactive-browser --out scan-results.json
```

#### Authentication Methods

OID-See supports multiple authentication methods:

| Method | Description | Best For |
|--------|-------------|----------|
| `interactive-browser` | Opens system's default browser for authentication (recommended for most users) | Standard desktop use |
| `azure-cli` | Uses existing Azure CLI login session | Developers who use az login |
| `default` | Tries multiple credential methods in sequence (environment variables → managed identity → Azure CLI → interactive browser) | Flexible development |
| `client-secret` | Uses client ID and client secret (service principal) | Non-interactive automation |
| `device-code` | Uses device code flow for SSH/limited UI environments | Legacy or restricted environments |

### 2. Review the Report (Optional)

If you used `--generate-report`, open `scan-results-report.html` in your browser to see:
- Risk distribution across your tenant
- **Privilege Tier Exposure** (NEW in v1.0) - Tier 0/1/2 role reachability
- Top risk contributors and security metrics
- List of high-risk applications requiring attention
- Actionable security recommendations prioritized by tier and scope risk

### 3. Visualize Results

Open the OID-See web app at **https://oid-see.netlify.app/** (or run locally with `npm run dev`), then:
1. Click **Upload JSON** and select your `scan-results.json` file
2. Choose your preferred view mode:
   - **Graph View**: Interactive network visualization (best for < 1,000 nodes)
   - **Table View**: High-performance tabular view with virtual scrolling (handles 50,000+ nodes)
   - **Tree View**: Hierarchical organization by node type with risk aggregation
   - **Matrix View**: Heat map of relationships between node types
   - **Dashboard View**: Statistical summary and key metrics
3. Use the **Risk** lens to focus on high-risk applications
4. Filter by risk score: `n.risk.score>=70`
5. Click nodes to see detailed risk analysis

**For large datasets (10,000+ nodes)**, start with Dashboard View for an overview, then use Table View to search and filter, and finally visualize specific subsets in Graph View. See [Visualization Modes Documentation](./docs/visualization-modes.md) for details.

### 4. Take Action

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
- **[Visualization Modes](./docs/visualization-modes.md)** - Alternative views for large datasets (Table, Tree, Matrix, Dashboard)

## 📊 HTML Report Generation

OID-See can generate comprehensive HTML reports that provide an executive summary of your security posture:

![OID-See Report Screenshot](https://github.com/user-attachments/assets/ca1ad5b8-f582-4800-bf5a-45fe5d0b4904)

**Report Features**:
- **Risk Distribution**: Visual breakdown of applications by risk level (Critical, High, Medium, Low, Info)
- **Key Security Metrics**: Unverified publishers, apps without owners, credential hygiene issues, and more
- **Top Risk Contributors**: Most common risk factors across all applications
- **High-Risk Applications**: Prioritized list of applications requiring immediate attention
- **Capability Analysis**: Detailed breakdown of permissions and capabilities
- **Actionable Recommendations**: Security best practices tailored to your findings

Generate a report alongside your scan:
```bash
python oidsee_scanner.py --tenant-id "YOUR_TENANT_ID" --generate-report --out scan.json
```

Or generate from an existing export:
```bash
python report_generator.py scan.json report.html
```

## Primary Schema: OID-See Graph Export v1.x

This repo includes the full JSON Schema at `schemas/oidsee-graph-export.schema.json`.

**Data Sources**:
- **Core Data**: Microsoft Graph provides identity and permissions data (service principals, applications, users, groups, OAuth grants, role assignments)
- **Optional Enrichment**: DNS, RDAP, and IP WHOIS lookups identify domain ownership patterns and reduce false positives (can be disabled with CLI flags)

### Features
- **Multiple Visualization Modes**: Choose from Graph, Table, Tree, Matrix, or Dashboard views optimized for different use cases and dataset sizes
- **Interactive Graph Visualization**: Explore relationships between service principals, applications, users, and permissions
- **High-Performance Table View**: Virtual scrolling handles 50,000+ nodes with instant search and filtering
- **Hierarchical Tree View**: Organize by type with lazy loading and risk aggregation
- **Matrix Heat Map**: Visual relationship patterns and risk distribution between node types
- **Dashboard Analytics**: Statistical summaries, top risks, and critical path identification
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
- **Subset Visualization**: Select and visualize specific node subsets with size constraints for optimal performance

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

## 📝 Changelog & Release Notes

For detailed information about changes and releases:
- **[CHANGELOG.md](CHANGELOG.md)** - Complete version history and changes
- **[RELEASE_NOTES_v1.0.1.md](RELEASE_NOTES_v1.0.1.md)** - v1.0.1 maintenance release details
- **[RELEASE_NOTES_v1.0.md](RELEASE_NOTES_v1.0.md)** - v1.0.0 major release details
- **[RELEASE_NOTES.md](RELEASE_NOTES.md)** - Historical release documentation

## ⚡ Performance & Architecture

OID-See uses modern web technologies to handle large datasets efficiently:

### Web Workers for Responsive UI

Heavy computational tasks run in dedicated web workers to keep the UI responsive:

- **File Reading & JSON Parsing**: Large files are read and parsed off the main thread using `FileReaderSync`
- **Filtering Operations**: Query processing and filtering can handle thousands of nodes without blocking
- **Layout Computation**: Graph layout calculations run in background workers
- **Risk Analysis**: Statistics and risk computation execute in parallel

See [`src/workers/README.md`](src/workers/README.md) for detailed worker architecture documentation.

### Optimized Data Processing

- **Batch Processing**: Large datasets are processed in batches with progress tracking
- **Incremental Loading**: Dashboard and alternative views load first, graph view processes in background
- **Cancellable Operations**: Long-running tasks can be cancelled by the user
- **Progressive Enhancement**: UI remains interactive even during heavy computation

### Scalability

- **Graph View**: Optimized for up to 3,000 nodes with automatic truncation for larger datasets
- **Table View**: Virtual scrolling handles 50,000+ nodes efficiently
- **Dashboard View**: Statistical summaries load instantly regardless of dataset size
- **Worker Pool**: Parallel processing using multiple CPU cores when available

## Deploy to Netlify

**Official Deployment**: The OID-See visualizer is hosted at **https://oid-see.netlify.app/**

To deploy your own instance:
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

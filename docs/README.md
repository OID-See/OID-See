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

## Quick Start

### For Security Analysts

Start here to analyze your tenant:

1. **Generate Data**: Follow the [Scanner Documentation](./scanner.md) to collect tenant data
2. **Understanding Risk**: Read [Scoring Logic](./scoring-logic.md) to interpret risk scores
3. **Visualize**: Use the [Web App Guide](./web-app.md) to explore your data at **https://oid-see.netlify.app/**
4. **Query**: Learn filter syntax to find specific security issues

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
7. **Export Findings** → Save filtered results

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

For detailed version history, see:
- **[CHANGELOG.md](../CHANGELOG.md)** - Complete list of changes by version
- **[RELEASE_NOTES.md](../RELEASE_NOTES.md)** - Detailed release documentation

---

**Maintained by**: OID-See Project Contributors  
**License**: See repository LICENSE file  
**Last Updated**: December 26, 2024

# Release Notes - OID-See v1.0.0

## 🎉 Production Release - January 5, 2026

We are thrilled to announce OID-See v1.0, the first production-ready release! This milestone introduces a comprehensive Entra directory role tiering system, privileged scope classification framework, and metadata-driven risk scoring that dramatically improves security visibility in Microsoft 365 and Entra ID environments.

## What is OID-See?

OID-See is a security analysis tool that visualizes and scores OAuth/OIDC relationships in Microsoft 365 and Entra ID tenants. It helps security teams identify risky service principals, detect privilege escalation paths, and understand their identity attack surface.

## Why v1.0 Matters

Previous versions treated all directory roles equally and missed critical privilege patterns. v1.0 introduces:

✅ **Intelligent Role Tiering**: Differentiates between existential threats (Global Admin), blast radius risks (Application Admin), and operational roles (Security Reader)

✅ **Sophisticated Scope Analysis**: Identifies near-admin permissions (ReadWrite.All), state-changing operations (Action scopes), and overly broad grants (.All patterns)

✅ **Production-Ready Architecture**: Metadata-driven approach ensures schema stability and reduces upgrade complexity

✅ **Explainable Security**: Every risk score includes detailed breakdowns showing which tiers and scopes contribute to risk

## Key Features

### 🎯 Entra Role Tiering System

**Three-Tier Risk Model**

- **Tier 0 - Horizontal/Global Control** (🔴 Red)
  - Roles that control identity, authentication, or policy for entire tenant
  - Examples: Global Administrator, Privileged Role Administrator, Security Administrator
  - Risk impact: **6x higher** than Tier 2 roles
  - Scoring: Base 15 + 25 per role, max 75

- **Tier 1 - Vertical/Critical Services** (🟠 Orange)
  - Roles controlling critical workloads or platforms
  - Examples: Cloud Application Administrator, Application Administrator
  - Risk impact: **2x higher** than Tier 2 roles
  - Scoring: Base 8 + 10 per role, max 40

- **Tier 2 - Scoped/Operational** (🟡 Yellow)
  - Roles scoped to specific services with limited blast radius
  - Examples: Security Reader, Reports Reader, License Administrator
  - Scoring: Base 3 + 3 per role, max 15

**Coverage**: 27 Entra role template IDs mapped to tiers

**Explainability**: Risk reasons include:
- `rolesReachableTier0/1/2`: Counts of reachable roles by tier
- `tierBreakdown`: Array showing top roles per tier with display names
- `tierLabel`: Human-readable tier descriptions for UI display

### 🔒 Privileged Scope Classification

**Priority-Based Classification System**

1. **ReadWrite.All** (Weight 30, 🔴 Critical)
   - Near-admin level permissions requiring directory-wide write access
   - Examples: `Directory.ReadWrite.All`, `User.ReadWrite.All`, `Group.ReadWrite.All`
   - Recommendation: Replace with least-privilege alternatives

2. **Action Privileged** (Weight 25, 🟠 High)
   - State-changing operations with deterministic pattern matching
   - Patterns: `.action`, `.manage.`, `.send.`, `.accessasuser.all`, `.full_access`, `.importexport`, `.backup`, `.restore`, `.update`, `.delete`
   - Examples: `Application.ReadWrite.Action`, `User.Manage.All`
   - Recommendation: Review necessity; ensure proper governance

3. **Too Broad** (Weight 15, 🟡 Medium)
   - Permissions ending with `.All` enabling mass enumeration
   - Examples: `Mail.Read.All`, `Files.Read.All`
   - Recommendation: Consider scoped alternatives when possible

4. **Write Privileged** (Weight 20, 🟡 Medium-High)
   - Write or ReadWrite permissions without .All
   - Examples: `User.Write`, `Group.ReadWrite`
   - Recommendation: Validate necessity of write access

5. **Regular** (Weight 0, ⚪ Normal)
   - Standard read-only permissions
   - Examples: `User.Read`, `Calendars.Read`

**Architecture**: Metadata-based approach using `HAS_SCOPES` edge type with properties:
- `scopeRiskClass`: Classification label
- `scopeRiskWeight`: Numeric risk weight
- `isAllWildcard`: Boolean for .All pattern detection

**Benefits**:
- Schema stability (no new edge types)
- Runtime extensibility (patterns in config)
- Backward compatibility (existing edges work)

### 📊 Viewer Enhancements

**Dashboard - Privilege Tier Exposure**

New visual section showing:
- Service principal counts by tier with color-coded cards
- Total role assignments per tier
- Tier descriptions and security implications
- Responsive layout (3-column desktop, 1-column mobile)

**Details Panel Improvements**

When selecting a service principal:
- Tier breakdown with color-coded badges
- Top Tier 0 roles list (critical attention)
- Scope privilege breakdown (ReadWrite.All, Action, .All counts)
- Risk contributor details with scope classifications

**Preset Queries**

Nine new queries for quick filtering:
- "Has Tier 0 Roles" - Critical service principals
- "ReadWrite.All Scopes" - Near-admin permissions
- "Action Scopes" - State-changing operations
- "Tier 0/1/2 Roles" - Role node filtering
- "Privileged Scopes" - Any privileged scope pattern

### 📈 HTML Report Generator

**New Tier Exposure Section**

Visual report includes:
- Tier overview cards with metrics and descriptions
- Top Tier 0 role assignments table
- Security implications by tier
- ReadWrite.All and Action scope summaries

**Enhanced Recommendations**

Prioritized action items:
- 🔴 **Critical**: Tier 0 role reachability
  - "Reduce Tier 0 role reachability; review app assignments/grants; consider Conditional Access, Privileged Identity Management, or access reviews"
- 🟠 **High**: ReadWrite.All scopes
  - "Replace with least-privilege scopes; review necessity; consider application roles with constrained permissions"
- 🟠 **High**: Action scopes
  - "Review Action-style permissions for state-changing operations; ensure proper governance"

## Technical Improvements

### Configuration-Driven Architecture

**scoring_logic.json Enhancements**
- `role_tiering` section with tier definitions and template ID mappings
- `scope_classifications` with `risk_weight` and `patterns` arrays
- Action patterns moved from code to config for extensibility

**Benefits**:
- No code changes required to add new patterns
- Consistent scoring across scanner, viewer, and report
- Easy tuning of weights for organizational policies

### Scanner Improvements

**New Helper Functions**
- `get_role_tier(template_id)`: Lookup tier for any Entra role
- `get_tier_config(tier)`: Retrieve tier configuration
- `classify_scopes(scopes)`: Priority-based classification with metadata

**Enhanced Risk Calculation**
- `compute_risk_for_sp()` now tier-aware with role definitions
- Single `HAS_PRIVILEGED_SCOPES` contributor (unified approach)
- Max scope risk calculation across all resources

**Edge Enrichment**
- Scope edges include `scopeRiskClass`, `scopeRiskWeight`, `isAllWildcard`
- Role nodes include `tier`, `tierLabel` properties
- Backward compatible with existing exports

### Viewer Architecture

**TypeScript Type Safety**
- Edge type enums updated (removed HAS_READWRITE_ALL_SCOPES, HAS_PRIVILEGED_ACTION_SCOPES)
- Preset queries use metadata filtering (`e.properties.scopeRiskClass`)
- Consistent with backend schema

**CSS Improvements**
- Tier card styling with color gradients
- Proper text wrapping for long descriptions
- Full-width dashboard sections
- Responsive breakpoints for mobile

## Testing & Quality

### Test Coverage

**New Test Suite** (`test_tier_scoring.py`)
- Role tier mapping validation
- Tier config retrieval tests
- Scope classification priority verification
- Tier-based weight calculation tests
- Unified scope risk scoring tests

**Results**: 6 test functions, 100% pass rate

### Security Validation

**CodeQL Analysis**: 0 vulnerabilities
- Python: 0 alerts
- JavaScript/TypeScript: 0 alerts

**Build Validation**: All builds pass
- TypeScript/Vite compilation: ✅
- Python syntax checks: ✅
- CSS/SCSS validation: ✅

### Performance

**No Degradation**
- Metadata-based edges avoid schema bloat
- Config-driven patterns enable runtime flexibility
- Tier lookups use O(1) dictionaries

## Upgrade Guide

### For Existing Users

**Good News**: v1.0 is backward compatible!

1. **Existing Exports**: Work without modification
   - Old edge types still supported
   - Risk scores recalculated with new logic

2. **New Scans**: Automatically include tier metadata
   - Role nodes enriched with tier properties
   - Scope edges include risk classification

3. **Configuration**: Optional tuning
   - Adjust tier weights in `scoring_logic.json`
   - Add custom action patterns to config

### Recommended Actions

1. **Re-scan your tenant** to populate tier metadata
2. **Review Tier 0 exposure** in dashboard
3. **Examine ReadWrite.All scopes** using preset queries
4. **Update documentation** for your security team

## Breaking Changes

**None**. This release is fully backward compatible.

## Known Limitations

1. **Role Tiering**: Covers 27 most common Entra roles
   - Unknown roles fall back to legacy scoring (base: 10, per_role: 5, max: 30)
   - Custom roles not yet tier-classified

2. **Action Patterns**: Based on common OAuth2/Graph patterns
   - May not cover all proprietary API scopes
   - Extensible via `scoring_logic.json`

3. **PIM Integration**: Direct role assignments only
   - Eligible (PIM) assignments not yet detected
   - Planned for future release

## Migration Path

### From private-beta-2 to v1.0

No migration required. Simply:
1. Update to v1.0
2. Run new scan (optional but recommended)
3. Enjoy enhanced risk visibility

### From earlier versions

If using pre-beta versions:
1. Review `scoring_logic.json` format changes
2. Update any custom scoring configurations
3. Re-scan tenant for full tier metadata

## Community & Support

### Getting Help

- **Documentation**: See `README.md` and `docs/` directory
- **Issues**: Report bugs via GitHub Issues
- **Security**: Email security@oid-see.io for vulnerabilities

### Contributing

We welcome contributions! Areas of interest:
- Additional Entra role mappings
- Action pattern libraries
- Visualization improvements
- Documentation enhancements

### Acknowledgments

Special thanks to:
- @goldjg for comprehensive security architecture review
- Early beta testers for real-world validation
- Merill Fernando for Microsoft Apps feed integration
- Microsoft Graph team for API documentation

## Conclusion

OID-See v1.0 represents a significant milestone in identity security tooling. By intelligently distinguishing between privilege levels and permission patterns, organizations can now focus their security efforts where they matter most: protecting Tier 0 assets and eliminating near-admin permissions.

---

**Release Date**: January 5, 2026  
**Version**: 1.0.0  
**License**: Apache 2.0  
**Repository**: https://github.com/OID-See/OID-See

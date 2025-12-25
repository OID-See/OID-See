# Scanner and Scoring Logic Implementation Summary

## Overview
This document summarizes the implementation of scanner enhancements and scoring logic updates for the OID-See project, focusing on improved security analysis capabilities and schema alignment.

## Key Changes

### 1. Scanner Enhancements (`oidsee_scanner.py`)

#### Wildcard URL Detection
- **Function**: Enhanced `analyze_reply_urls()` to detect wildcard domains
- **Detection**: Identifies URLs containing `*` character (e.g., `https://*.contoso.com/callback`)
- **Risk**: Wildcard URLs can match any subdomain, increasing redirect URI attack surface
- **Output**: Adds `wildcard_urls` list to reply URL analysis results

#### Public Client and Implicit Flow Indicators
- **Function**: New `analyze_public_client_indicators()` function
- **Analyzes**:
  - Public client flows (native/mobile apps that cannot securely store secrets)
  - Implicit flow grants (access token and/or ID token issuance)
  - SPA redirect URIs
  - Fallback to default client settings
- **Risk Indicators**:
  - `PUBLIC_CLIENT_FLOWS_ENABLED`: Public client redirect URIs configured
  - `IMPLICIT_FLOW_ENABLED`: Implicit grant settings enabled
  - `IMPLICIT_ACCESS_TOKEN_ISSUANCE`: Access token via implicit flow
  - `IMPLICIT_ID_TOKEN_ISSUANCE`: ID token via implicit flow
  - `SPA_REDIRECT_URIS_CONFIGURED`: Single-page app redirect URIs

#### Removed resolvedScopes
- **Change**: Eliminated `resolvedScopes` field from scope edge properties
- **Rationale**: Scope resolution details are not needed in the edge; scope values alone are sufficient
- **Impact**: Cleaner edge structure, reduced data duplication

#### Optional Enrichment CLI Flags
- **Flags Added**:
  - `--enable-dns-enrichment`: Enable DNS lookups for reply URL domains
  - `--enable-rdap-enrichment`: Enable RDAP (Registry Data Access Protocol) lookups
  - `--enable-ipwhois-enrichment`: Enable IP WHOIS lookups for IP literals
- **Design**: Flags are placeholders; enrichment implementation is optional and non-blocking
- **Philosophy**: Graph-first approach with optional network enrichment

### 2. Scoring Logic Updates (`scoring_logic.json`)

#### ASSIGNED_TO Gating
```json
"ASSIGNED_TO": {
  "reachable_users_thresholds": [
    {"threshold": 100, "weight": 25},
    {"threshold": 20, "weight": 15},
    {"threshold": 5, "weight": 10},
    {"threshold": 0, "weight": 5}
  ]
}
```
- **Gating**: Weight now varies based on assignment count thresholds
- **Rationale**: More assignments = higher risk exposure
- **Details**: If app doesn't require assignment, BROAD_REACHABILITY applies instead

#### DECEPTION Verification Context
```json
"DECEPTION": {
  "weight": 20,
  "description": "Unverified publisher with name mismatch",
  "details": "Applied when publisher is unverified AND there is a significant mismatch..."
}
```
- **Enhancement**: Added verification context explanation
- **Check**: Requires both unverified publisher AND name mismatch

#### REPLY_URL_ANOMALIES - Wildcard Detection
```json
"REPLY_URL_ANOMALIES": {
  "wildcard_weight": 15,
  "wildcard_description": "Wildcard domains in reply URLs"
}
```
- **New Rule**: Detects wildcard domains in reply URLs
- **Weight**: 15 points (higher than punycode, equal to implicit flow)
- **Rationale**: Wildcards significantly expand attack surface

#### PUBLIC_CLIENT_FLOW_RISK
```json
"PUBLIC_CLIENT_FLOW_RISK": {
  "public_client_weight": 12,
  "public_client_description": "Public client flows enabled (native/mobile apps)",
  "implicit_flow_weight": 15,
  "implicit_flow_description": "Implicit flow enabled (access token or ID token issuance)"
}
```
- **New Rule**: Assesses risk from public client and implicit flow configurations
- **Weights**:
  - Public client: 12 points
  - Implicit flow: 15 points (higher due to token exposure risk)
- **Rationale**: Public clients and implicit flow cannot use client secrets, relying solely on redirect URIs for security

#### OFFLINE_ACCESS_PERSISTENCE
- **Existing Rule**: Confirmed to map only to persistence risk (refresh tokens)
- **Weight**: 8 points
- **Not**: Treated as impersonation (which requires explicit markers)

### 3. Schema Updates (`oidsee-graph-export.schema.json`)

#### New ServicePrincipal Properties
```json
"replyUrlAnalysis": {
  "type": ["object", "null"],
  "description": "Analysis of reply URLs including security flags..."
}
```
- **Fields Added**:
  - `replyUrlAnalysis`: Security analysis results (wildcards, non-HTTPS, IP literals, etc.)
  - `replyUrlEnrichment`: Optional enrichment data (DNS, RDAP, IPWHOIS)
  - `replyUrlProvenance`: Provenance metadata (source, timestamps, enrichment status)
  - `publicClientIndicators`: Public client flow analysis results

- **Null Handling**: All new fields accept `null` for optional/unavailable data

#### Removed Fields
- **resolvedScopes**: No longer included in edge properties
- **Impact**: Schema validates exports without this field

### 4. Test Coverage

#### New Test Files
1. **test_wildcard_and_public_client.py**
   - Wildcard URL detection (4 test cases)
   - Public client indicators (6 test cases)
   - Scoring configuration validation (6 test cases)

2. **test_schema_validation.py**
   - Schema validation with new fields
   - Validation without resolvedScopes
   - JSON schema compliance

3. **test_integration_e2e.py**
   - Wildcard URL risk scoring integration
   - Public client risk scoring integration
   - Combined scenario with multiple risk factors
   - Demonstrates risk score elevation

#### Test Results
- **All Tests Pass**: 100% pass rate across all test suites
- **Total Test Cases**: 30+ test cases covering new and existing functionality
- **Coverage**: Unit tests, schema validation, and end-to-end integration

## Risk Scoring Examples

### Example 1: Wildcard URLs
```
App: https://*.contoso.com/callback
Risk: +15 points (REPLY_URL_ANOMALIES - wildcard)
Reason: Wildcard can match any subdomain, expanding attack surface
```

### Example 2: Public Client + Implicit Flow
```
App: Native mobile app with implicit flow enabled
Risk: +12 (public client) + 15 (implicit flow) = +27 points
Reason: Cannot securely store secrets, tokens exposed to client
```

### Example 3: Combined Scenario
```
App: Unverified publisher, wildcard URLs, public client, no owners, broad reach
Risk Score: 100 (critical)
Contributors:
  - REPLY_URL_ANOMALIES (wildcard): 15
  - PUBLIC_CLIENT_FLOW_RISK: 27
  - UNVERIFIED_PUBLISHER: 6
  - NO_OWNERS: 15
  - BROAD_REACHABILITY: 15
  - GOVERNANCE: 5
  - Others: 17
Total: 100/100 (clamped at maximum)
```

## Migration Notes

### For Scanner Users
1. **CLI**: New optional enrichment flags available but not required
2. **Output**: New fields in ServicePrincipal node properties
3. **Breaking Change**: `resolvedScopes` removed from edges (if relied upon)

### For Viewer/UI Developers
1. **Schema**: Update to handle new ServicePrincipal properties
2. **Display**: Consider showing wildcard URL warnings
3. **Display**: Show public client flow indicators
4. **Null Handling**: New fields may be null; handle gracefully

### For Risk Scoring Consumers
1. **New Signals**: Two new risk scoring categories available
2. **Weights**: ASSIGNED_TO now uses threshold-based weights
3. **Persistence**: OFFLINE_ACCESS_PERSISTENCE remains distinct from impersonation

## Implementation Checklist

- [x] Scanner wildcard URL detection
- [x] Scanner public client analysis
- [x] Scanner resolvedScopes removal
- [x] CLI enrichment flags
- [x] Scoring logic updates
- [x] Schema updates
- [x] Unit tests
- [x] Integration tests
- [x] Schema validation tests
- [x] Documentation

## Future Enhancements

### Optional Enrichment Implementation
The CLI flags are in place for:
1. **DNS Enrichment**: Lookup DNS records for reply URL domains
2. **RDAP Enrichment**: Query RDAP for domain registration data
3. **IP WHOIS Enrichment**: Lookup WHOIS data for IP literals

These can be implemented as optional, non-blocking enrichment pipelines that:
- Run after Graph data collection
- Fail gracefully without stopping the scan
- Log failures appropriately
- Populate `replyUrlEnrichment` and `replyUrlProvenance` fields

### Additional Risk Signals
Consider adding:
1. Certificate transparency log checks
2. Domain age analysis
3. IP geolocation checks
4. Historical reputation data

## References

- **Scanner**: `oidsee_scanner.py`
- **Scoring**: `scoring_logic.json`
- **Schema**: `schemas/oidsee-graph-export.schema.json`
- **Tests**: `test_wildcard_and_public_client.py`, `test_schema_validation.py`, `test_integration_e2e.py`

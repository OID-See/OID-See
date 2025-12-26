# Changelog

All notable changes to OID-See will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Scanner risk scoring now correctly respects the `appOwnership` field populated from Merill Fernando's Microsoft Apps feed
- **IDENTITY_LAUNDERING** risk no longer incorrectly flags legitimate Microsoft first-party apps
- **DECEPTION** risk no longer incorrectly flags name mismatches in legitimate Microsoft first-party apps
- **MIXED_REPLYURL_DOMAINS** risk no longer incorrectly flags Microsoft apps using multiple legitimate Microsoft domains
- **REPLYURL_OUTLIER_DOMAIN** risk no longer incorrectly flags Microsoft apps using their legitimate domain portfolio

### Added
- Comprehensive test suite (`test_appownership_risk_logic.py`) validating all appOwnership-related risk fixes
- Test coverage for verifying 1st Party apps are correctly excluded from false positive risks
- Test coverage for verifying 3rd Party apps with similar characteristics are still properly flagged

### Changed
- Risk calculation logic in `compute_risk_for_sp()` now consistently gates on `app_ownership == "1st Party"` for attribution-related risks
- Updated sample data to use anonymized real tenant export demonstrating fixed behavior

## [private-beta-1] - TBD

### Summary
This release fixes critical false positive issues in the risk scoring logic where legitimate Microsoft first-party applications were incorrectly flagged with high-severity risks despite being correctly identified via the authoritative Microsoft Apps feed.

**Impact**: Eliminated false positives for 60+ Microsoft first-party apps that were incorrectly receiving combined risk scores of +35 to +50 points from attribution-related risks.

**Attribution**: Scanner integrates with Merill Fernando's Microsoft Apps list (https://github.com/merill/microsoft-info) to identify legitimate Microsoft applications.


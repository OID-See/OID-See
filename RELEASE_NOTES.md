# Release Notes - private-beta-1

## Overview

This release addresses critical false positive issues in OID-See's risk scoring logic. The scanner now correctly respects the `appOwnership` field when calculating risk scores, preventing legitimate Microsoft first-party applications from being incorrectly flagged with attribution-related security risks.

## What's Fixed

### False Positive Risk Elimination

The scanner was incorrectly adding multiple high-severity risks to legitimate Microsoft first-party apps, even though these apps were correctly identified using Merill Fernando's authoritative Microsoft Apps feed. This affected approximately 60+ Microsoft apps in typical tenant scans.

**Risks Fixed:**
- **IDENTITY_LAUNDERING** (15 points) - No longer triggered for confirmed 1st Party apps
- **DECEPTION** (20 points) - No longer triggered for name mismatches in 1st Party apps  
- **MIXED_REPLYURL_DOMAINS** (5-15 points) - No longer triggered when Microsoft apps use multiple Microsoft domains
- **REPLYURL_OUTLIER_DOMAIN** (10 points) - No longer triggered for legitimate Microsoft domain portfolios

### Example Impact

**Before Fix:**
```json
{
  "displayName": "Office Shredding Service",
  "appOwnership": "1st Party",
  "risk": {
    "score": 76,
    "reasons": [
      {"code": "IDENTITY_LAUNDERING", "weight": 15},
      {"code": "DECEPTION", "weight": 20}
    ]
  }
}
```

**After Fix:**
```json
{
  "displayName": "Office Shredding Service", 
  "appOwnership": "1st Party",
  "risk": {
    "score": 41,
    "reasons": [
      {"code": "BROAD_REACHABILITY", "weight": 15},
      {"code": "UNVERIFIED_PUBLISHER", "weight": 6}
    ]
  }
}
```

The false positive risks (IDENTITY_LAUNDERING, DECEPTION) are eliminated, resulting in more accurate risk assessment.

## Technical Details

### Changes Made

**File: `oidsee_scanner.py`**

Four risk calculation sections were updated to respect the `appOwnership` field:

1. **IDENTITY_LAUNDERING** (lines 1942-1956)
   - Added check: `is_first_party = app_ownership == "1st Party"`
   - Gate condition: `and not is_first_party`

2. **DECEPTION** (lines 1921-1940)
   - Added check: `is_first_party = app_ownership == "1st Party"`
   - Gate condition: `and not is_first_party`

3. **MIXED_REPLYURL_DOMAINS** (lines 1958-1975)
   - Added check: `is_first_party = app_ownership == "1st Party"`
   - Gate condition: `and not is_first_party`

4. **REPLYURL_OUTLIER_DOMAIN** (lines 2013-2039)
   - Added checks: `is_first_party` and `is_well_known_ms`
   - Gate condition: `and not is_well_known_ms and not is_first_party`

### Testing

**New Test Suite:** `tests/test_appownership_risk_logic.py`

Five comprehensive tests validate the fixes:
- ✅ 1st Party apps skip IDENTITY_LAUNDERING
- ✅ 1st Party apps skip DECEPTION
- ✅ 1st Party apps skip MIXED_REPLYURL_DOMAINS
- ✅ 1st Party apps skip REPLYURL_OUTLIER_DOMAIN
- ✅ Internal apps skip UNVERIFIED_PUBLISHER (existing behavior)

All tests verify both:
- Negative cases: 1st Party apps are correctly excluded
- Positive cases: 3rd Party apps with same characteristics are still flagged

**Test Results:**
- ✅ All new tests pass (5/5)
- ✅ All existing tests pass
- ✅ No regressions detected

### Integration with Merill's Feed

The scanner fetches app ownership data from:
- **Source:** https://github.com/merill/microsoft-info
- **Feed URL:** https://raw.githubusercontent.com/merill/microsoft-info/main/_info/MicrosoftApps.json

The `appOwnership` field values:
- **"1st Party"** - Legitimate Microsoft apps verified via Merill's feed
- **"3rd Party"** - External apps from other vendors
- **"Internal"** - Apps owned by the scanning tenant

This fix ensures the scanner consistently respects this classification throughout all risk calculations.

## Breaking Changes

None. This is a bug fix that improves accuracy without changing the API or data format.

## Upgrade Notes

1. No configuration changes required
2. Existing scan data remains valid
3. New scans will automatically benefit from corrected risk scoring
4. Consider re-scanning to get updated risk scores for affected applications

## Known Issues

None related to this fix.

## Contributors

- Fixed by: GitHub Copilot
- Integration with: Merill Fernando's Microsoft Apps feed
- Reviewed by: @goldjg

## Git Tagging

When this PR is merged to `main`, tag the merge commit as `private-beta-1`:
```bash
git tag -a private-beta-1 <merge-commit-sha> -m "Release private-beta-1: Fix appOwnership risk scoring"
git push origin private-beta-1
```

## Next Steps

Future enhancements may include:
- Consider reduced weight for UNVERIFIED_PUBLISHER when `appOwnership == "1st Party"`
- Enhanced domain ownership verification via RDAP/WHOIS for non-Microsoft apps
- Additional feed integrations for other trusted app directories


#!/usr/bin/env python3
"""
End-to-end validation of MIXED_REPLYURL_DOMAINS heuristic integration.

This script demonstrates the complete flow of the heuristic in a realistic scenario.
"""

import sys
import os

# Add parent directory to path to import oidsee_scanner
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from oidsee_scanner import compute_risk_for_sp


class MockCache:
    """Mock DirectoryCache for testing."""
    def get(self, oid):
        return None


def validate_scenario(name: str, sp_data: dict, expected_signals: list):
    """Validate a test scenario."""
    print(f"\n{'='*70}")
    print(f"Scenario: {name}")
    print('='*70)
    
    risk = compute_risk_for_sp(
        sp=sp_data,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        has_privileged_scopes=False,
        has_too_many_scopes=False,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[{'id': 'owner1'}],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display=sp_data.get('appDisplayName', 'Test App'),
        dir_cache=MockCache()
    )
    
    print(f"Risk Score: {risk['score']}")
    print(f"Risk Level: {risk['level']}")
    print("\nRisk Reasons:")
    
    mixed_domain_found = False
    for reason in risk['reasons']:
        print(f"  • {reason['code']}: {reason['message']}")
        if 'weight' in reason:
            print(f"    Weight: {reason['weight']}")
        if 'signal_type' in reason:
            print(f"    Signal Type: {reason['signal_type']}")
            mixed_domain_found = True
            if 'domains' in reason:
                print(f"    Domains: {', '.join(sorted(reason['domains']))}")
            if 'non_aligned_domains' in reason and reason['non_aligned_domains']:
                print(f"    Non-aligned: {', '.join(sorted(reason['non_aligned_domains']))}")
    
    # Validate expected signals
    found_signals = [r.get('signal_type') for r in risk['reasons'] if 'signal_type' in r]
    
    success = True
    for expected in expected_signals:
        if expected not in found_signals:
            print(f"\n⚠️  Expected signal '{expected}' not found!")
            success = False
    
    if not expected_signals and mixed_domain_found:
        print(f"\n⚠️  Unexpected mixed domain signal found!")
        success = False
    
    if success:
        print(f"\n✅ Scenario validated successfully!")
    
    return success


def main():
    """Run validation scenarios."""
    print("="*70)
    print("MIXED_REPLYURL_DOMAINS Heuristic - End-to-End Validation")
    print("="*70)
    
    all_passed = True
    
    # Scenario 1: Legitimate app with single domain
    all_passed = all_passed and validate_scenario(
        "Legitimate single-domain app",
        sp_data={
            'replyUrls': [
                'https://app.contoso.com/callback',
                'https://login.contoso.com/auth',
                'https://api.contoso.com/oauth'
            ],
            'homepage': 'https://www.contoso.com',
            'info': {
                'marketingUrl': 'https://contoso.com',
                'privacyStatementUrl': 'https://contoso.com/privacy'
            },
            'appDisplayName': 'Contoso Portal',
            'publisherName': 'Contoso Inc',
            'verifiedPublisher': {'verifiedPublisherId': 'abc123'},
            'createdDateTime': '2025-08-01T00:00:00Z'
        },
        expected_signals=[]
    )
    
    # Scenario 2: Multi-brand company with proper attribution
    all_passed = all_passed and validate_scenario(
        "Multi-brand company (attribution ambiguity)",
        sp_data={
            'replyUrls': [
                'https://app.contoso.com/callback',
                'https://api.fabrikam.com/oauth',
                'https://services.adventureworks.com/auth'
            ],
            'homepage': 'https://www.contoso.com',
            'info': {
                'marketingUrl': 'https://fabrikam.com',
                'termsOfServiceUrl': 'https://adventureworks.com/tos'
            },
            'appDisplayName': 'Enterprise Suite',
            'publisherName': 'Contoso Corp',
            'verifiedPublisher': {'verifiedPublisherId': 'xyz789'},
            'createdDateTime': '2025-09-01T00:00:00Z'
        },
        expected_signals=['attribution_ambiguity']
    )
    
    # Scenario 3: Suspicious app with unaligned domain
    all_passed = all_passed and validate_scenario(
        "Suspicious app (identity laundering)",
        sp_data={
            'replyUrls': [
                'https://app.contoso.com/callback',
                'https://evil-phishing-site.com/steal-tokens'
            ],
            'homepage': 'https://www.contoso.com',
            'info': {
                'marketingUrl': 'https://contoso.com'
            },
            'appDisplayName': 'Contoso App',
            'publisherName': 'Contoso',
            'verifiedPublisher': None,
            'createdDateTime': '2025-01-01T00:00:00Z'
        },
        expected_signals=['identity_laundering']
    )
    
    # Scenario 4: App with Azure Web Apps (common but suspicious pattern)
    all_passed = all_passed and validate_scenario(
        "Development app with Azure staging (identity laundering)",
        sp_data={
            'replyUrls': [
                'https://myapp.azurewebsites.net/callback',
                'https://app.contoso.com/callback'
            ],
            'homepage': 'https://www.contoso.com',
            'info': {},
            'appDisplayName': 'Contoso Development',
            'publisherName': 'Contoso',
            'verifiedPublisher': None,
            'createdDateTime': '2025-05-01T00:00:00Z'
        },
        expected_signals=['identity_laundering']
    )
    
    # Scenario 5: Localhost URLs should be filtered out
    all_passed = all_passed and validate_scenario(
        "Development with localhost (no signal)",
        sp_data={
            'replyUrls': [
                'https://app.contoso.com/callback',
                'http://localhost:5000/callback',
                'http://127.0.0.1:8080/auth'
            ],
            'homepage': 'https://www.contoso.com',
            'info': {
                'marketingUrl': 'https://contoso.com'
            },
            'appDisplayName': 'Contoso Dev App',
            'publisherName': 'Contoso',
            'verifiedPublisher': None,
            'createdDateTime': '2025-06-01T00:00:00Z'
        },
        expected_signals=[]
    )
    
    print("\n" + "="*70)
    if all_passed:
        print("✅ ALL VALIDATION SCENARIOS PASSED")
        print("="*70)
        return 0
    else:
        print("❌ SOME VALIDATION SCENARIOS FAILED")
        print("="*70)
        return 1


if __name__ == "__main__":
    import sys
    sys.exit(main())

#!/usr/bin/env python3
"""
Test for HTML report generator.
Validates that the report generator correctly processes export data and generates HTML.
"""

import json
import os
import sys
import tempfile
from pathlib import Path

# Add parent directory to path to import report_generator
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from report_generator import generate_html_report, _extract_metrics


def create_test_export():
    """Create a minimal test export with various risk scenarios."""
    return {
        "format": {
            "name": "oidsee-graph",
            "version": "1.1"
        },
        "generatedAt": "2025-12-26T00:00:00Z",
        "tenant": {
            "tenantId": "00000000-0000-0000-0000-000000000000",
            "displayName": "Test Tenant",
            "cloud": "Public"
        },
        "nodes": [
            # Critical risk app
            {
                "id": "sp:critical-app",
                "type": "ServicePrincipal",
                "displayName": "Critical Risk App",
                "properties": {
                    "servicePrincipalId": "sp-001",
                    "appId": "app-001",
                    "requiresAssignment": False,
                    "verifiedPublisher": {
                        "displayName": None
                    },
                    "credentialInsights": {
                        "active_password_credentials": 2,
                        "long_lived_secrets": [{"id": "secret1"}],
                        "expired_but_present": []
                    },
                    "replyUrlAnalysis": {
                        "total_urls": 3,
                        "non_https_urls": ["http://example.com/callback"],
                        "ip_literals": ["192.168.1.1"],
                        "wildcard_urls": ["https://*.example.com/callback"]
                    },
                    "trustSignals": {
                        "identityLaunderingSuspected": True
                    }
                },
                "risk": {
                    "score": 95,
                    "level": "critical",
                    "reasons": [
                        {"code": "HAS_APP_ROLE", "weight": 50, "message": "Has app roles"},
                        {"code": "NO_OWNERS", "weight": 15, "message": "No owners"},
                        {"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "Unverified"},
                        {"code": "CREDENTIAL_HYGIENE", "weight": 10, "message": "Long-lived secrets"},
                        {"code": "REPLY_URL_ANOMALIES", "weight": 15, "message": "Wildcard domains"}
                    ]
                }
            },
            # High risk app
            {
                "id": "sp:high-app",
                "type": "ServicePrincipal",
                "displayName": "High Risk App",
                "properties": {
                    "servicePrincipalId": "sp-002",
                    "appId": "app-002",
                    "requiresAssignment": False,
                    "verifiedPublisher": {
                        "displayName": None
                    },
                    "credentialInsights": {
                        "active_password_credentials": 1,
                        "long_lived_secrets": [],
                        "expired_but_present": [{"id": "exp1"}]
                    },
                    "replyUrlAnalysis": {
                        "total_urls": 1,
                        "non_https_urls": [],
                        "ip_literals": [],
                        "wildcard_urls": []
                    },
                    "trustSignals": {
                        "identityLaunderingSuspected": False
                    }
                },
                "risk": {
                    "score": 75,
                    "level": "high",
                    "reasons": [
                        {"code": "HAS_PRIVILEGED_SCOPES", "weight": 20, "message": "Privileged scopes"},
                        {"code": "NO_OWNERS", "weight": 15, "message": "No owners"},
                        {"code": "GOVERNANCE", "weight": 5, "message": "No assignment required"}
                    ]
                }
            },
            # Medium risk app
            {
                "id": "sp:medium-app",
                "type": "ServicePrincipal",
                "displayName": "Medium Risk App",
                "properties": {
                    "servicePrincipalId": "sp-003",
                    "appId": "app-003",
                    "requiresAssignment": True,
                    "verifiedPublisher": {
                        "displayName": "Verified Publisher"
                    },
                    "credentialInsights": {
                        "active_password_credentials": 0,
                        "long_lived_secrets": [],
                        "expired_but_present": []
                    },
                    "replyUrlAnalysis": {
                        "total_urls": 1,
                        "non_https_urls": [],
                        "ip_literals": [],
                        "wildcard_urls": []
                    },
                    "trustSignals": {
                        "identityLaunderingSuspected": False
                    }
                },
                "risk": {
                    "score": 50,
                    "level": "medium",
                    "reasons": [
                        {"code": "HAS_TOO_MANY_SCOPES", "weight": 15, "message": "Too many scopes"},
                        {"code": "OFFLINE_ACCESS_PERSISTENCE", "weight": 8, "message": "Offline access"}
                    ]
                }
            },
            # Low risk app
            {
                "id": "sp:low-app",
                "type": "ServicePrincipal",
                "displayName": "Low Risk App",
                "properties": {
                    "servicePrincipalId": "sp-004",
                    "appId": "app-004",
                    "requiresAssignment": True,
                    "verifiedPublisher": {
                        "displayName": "Verified Publisher"
                    },
                    "credentialInsights": {
                        "active_password_credentials": 0,
                        "long_lived_secrets": [],
                        "expired_but_present": []
                    },
                    "replyUrlAnalysis": {
                        "total_urls": 0,
                        "non_https_urls": [],
                        "ip_literals": [],
                        "wildcard_urls": []
                    },
                    "trustSignals": {
                        "identityLaunderingSuspected": False
                    }
                },
                "risk": {
                    "score": 25,
                    "level": "low",
                    "reasons": [
                        {"code": "ASSIGNED_TO", "weight": 5, "message": "Some assignments"}
                    ]
                }
            },
            # Info risk app
            {
                "id": "sp:info-app",
                "type": "ServicePrincipal",
                "displayName": "Info Risk App",
                "properties": {
                    "servicePrincipalId": "sp-005",
                    "appId": "app-005",
                    "requiresAssignment": True,
                    "verifiedPublisher": {
                        "displayName": "Verified Publisher"
                    },
                    "credentialInsights": {
                        "active_password_credentials": 0,
                        "long_lived_secrets": [],
                        "expired_but_present": []
                    },
                    "replyUrlAnalysis": {
                        "total_urls": 0,
                        "non_https_urls": [],
                        "ip_literals": [],
                        "wildcard_urls": []
                    },
                    "trustSignals": {
                        "identityLaunderingSuspected": False
                    }
                },
                "risk": {
                    "score": 10,
                    "level": "info",
                    "reasons": []
                }
            },
            # User node
            {
                "id": "user:test",
                "type": "User",
                "displayName": "Test User",
                "properties": {}
            }
        ],
        "edges": [
            {"id": "e1", "from": "sp:critical-app", "to": "resource:graph", "type": "HAS_APP_ROLE"},
            {"id": "e2", "from": "sp:high-app", "to": "resource:graph", "type": "HAS_PRIVILEGED_SCOPES"},
            {"id": "e3", "from": "sp:medium-app", "to": "resource:graph", "type": "HAS_TOO_MANY_SCOPES"},
            {"id": "e4", "from": "sp:medium-app", "to": "resource:graph", "type": "HAS_OFFLINE_ACCESS"},
            {"id": "e5", "from": "sp:critical-app", "to": "resource:graph", "type": "CAN_IMPERSONATE"}
        ]
    }


def test_extract_metrics():
    """Test metric extraction from export data."""
    print("\n=== Testing Metric Extraction ===")
    
    export_data = create_test_export()
    metrics = _extract_metrics(export_data)
    
    # Check total counts
    assert metrics['total_service_principals'] == 5, f"Expected 5 SPs, got {metrics['total_service_principals']}"
    assert metrics['total_nodes'] == 6, f"Expected 6 nodes, got {metrics['total_nodes']}"
    assert metrics['total_edges'] == 5, f"Expected 5 edges, got {metrics['total_edges']}"
    
    # Check risk distribution
    risk_dist = metrics['risk_distribution']
    assert risk_dist.get('critical', 0) == 1, f"Expected 1 critical, got {risk_dist.get('critical', 0)}"
    assert risk_dist.get('high', 0) == 1, f"Expected 1 high, got {risk_dist.get('high', 0)}"
    assert risk_dist.get('medium', 0) == 1, f"Expected 1 medium, got {risk_dist.get('medium', 0)}"
    assert risk_dist.get('low', 0) == 1, f"Expected 1 low, got {risk_dist.get('low', 0)}"
    assert risk_dist.get('info', 0) == 1, f"Expected 1 info, got {risk_dist.get('info', 0)}"
    
    # Check risk reasons
    assert 'HAS_APP_ROLE' in metrics['risk_reasons_count'], "HAS_APP_ROLE should be in reasons"
    assert 'NO_OWNERS' in metrics['risk_reasons_count'], "NO_OWNERS should be in reasons"
    assert metrics['risk_reasons_count']['NO_OWNERS'] == 2, "NO_OWNERS should appear twice"
    
    # Check security metrics
    assert metrics['unverified_publishers'] == 2, f"Expected 2 unverified, got {metrics['unverified_publishers']}"
    assert metrics['apps_with_password_creds'] == 2, f"Expected 2 with password creds, got {metrics['apps_with_password_creds']}"
    assert metrics['apps_with_long_lived_secrets'] == 1, f"Expected 1 with long-lived secrets, got {metrics['apps_with_long_lived_secrets']}"
    assert metrics['apps_with_expired_creds'] == 1, f"Expected 1 with expired creds, got {metrics['apps_with_expired_creds']}"
    assert metrics['identity_laundering_suspected'] == 1, f"Expected 1 identity laundering, got {metrics['identity_laundering_suspected']}"
    assert metrics['apps_no_assignment_required'] == 2, f"Expected 2 without assignment required, got {metrics['apps_no_assignment_required']}"
    assert metrics['apps_with_non_https'] == 1, f"Expected 1 with non-HTTPS, got {metrics['apps_with_non_https']}"
    assert metrics['apps_with_ip_literals'] == 1, f"Expected 1 with IP literals, got {metrics['apps_with_ip_literals']}"
    assert metrics['apps_with_wildcards'] == 1, f"Expected 1 with wildcards, got {metrics['apps_with_wildcards']}"
    
    # Check edge types
    edge_types = metrics['edge_types']
    assert edge_types.get('HAS_APP_ROLE', 0) == 1, f"Expected 1 HAS_APP_ROLE, got {edge_types.get('HAS_APP_ROLE', 0)}"
    assert edge_types.get('CAN_IMPERSONATE', 0) == 1, f"Expected 1 CAN_IMPERSONATE, got {edge_types.get('CAN_IMPERSONATE', 0)}"
    
    # Check top risky apps
    assert len(metrics['top_risky_apps']) == 2, f"Expected 2 high-risk apps (>=70), got {len(metrics['top_risky_apps'])}"
    assert metrics['top_risky_apps'][0]['risk']['score'] == 95, "First app should have score 95"
    assert metrics['top_risky_apps'][1]['risk']['score'] == 75, "Second app should have score 75"
    
    print("✓ Metric extraction tests passed")


def test_generate_report():
    """Test HTML report generation."""
    print("\n=== Testing Report Generation ===")
    
    export_data = create_test_export()
    
    # Generate report to temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
        temp_path = f.name
    
    try:
        generate_html_report(export_data, temp_path)
        
        # Read generated HTML
        with open(temp_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Basic validation checks
        assert '<!DOCTYPE html>' in html_content, "Should be valid HTML"
        assert 'OID-See Security Report' in html_content, "Should have title"
        assert 'Test Tenant' in html_content, "Should include tenant name"
        assert 'Critical Risk App' in html_content, "Should include high-risk app name"
        
        # Check for risk cards
        assert 'badge-critical' in html_content, "Should have critical badge"
        assert 'badge-high' in html_content, "Should have high badge"
        assert 'badge-medium' in html_content, "Should have medium badge"
        
        # Check for metrics
        assert 'Unverified Publishers' in html_content, "Should have unverified publishers metric"
        assert 'Apps Without Owners' in html_content, "Should have owners metric"
        assert 'Long-Lived Secrets' in html_content, "Should have credential hygiene metric"
        
        # Check for risk reasons
        assert 'HAS_APP_ROLE' in html_content, "Should include HAS_APP_ROLE"
        assert 'NO_OWNERS' in html_content, "Should include NO_OWNERS"
        
        # Check for capability analysis
        assert 'Capability Analysis' in html_content, "Should have capability section"
        assert 'Can Impersonate' in html_content, "Should show impersonation capability"
        
        # Check for recommendations
        assert 'Security Recommendations' in html_content or 'Recommendations' in html_content, "Should have recommendations"
        
        print(f"✓ Generated HTML report: {len(html_content)} bytes")
        print(f"✓ Report generation tests passed")
        
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_report_with_empty_export():
    """Test report generation with minimal/empty data."""
    print("\n=== Testing Report with Empty Export ===")
    
    empty_export = {
        "format": {"name": "oidsee-graph", "version": "1.1"},
        "generatedAt": "2025-12-26T00:00:00Z",
        "tenant": {
            "tenantId": "00000000-0000-0000-0000-000000000000",
            "displayName": "Empty Tenant"
        },
        "nodes": [],
        "edges": []
    }
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
        temp_path = f.name
    
    try:
        generate_html_report(empty_export, temp_path)
        
        with open(temp_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        assert 'Empty Tenant' in html_content, "Should include tenant name"
        assert 'No Service Principals' in html_content or '0' in html_content, "Should handle empty data"
        
        print("✓ Empty export test passed")
        
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def main():
    """Run all tests."""
    print("Starting report generator tests...")
    
    try:
        test_extract_metrics()
        test_generate_report()
        test_report_with_empty_export()
        
        print("\n" + "="*50)
        print("✓ All report generator tests passed!")
        print("="*50)
        return 0
        
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())

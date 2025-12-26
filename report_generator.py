#!/usr/bin/env python3
"""
OID-See HTML Report Generator

Generates an HTML report from OID-See JSON export data that summarizes:
- Risk level distribution
- Top risk contributors
- Key findings and metrics
- Security recommendations

The report aligns with OID-See's scoring logic as documented in docs/scoring-logic.md
"""

import json
from typing import Dict, List, Any
from collections import Counter, defaultdict
from datetime import datetime

# Repository URL for report footer
REPOSITORY_URL = "https://github.com/OID-See/OID-See"


def generate_html_report(export_data: Dict[str, Any], output_path: str) -> None:
    """
    Generate an HTML report from OID-See export data.
    
    Args:
        export_data: Parsed JSON export data
        output_path: Path to write HTML report
    """
    
    # Extract metrics from export data
    metrics = _extract_metrics(export_data)
    
    # Generate HTML
    html = _generate_html(metrics, export_data)
    
    # Write to file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)


def _extract_metrics(export_data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract key metrics from export data."""
    
    nodes = export_data.get('nodes', [])
    edges = export_data.get('edges', [])
    
    # Filter service principals
    service_principals = [n for n in nodes if n.get('type') == 'ServicePrincipal']
    
    # Risk distribution
    risk_distribution = Counter()
    for sp in service_principals:
        risk = sp.get('risk', {})
        level = risk.get('level', 'info')
        risk_distribution[level] += 1
    
    # Risk reason aggregation
    risk_reasons_count = Counter()
    risk_reasons_weight = defaultdict(int)
    for sp in service_principals:
        risk = sp.get('risk', {})
        for reason in risk.get('reasons', []):
            code = reason.get('code')
            weight = reason.get('weight', 0)
            risk_reasons_count[code] += 1
            risk_reasons_weight[code] += weight
    
    # Top risky apps
    top_risky_apps = sorted(
        [sp for sp in service_principals if sp.get('risk', {}).get('score', 0) >= 70],
        key=lambda x: x.get('risk', {}).get('score', 0),
        reverse=True
    )[:10]
    
    # Capability metrics
    edge_types = Counter(e.get('type') for e in edges)
    
    # Credential hygiene metrics
    apps_with_password_creds = sum(
        1 for sp in service_principals
        if sp.get('properties', {}).get('credentialInsights', {}).get('active_password_credentials', 0) > 0
    )
    
    apps_with_long_lived_secrets = sum(
        1 for sp in service_principals
        if len(sp.get('properties', {}).get('credentialInsights', {}).get('long_lived_secrets', [])) > 0
    )
    
    apps_with_expired_creds = sum(
        1 for sp in service_principals
        if len(sp.get('properties', {}).get('credentialInsights', {}).get('expired_but_present', [])) > 0
    )
    
    # Publisher verification
    unverified_publishers = sum(
        1 for sp in service_principals
        if not sp.get('properties', {}).get('verifiedPublisher', {}).get('displayName')
    )
    
    # Governance metrics
    apps_without_owners = sum(
        1 for sp in service_principals
        if any(r.get('code') == 'NO_OWNERS' for r in sp.get('risk', {}).get('reasons', []))
    )
    
    apps_no_assignment_required = sum(
        1 for sp in service_principals
        if sp.get('properties', {}).get('requiresAssignment') is False
    )
    
    # Reply URL anomalies
    apps_with_non_https = sum(
        1 for sp in service_principals
        if len(sp.get('properties', {}).get('replyUrlAnalysis', {}).get('non_https_urls', [])) > 0
    )
    
    apps_with_ip_literals = sum(
        1 for sp in service_principals
        if len(sp.get('properties', {}).get('replyUrlAnalysis', {}).get('ip_literals', [])) > 0
    )
    
    apps_with_wildcards = sum(
        1 for sp in service_principals
        if len(sp.get('properties', {}).get('replyUrlAnalysis', {}).get('wildcard_urls', [])) > 0
    )
    
    # Identity laundering detection
    identity_laundering_suspected = sum(
        1 for sp in service_principals
        if sp.get('properties', {}).get('trustSignals', {}).get('identityLaunderingSuspected') is True
    )
    
    return {
        'total_service_principals': len(service_principals),
        'total_nodes': len(nodes),
        'total_edges': len(edges),
        'risk_distribution': dict(risk_distribution),
        'risk_reasons_count': dict(risk_reasons_count),
        'risk_reasons_weight': dict(risk_reasons_weight),
        'top_risky_apps': top_risky_apps,
        'edge_types': dict(edge_types),
        'apps_with_password_creds': apps_with_password_creds,
        'apps_with_long_lived_secrets': apps_with_long_lived_secrets,
        'apps_with_expired_creds': apps_with_expired_creds,
        'unverified_publishers': unverified_publishers,
        'apps_without_owners': apps_without_owners,
        'apps_no_assignment_required': apps_no_assignment_required,
        'apps_with_non_https': apps_with_non_https,
        'apps_with_ip_literals': apps_with_ip_literals,
        'apps_with_wildcards': apps_with_wildcards,
        'identity_laundering_suspected': identity_laundering_suspected,
    }


def _generate_html(metrics: Dict[str, Any], export_data: Dict[str, Any]) -> str:
    """Generate HTML report from metrics."""
    
    tenant = export_data.get('tenant', {})
    tenant_name = tenant.get('displayName', 'Unknown')
    tenant_id = tenant.get('tenantId', 'Unknown')
    generated_at = export_data.get('generatedAt', 'Unknown')
    
    # Calculate percentages
    total_sps = metrics['total_service_principals']
    risk_dist = metrics['risk_distribution']
    
    critical_count = risk_dist.get('critical', 0)
    high_count = risk_dist.get('high', 0)
    medium_count = risk_dist.get('medium', 0)
    low_count = risk_dist.get('low', 0)
    info_count = risk_dist.get('info', 0)
    
    critical_pct = (critical_count / total_sps * 100) if total_sps > 0 else 0
    high_pct = (high_count / total_sps * 100) if total_sps > 0 else 0
    medium_pct = (medium_count / total_sps * 100) if total_sps > 0 else 0
    low_pct = (low_count / total_sps * 100) if total_sps > 0 else 0
    info_pct = (info_count / total_sps * 100) if total_sps > 0 else 0
    
    # Top risk reasons
    top_reasons = sorted(
        metrics['risk_reasons_count'].items(),
        key=lambda x: x[1],
        reverse=True
    )[:10]
    
    # Generate risk reason rows
    risk_reason_rows = ""
    for code, count in top_reasons:
        weight_total = metrics['risk_reasons_weight'].get(code, 0)
        avg_weight = weight_total / count if count > 0 else 0
        pct = (count / total_sps * 100) if total_sps > 0 else 0
        risk_reason_rows += f"""
        <tr>
            <td><code>{code}</code></td>
            <td>{count}</td>
            <td>{pct:.1f}%</td>
            <td>{avg_weight:.1f}</td>
        </tr>
        """
    
    # Generate top risky apps
    top_risky_rows = ""
    for app in metrics['top_risky_apps']:
        name = app.get('displayName', 'Unknown')
        score = app.get('risk', {}).get('score', 0)
        level = app.get('risk', {}).get('level', 'info')
        app_id = app.get('properties', {}).get('appId', 'N/A')
        
        level_badge = {
            'critical': '<span class="badge badge-critical">💀 Critical</span>',
            'high': '<span class="badge badge-high">🔴 High</span>',
            'medium': '<span class="badge badge-medium">🔶 Medium</span>',
            'low': '<span class="badge badge-low">⚠️ Low</span>',
            'info': '<span class="badge badge-info">ℹ️ Info</span>',
        }.get(level, '<span class="badge badge-info">ℹ️ Info</span>')
        
        top_risky_rows += f"""
        <tr>
            <td>{name}</td>
            <td><code class="app-id">{app_id}</code></td>
            <td>{score}</td>
            <td>{level_badge}</td>
        </tr>
        """
    
    if not top_risky_rows:
        top_risky_rows = '<tr><td colspan="4" class="text-center">No high-risk applications found</td></tr>'
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OID-See Security Report - {tenant_name}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }}
        
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }}
        
        .header h1 {{
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 600;
        }}
        
        .header .subtitle {{
            font-size: 1.2em;
            opacity: 0.9;
        }}
        
        .meta {{
            background: #f8f9fa;
            padding: 20px 40px;
            border-bottom: 1px solid #e0e0e0;
        }}
        
        .meta-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }}
        
        .meta-item {{
            display: flex;
            flex-direction: column;
        }}
        
        .meta-label {{
            font-size: 0.85em;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }}
        
        .meta-value {{
            font-size: 1.1em;
            font-weight: 600;
            color: #333;
        }}
        
        .content {{
            padding: 40px;
        }}
        
        .section {{
            margin-bottom: 40px;
        }}
        
        .section-title {{
            font-size: 1.8em;
            margin-bottom: 20px;
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }}
        
        .risk-overview {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .risk-card {{
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            border: 2px solid #e0e0e0;
            transition: transform 0.2s;
        }}
        
        .risk-card:hover {{
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }}
        
        .risk-card.critical {{
            border-color: #dc3545;
            background: #fff5f5;
        }}
        
        .risk-card.high {{
            border-color: #fd7e14;
            background: #fff8f0;
        }}
        
        .risk-card.medium {{
            border-color: #ffc107;
            background: #fffbf0;
        }}
        
        .risk-card.low {{
            border-color: #17a2b8;
            background: #f0f9ff;
        }}
        
        .risk-card.info {{
            border-color: #6c757d;
            background: #f8f9fa;
        }}
        
        .risk-count {{
            font-size: 3em;
            font-weight: bold;
            margin: 10px 0;
        }}
        
        .risk-card.critical .risk-count {{
            color: #dc3545;
        }}
        
        .risk-card.high .risk-count {{
            color: #fd7e14;
        }}
        
        .risk-card.medium .risk-count {{
            color: #ffc107;
        }}
        
        .risk-card.low .risk-count {{
            color: #17a2b8;
        }}
        
        .risk-card.info .risk-count {{
            color: #6c757d;
        }}
        
        .risk-label {{
            font-size: 1.1em;
            font-weight: 600;
            margin-bottom: 5px;
        }}
        
        .risk-percentage {{
            font-size: 0.9em;
            color: #666;
        }}
        
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .metric-card {{
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid #667eea;
        }}
        
        .metric-title {{
            font-size: 0.9em;
            color: #666;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        
        .metric-value {{
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }}
        
        .metric-card.warning {{
            border-left-color: #ffc107;
        }}
        
        .metric-card.danger {{
            border-left-color: #dc3545;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }}
        
        th {{
            background: #667eea;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }}
        
        td {{
            padding: 12px 15px;
            border-bottom: 1px solid #e0e0e0;
        }}
        
        tr:hover {{
            background: #f8f9fa;
        }}
        
        tr:last-child td {{
            border-bottom: none;
        }}
        
        code {{
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            color: #d63384;
        }}
        
        .app-id {{
            color: #0066cc;
            font-size: 0.85em;
        }}
        
        .badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
        }}
        
        .badge-critical {{
            background: #dc3545;
            color: white;
        }}
        
        .badge-high {{
            background: #fd7e14;
            color: white;
        }}
        
        .badge-medium {{
            background: #ffc107;
            color: #333;
        }}
        
        .badge-low {{
            background: #17a2b8;
            color: white;
        }}
        
        .badge-info {{
            background: #6c757d;
            color: white;
        }}
        
        .text-center {{
            text-align: center;
        }}
        
        .alert {{
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid;
        }}
        
        .alert-info {{
            background: #d1ecf1;
            border-color: #0c5460;
            color: #0c5460;
        }}
        
        .alert-warning {{
            background: #fff3cd;
            border-color: #856404;
            color: #856404;
        }}
        
        .alert-danger {{
            background: #f8d7da;
            border-color: #721c24;
            color: #721c24;
        }}
        
        .recommendations {{
            background: #e7f3ff;
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
        }}
        
        .recommendations h3 {{
            color: #0066cc;
            margin-bottom: 15px;
        }}
        
        .recommendations ul {{
            list-style: none;
            padding-left: 0;
        }}
        
        .recommendations li {{
            padding: 8px 0;
            padding-left: 25px;
            position: relative;
        }}
        
        .recommendations li:before {{
            content: "✓";
            position: absolute;
            left: 0;
            color: #28a745;
            font-weight: bold;
        }}
        
        .footer {{
            background: #f8f9fa;
            padding: 20px 40px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 0.9em;
        }}
        
        @media print {{
            body {{
                padding: 0;
                background: white;
            }}
            
            .container {{
                box-shadow: none;
            }}
            
            .risk-card:hover {{
                transform: none;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 OID-See Security Report</h1>
            <div class="subtitle">Microsoft Entra ID Third-Party Application Risk Assessment</div>
        </div>
        
        <div class="meta">
            <div class="meta-grid">
                <div class="meta-item">
                    <div class="meta-label">Tenant</div>
                    <div class="meta-value">{tenant_name}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Tenant ID</div>
                    <div class="meta-value"><code>{tenant_id}</code></div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Generated At</div>
                    <div class="meta-value">{generated_at}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Service Principals</div>
                    <div class="meta-value">{total_sps}</div>
                </div>
            </div>
        </div>
        
        <div class="content">
            <div class="section">
                <h2 class="section-title">📊 Risk Distribution</h2>
                <div class="risk-overview">
                    <div class="risk-card critical">
                        <div class="risk-label">💀 Critical</div>
                        <div class="risk-count">{critical_count}</div>
                        <div class="risk-percentage">{critical_pct:.1f}%</div>
                    </div>
                    <div class="risk-card high">
                        <div class="risk-label">🔴 High</div>
                        <div class="risk-count">{high_count}</div>
                        <div class="risk-percentage">{high_pct:.1f}%</div>
                    </div>
                    <div class="risk-card medium">
                        <div class="risk-label">🔶 Medium</div>
                        <div class="risk-count">{medium_count}</div>
                        <div class="risk-percentage">{medium_pct:.1f}%</div>
                    </div>
                    <div class="risk-card low">
                        <div class="risk-label">⚠️ Low</div>
                        <div class="risk-count">{low_count}</div>
                        <div class="risk-percentage">{low_pct:.1f}%</div>
                    </div>
                    <div class="risk-card info">
                        <div class="risk-label">ℹ️ Info</div>
                        <div class="risk-count">{info_count}</div>
                        <div class="risk-percentage">{info_pct:.1f}%</div>
                    </div>
                </div>
                
                {_generate_alert_message(critical_count, high_count, total_sps)}
            </div>
            
            <div class="section">
                <h2 class="section-title">🎯 Key Security Metrics</h2>
                <div class="metrics-grid">
                    <div class="metric-card danger">
                        <div class="metric-title">Unverified Publishers</div>
                        <div class="metric-value">{metrics['unverified_publishers']}</div>
                    </div>
                    <div class="metric-card danger">
                        <div class="metric-title">Apps Without Owners</div>
                        <div class="metric-value">{metrics['apps_without_owners']}</div>
                    </div>
                    <div class="metric-card warning">
                        <div class="metric-title">Password Credentials</div>
                        <div class="metric-value">{metrics['apps_with_password_creds']}</div>
                    </div>
                    <div class="metric-card warning">
                        <div class="metric-title">Long-Lived Secrets</div>
                        <div class="metric-value">{metrics['apps_with_long_lived_secrets']}</div>
                    </div>
                    <div class="metric-card warning">
                        <div class="metric-title">Expired Credentials</div>
                        <div class="metric-value">{metrics['apps_with_expired_creds']}</div>
                    </div>
                    <div class="metric-card danger">
                        <div class="metric-title">Identity Laundering Suspected</div>
                        <div class="metric-value">{metrics['identity_laundering_suspected']}</div>
                    </div>
                    <div class="metric-card warning">
                        <div class="metric-title">No Assignment Required</div>
                        <div class="metric-value">{metrics['apps_no_assignment_required']}</div>
                    </div>
                    <div class="metric-card warning">
                        <div class="metric-title">Non-HTTPS Reply URLs</div>
                        <div class="metric-value">{metrics['apps_with_non_https']}</div>
                    </div>
                    <div class="metric-card warning">
                        <div class="metric-title">IP Literals in Reply URLs</div>
                        <div class="metric-value">{metrics['apps_with_ip_literals']}</div>
                    </div>
                    <div class="metric-card danger">
                        <div class="metric-title">Wildcard Reply URLs</div>
                        <div class="metric-value">{metrics['apps_with_wildcards']}</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">🔝 Top Risk Contributors</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Risk Factor</th>
                            <th>Affected Apps</th>
                            <th>Percentage</th>
                            <th>Avg Weight</th>
                        </tr>
                    </thead>
                    <tbody>
                        {risk_reason_rows}
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h2 class="section-title">⚠️ High-Risk Applications</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Application Name</th>
                            <th>App ID</th>
                            <th>Risk Score</th>
                            <th>Risk Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        {top_risky_rows}
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h2 class="section-title">💡 Capability Analysis</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-title">Can Impersonate</div>
                        <div class="metric-value">{metrics['edge_types'].get('CAN_IMPERSONATE', 0)}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-title">App Roles Granted</div>
                        <div class="metric-value">{metrics['edge_types'].get('HAS_APP_ROLE', 0)}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-title">Privileged Scopes</div>
                        <div class="metric-value">{metrics['edge_types'].get('HAS_PRIVILEGED_SCOPES', 0)}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-title">Overly Broad Scopes</div>
                        <div class="metric-value">{metrics['edge_types'].get('HAS_TOO_MANY_SCOPES', 0)}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-title">Offline Access</div>
                        <div class="metric-value">{metrics['edge_types'].get('HAS_OFFLINE_ACCESS', 0)}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-title">Directory Roles</div>
                        <div class="metric-value">{metrics['edge_types'].get('HAS_ROLE', 0)}</div>
                    </div>
                </div>
            </div>
            
            {_generate_recommendations(metrics)}
        </div>
        
        <div class="footer">
            Generated by OID-See Scanner | For more information, visit the <a href="{REPOSITORY_URL}" target="_blank">OID-See Repository</a>
        </div>
    </div>
</body>
</html>
"""
    
    return html


def _generate_alert_message(critical: int, high: int, total: int) -> str:
    """Generate appropriate alert message based on risk distribution."""
    
    if critical > 0:
        return f'''
        <div class="alert alert-danger">
            <strong>⚠️ Critical Risk Detected:</strong> {critical} application(s) with critical risk level require immediate attention. 
            Review these applications urgently and consider revoking access or implementing additional controls.
        </div>
        '''
    elif high > 0:
        return f'''
        <div class="alert alert-warning">
            <strong>⚠️ High Risk Detected:</strong> {high} application(s) with high risk level require prompt review. 
            Investigate permissions, ownership, and security controls for these applications.
        </div>
        '''
    elif total > 0:
        return '''
        <div class="alert alert-info">
            <strong>ℹ️ Good Security Posture:</strong> No critical or high-risk applications detected. 
            Continue monitoring and maintain security best practices.
        </div>
        '''
    else:
        return '''
        <div class="alert alert-info">
            <strong>ℹ️ No Service Principals:</strong> No service principals found in this scan.
        </div>
        '''


def _generate_recommendations(metrics: Dict[str, Any]) -> str:
    """Generate security recommendations based on metrics."""
    
    recommendations = []
    
    if metrics['apps_without_owners'] > 0:
        recommendations.append("Assign owners to all applications to ensure accountability and lifecycle management")
    
    if metrics['unverified_publishers'] > 0:
        recommendations.append("Work with vendors to get publisher verification for third-party applications")
    
    if metrics['apps_with_long_lived_secrets'] > 0:
        recommendations.append("Rotate long-lived secrets (>180 days) and implement shorter credential lifetimes (90 days recommended)")
    
    if metrics['apps_with_expired_creds'] > 0:
        recommendations.append("Remove expired credentials to improve credential hygiene")
    
    if metrics['apps_no_assignment_required'] > 0:
        recommendations.append("Enable assignment requirements for applications to improve governance")
    
    if metrics['apps_with_non_https'] > 0:
        recommendations.append("Update reply URLs to use HTTPS for all OAuth redirect URIs")
    
    if metrics['apps_with_wildcards'] > 0:
        recommendations.append("Replace wildcard domains in reply URLs with explicit subdomains")
    
    if metrics['identity_laundering_suspected'] > 0:
        recommendations.append("Investigate applications with suspected identity laundering for authenticity")
    
    if not recommendations:
        recommendations = [
            "Continue regular security scanning (weekly or bi-weekly recommended)",
            "Monitor for new high-risk applications and permission changes",
            "Review and update security policies regularly",
            "Maintain credential hygiene with regular rotation schedules"
        ]
    
    rec_html = '<div class="recommendations">\n<h3>🎯 Security Recommendations</h3>\n<ul>\n'
    for rec in recommendations:
        rec_html += f'<li>{rec}</li>\n'
    rec_html += '</ul>\n</div>'
    
    return rec_html


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python report_generator.py <export.json> [output.html]")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else input_path.replace('.json', '-report.html')
    
    with open(input_path, 'r', encoding='utf-8') as f:
        export_data = json.load(f)
    
    generate_html_report(export_data, output_path)
    print(f"✓ Report generated: {output_path}")

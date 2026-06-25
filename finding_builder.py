#!/usr/bin/env python3
"""
OID-See Finding Builder

Converts an OID-See graph export into a list of analyst-ready finding objects.
Findings are derived entirely from existing scanner output and risk reason codes.
No independent scoring is performed — all risk values come from the export.

Usage:
    from finding_builder import build_findings

    with open("scan-results.json") as f:
        export = json.load(f)

    findings = build_findings(export)
"""

from __future__ import annotations

import hashlib
import json
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Risk level ordering (used to filter and sort findings)
# ---------------------------------------------------------------------------

_RISK_LEVEL_ORDER: Dict[str, int] = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
    "info": 0,
}

# ---------------------------------------------------------------------------
# Confidence mapping per reason code
# Reflects how reliably each code indicates a true security concern.
# ---------------------------------------------------------------------------

_REASON_CONFIDENCE: Dict[str, str] = {
    "HAS_APP_ROLE": "high",
    "HAS_PRIVILEGED_SCOPES": "high",
    "HAS_HIGH_PRIVILEGE_PERMISSION": "high",
    "CAN_IMPERSONATE": "high",
    "BROAD_REACHABILITY": "high",
    "PRIVILEGE": "high",
    "DECEPTION": "high",
    "IDENTITY_LAUNDERING": "high",
    "REPLY_URL_ANOMALIES": "high",
    "CREDENTIAL_HYGIENE": "high",
    "OFFLINE_ACCESS_PERSISTENCE": "medium",
    "ASSIGNED_TO": "medium",
    "UNVERIFIED_PUBLISHER": "medium",
    "MIXED_REPLYURL_DOMAINS": "medium",
    "PUBLIC_CLIENT_FLOW_RISK": "medium",
    "HAS_OWNERS_USER": "medium",
    "HAS_OWNERS_SP": "low",
    "GOVERNANCE": "low",
    "CREATED_BEFORE_CONSENT_HARDENING": "low",
    "REPLYURL_OUTLIER_DOMAIN": "medium",
    "CREDENTIALS_PRESENT": "medium",
    "PASSWORD_CREDENTIALS_PRESENT": "medium",
    "GOVERNANCE_UNKNOWN": "low",
    "EXTERNAL_IDENTITY_POSTURE_AMPLIFIER": "medium",
    "GOVERNS": "medium",
}

_CONFIDENCE_ORDER: Dict[str, int] = {"high": 2, "medium": 1, "low": 0}

# ---------------------------------------------------------------------------
# Per-reason-code evidence templates
# Each entry drives the evidence block for a single reason code.
# ---------------------------------------------------------------------------

_REASON_EVIDENCE: Dict[str, Dict[str, str]] = {
    "HAS_APP_ROLE": {
        "title": "Application permission (app role) granted",
        "summary": (
            "This app holds one or more application-level permissions (app roles) "
            "that operate as background service credentials, independent of any user session."
        ),
        "impact": (
            "App role grants persist indefinitely and do not expire with user sessions. "
            "A compromised app credential maintains access without user interaction."
        ),
        "checkNext": (
            "Review each granted app role and confirm a business owner approved admin consent. "
            "Verify the role is not broader than the app's documented purpose. "
            "Check whether the permission is actively used by the app."
        ),
        "falsePositiveNotes": (
            "Microsoft first-party service apps and well-known platform apps legitimately hold app roles. "
            "Verify appOwnership is '1st Party' before dismissing."
        ),
        "recommendedAction": (
            "Review admin consent for each app role. "
            "Remove unused or overly broad app role assignments."
        ),
    },
    "HAS_PRIVILEGED_SCOPES": {
        "title": "Privileged delegated permission granted",
        "summary": (
            "Delegated scopes include write, ReadWrite.All, or action-style permissions "
            "that exceed read-only access."
        ),
        "impact": (
            "If an access or refresh token is stolen, the attacker inherits these delegated "
            "privileges within the user's context for the token lifetime."
        ),
        "checkNext": (
            "Confirm which scopes are in active use. "
            "Validate that the app's functionality requires this level of access. "
            "Review whether consent was granted by an administrator."
        ),
        "falsePositiveNotes": (
            "Some productivity integrations legitimately require broad delegated access. "
            "Confirm admin consent history and business justification."
        ),
        "recommendedAction": (
            "Validate whether the app still requires each granted permission. "
            "Remove delegated scopes that are unused or exceed documented need."
        ),
    },
    "HAS_HIGH_PRIVILEGE_PERMISSION": {
        "title": "Microsoft-confirmed high-privilege delegated scope",
        "summary": (
            "Microsoft's official permissions tiering data rates one or more delegated scopes "
            "at privilege level 4 or 5 (out of 5)."
        ),
        "impact": (
            "Microsoft's authoritative data confirms these scopes carry near-admin or admin-level "
            "privilege. Stolen tokens with these scopes provide significant tenant access."
        ),
        "checkNext": (
            "Review the specific high-privilege scopes listed in the reason message. "
            "Confirm admin consent was granted explicitly and intentionally."
        ),
        "falsePositiveNotes": (
            "Legitimate enterprise applications may require high-privilege scopes for their documented "
            "purpose. Confirm business justification is on file."
        ),
        "recommendedAction": (
            "Review and document the business case for each level-4 or level-5 delegated scope. "
            "Remove scopes that cannot be justified."
        ),
    },
    "OFFLINE_ACCESS_PERSISTENCE": {
        "title": "Refresh token (offline access) persistence",
        "summary": (
            "The app has been granted offline_access, enabling it to obtain refresh tokens "
            "and maintain persistent access beyond the initial sign-in session."
        ),
        "impact": (
            "Refresh tokens can persist for hours to weeks depending on Conditional Access policy. "
            "A stolen refresh token allows silent re-acquisition of access tokens."
        ),
        "checkNext": (
            "Confirm whether offline_access is required by the app's documented functionality. "
            "Review Conditional Access token lifetime policies."
        ),
        "falsePositiveNotes": (
            "Offline access is a standard requirement for apps that operate on behalf of users "
            "in background tasks such as mail sync or document processing."
        ),
        "recommendedAction": (
            "Confirm refresh token lifetime policies apply. "
            "Verify offline_access is intentional and required."
        ),
    },
    "ASSIGNED_TO": {
        "title": "App assigned to users or groups",
        "summary": (
            "The app has explicit assignments to users, service principals, or groups, "
            "approximating the reachable user population."
        ),
        "impact": (
            "The effective blast radius correlates with assignment count. "
            "Large or group-based assignments can imply broad reach even when assignment is required."
        ),
        "checkNext": (
            "Review the assignment list and confirm all assigned principals still require access. "
            "Verify groups are correctly scoped to current users."
        ),
        "falsePositiveNotes": (
            "Large assignment counts may reflect intended broad business access rather than a security issue."
        ),
        "recommendedAction": (
            "Remove unused app role assignments. "
            "Confirm group memberships are accurately scoped to current users who need access."
        ),
    },
    "BROAD_REACHABILITY": {
        "title": "Broadly reachable — assignment not required",
        "summary": (
            "The app does not require assignment (appRoleAssignmentRequired=false), "
            "so any user in the tenant can consent to and use it."
        ),
        "impact": (
            "Any tenant user can add this app to their account, potentially exposing delegated "
            "permissions or triggering phishing-style consent flows."
        ),
        "checkNext": (
            "Determine whether the app needs to be available to all users or should be scoped to "
            "specific groups. Review Conditional Access coverage for this app."
        ),
        "falsePositiveNotes": (
            "Some Microsoft-integrated productivity apps are intentionally broadly reachable by design. "
            "Confirm whether this is expected for the app's purpose."
        ),
        "recommendedAction": (
            "Require assignment if the app is not intended for all users. "
            "Review whether a Conditional Access policy limits access to authorized principals."
        ),
    },
    "PRIVILEGE": {
        "title": "Directory role assigned to this app",
        "summary": (
            "One or more Entra ID directory roles are assigned to this app's service principal, "
            "including potentially privileged Tier 0 or Tier 1 roles."
        ),
        "impact": (
            "An app with directory role assignments can perform tenant administration. "
            "A compromised app can take privileged administrative actions with no user involvement."
        ),
        "checkNext": (
            "Review each directory role assignment. "
            "Confirm whether Tier 0 (global control) roles are necessary. "
            "Check for PIM-eligible vs active assignments."
        ),
        "falsePositiveNotes": (
            "Some Microsoft first-party apps legitimately hold directory roles for service operation. "
            "Verify appOwnership before dismissing."
        ),
        "recommendedAction": (
            "Review privileged directory role assignments. "
            "Remove or reduce roles that are not required by the app's documented function."
        ),
    },
    "UNVERIFIED_PUBLISHER": {
        "title": "Publisher identity not verified",
        "summary": (
            "The app's publisher is not verified in Microsoft Partner Center, "
            "meaning the publisher's identity has not been validated by Microsoft."
        ),
        "impact": (
            "Unverified publishers have not completed identity validation. "
            "Absence of publisher verification removes a key trust signal that admins rely on during consent review."
        ),
        "checkNext": (
            "Confirm the publisher identity by reviewing the app's website, privacy policy, and consent screen. "
            "Verify the app is from a known, trusted vendor."
        ),
        "falsePositiveNotes": (
            "Internal apps (appOwnership=Internal) do not require publisher verification. "
            "New legitimate apps may not yet have completed verification."
        ),
        "recommendedAction": (
            "Confirm publisher identity and verified publisher status. "
            "Require publisher verification for future external apps before granting admin consent."
        ),
    },
    "DECEPTION": {
        "title": "Display name does not align with publisher identity",
        "summary": (
            "The app's display name and publisher name show significant mismatch, "
            "suggesting possible impersonation of a known brand or app."
        ),
        "impact": (
            "A deceptively named app can mislead users and admins into granting consent "
            "under the false belief the app is from a trusted vendor."
        ),
        "checkNext": (
            "Compare the display name with the publisher name and the app's registered domains. "
            "Search for the publisher in Microsoft Partner Center. "
            "Verify the consent screen appearance."
        ),
        "falsePositiveNotes": (
            "Some legitimate multi-product vendors use different names in their app registrations "
            "versus their display branding."
        ),
        "recommendedAction": (
            "Confirm publisher identity and verified publisher status. "
            "If the app cannot be attributed to a known publisher, revoke admin consent."
        ),
    },
    "IDENTITY_LAUNDERING": {
        "title": "App appears Microsoft-owned but is unverified",
        "summary": (
            "The app's appOwnerOrganizationId or publisherName suggests Microsoft ownership, "
            "but the app is not in Microsoft's first-party app catalog and the publisher is unverified."
        ),
        "impact": (
            "This pattern exploits user and admin trust in Microsoft branding to obtain consent "
            "to a third-party or potentially malicious app."
        ),
        "checkNext": (
            "Verify whether this is an official Microsoft app by checking the appId against "
            "Microsoft's known app catalog. "
            "Review the consent screen branding carefully."
        ),
        "falsePositiveNotes": (
            "Some legitimate apps use Microsoft-adjacent branding for integration contexts. "
            "This signal should be combined with other risk indicators before concluding malice."
        ),
        "recommendedAction": (
            "Validate app identity against Microsoft's official app registry. "
            "Revoke admin consent if attribution cannot be confirmed."
        ),
    },
    "MIXED_REPLYURL_DOMAINS": {
        "title": "Reply URLs span multiple unrelated domains",
        "summary": (
            "The app's reply URLs (OAuth2 redirect URIs) include domains that do not align "
            "with the app's primary vendor domain or branding."
        ),
        "impact": (
            "Redirect URI ownership is a critical OAuth security boundary. "
            "A reply URL pointing to an attacker-controlled domain enables authorization code or token theft."
        ),
        "checkNext": (
            "Review each reply URL domain and confirm ownership by the expected vendor. "
            "Check for domains that do not belong to the app publisher. "
            "Verify no outlier domains point to third-party infrastructure."
        ),
        "falsePositiveNotes": (
            "Apps with multiple legitimate product domains, CDN endpoints, or localized portals "
            "may intentionally use multiple reply URL domains. Confirm with the vendor."
        ),
        "recommendedAction": (
            "Review reply URL domains for ownership and expected vendor alignment. "
            "Remove reply URLs pointing to domains not owned by the app publisher."
        ),
    },
    "CREDENTIAL_HYGIENE": {
        "title": "Credential hygiene concern detected",
        "summary": (
            "The app has long-lived secrets (over 180 days), expired credentials still registered, "
            "multiple active secrets, or certificates approaching expiry."
        ),
        "impact": (
            "Long-lived or unused credentials increase the exposure window if a secret is compromised. "
            "Expired credentials remaining registered represent unnecessary attack surface."
        ),
        "checkNext": (
            "Review the credential list in Azure portal. "
            "Identify secrets older than 180 days, expired secrets, and duplicate active secrets. "
            "Confirm whether all active secrets are in use."
        ),
        "falsePositiveNotes": (
            "Automated rotation pipelines may have overlap windows with multiple active secrets. "
            "Confirm whether observed credential overlap is intentional."
        ),
        "recommendedAction": (
            "Rotate or remove stale credentials. "
            "Remove expired credentials from the registry. "
            "Establish a credential rotation policy."
        ),
    },
    "REPLY_URL_ANOMALIES": {
        "title": "Reply URL security anomaly detected",
        "summary": (
            "The app's reply URLs contain one or more security anomalies: "
            "non-HTTPS URLs, IP address literals, punycode/IDN domains, or wildcard domains."
        ),
        "impact": (
            "Non-HTTPS reply URLs expose OAuth codes to interception. "
            "IP literals and wildcard domains expand the attack surface for token theft via malicious redirect."
        ),
        "checkNext": (
            "Enumerate all reply URLs. "
            "Identify non-HTTPS, IP literal, punycode, and wildcard entries. "
            "Confirm whether each anomalous URL is intentional and required."
        ),
        "falsePositiveNotes": (
            "Development and test apps may use non-HTTPS or localhost URLs intentionally. "
            "IP literals may be required for on-premises integrations."
        ),
        "recommendedAction": (
            "Remove non-HTTPS reply URLs from production apps. "
            "Replace IP literals with DNS hostnames where possible. "
            "Avoid wildcard reply URLs."
        ),
    },
    "PUBLIC_CLIENT_FLOW_RISK": {
        "title": "Public client or implicit flow enabled",
        "summary": (
            "The app has public client flows or implicit grant flow (access token or ID token issuance) enabled."
        ),
        "impact": (
            "Public clients cannot securely store secrets. "
            "Implicit flow issues tokens directly in the URL fragment, "
            "exposing them to browser history and referrer leakage."
        ),
        "checkNext": (
            "Verify whether the app requires public client flows or implicit grant for its functionality. "
            "Check whether the app can migrate to authorization code flow with PKCE."
        ),
        "falsePositiveNotes": (
            "Mobile and native apps legitimately use public client flows with PKCE. "
            "Legacy SPAs may still depend on implicit flow. Confirm whether migration is feasible."
        ),
        "recommendedAction": (
            "Disable implicit flow if not required. "
            "Migrate to authorization code flow with PKCE for public clients."
        ),
    },
    "CREATED_BEFORE_CONSENT_HARDENING": {
        "title": "App predates consent hardening (pre-July 2025)",
        "summary": (
            "This app was registered before July 2025, when Microsoft began requiring admin approval "
            "for consent to apps from unverified publishers."
        ),
        "impact": (
            "The app may have been granted consent under weaker controls "
            "that pre-date the current consent governance model."
        ),
        "checkNext": (
            "Review when admin consent was granted. "
            "Confirm whether the app would pass current consent policy if re-consented today."
        ),
        "falsePositiveNotes": (
            "Most legitimate apps predating July 2025 were correctly onboarded with proper admin consent. "
            "App age alone is not an indicator of malice."
        ),
        "recommendedAction": (
            "Review admin consent and confirm business owner. "
            "Consider re-evaluating consent under current policy."
        ),
    },
    "CAN_IMPERSONATE": {
        "title": "Delegated impersonation capability present",
        "summary": (
            "The app holds user_impersonation or access_as_user style delegated scopes, "
            "allowing it to act on behalf of users."
        ),
        "impact": (
            "Impersonation grants allow the app to perform actions as any consenting user "
            "with the full scope of that user's permissions on the resource."
        ),
        "checkNext": (
            "Confirm whether impersonation is required by the app's functionality. "
            "Review the resource being accessed and the user population that has consented."
        ),
        "falsePositiveNotes": (
            "Some legitimate enterprise API integrations require user_impersonation "
            "to access on-behalf-of resources."
        ),
        "recommendedAction": (
            "Review whether impersonation is required. "
            "Confirm it is scoped to the minimum required user population."
        ),
    },
    "HAS_OWNERS_USER": {
        "title": "User principals have ownership of this app",
        "summary": (
            "One or more user principals are registered as owners of this app or service principal, "
            "granting them change authority over the object."
        ),
        "impact": (
            "App owners can add credentials, change reply URLs, and modify other security-relevant "
            "properties. User owners represent higher mutation risk than service principal owners."
        ),
        "checkNext": (
            "Review the current owner list. "
            "Confirm each owner is a current employee with a business need to modify this app."
        ),
        "falsePositiveNotes": (
            "App owners are expected for internally managed apps. "
            "This is primarily a governance signal rather than a security violation."
        ),
        "recommendedAction": (
            "Review app ownership and remove stale or unexpected owners. "
            "Consider managed identity or service principal ownership for production apps."
        ),
    },
    "GOVERNANCE": {
        "title": "App accessible without assignment requirement",
        "summary": (
            "The app does not require assignment, allowing any tenant user to discover "
            "and use it without explicit provisioning."
        ),
        "impact": (
            "Without assignment requirements, there is no administrative gate on which users "
            "access the app and its associated permissions."
        ),
        "checkNext": (
            "Determine whether the app's governance posture aligns with business policy. "
            "Verify whether a risk acceptance decision was made."
        ),
        "falsePositiveNotes": (
            "Broadly deployed productivity apps are intentionally configured without assignment requirements."
        ),
        "recommendedAction": (
            "Require assignment or document a governance decision accepting broad tenant reachability."
        ),
    },
    "REPLYURL_OUTLIER_DOMAIN": {
        "title": "Reply URL points to outlier domain",
        "summary": (
            "One or more reply URLs (OAuth2 redirect URIs) contain domains that are not "
            "part of the app's primary vendor domain set, as determined by outlier analysis."
        ),
        "impact": (
            "A reply URL on an outlier or unrecognised domain can redirect OAuth2 authorization "
            "codes or tokens to an attacker-controlled endpoint, enabling account takeover."
        ),
        "checkNext": (
            "Enumerate all reply URLs and confirm domain ownership for each outlier. "
            "Verify whether the domain belongs to the expected vendor. "
            "Check DNS and WHOIS records for the outlier domain."
        ),
        "falsePositiveNotes": (
            "CDN endpoints, regional portals, or acquired-company domains may produce outlier "
            "signals. Confirm with the vendor whether outlier domains are intentional."
        ),
        "recommendedAction": (
            "Remove reply URLs pointing to domains not owned by the app publisher. "
            "Restrict reply URLs to the minimum set required by the app's functionality."
        ),
    },
    "CREDENTIALS_PRESENT": {
        "title": "Credentials registered on this app",
        "summary": (
            "The app has key credentials (certificates) and/or password credentials (client secrets) "
            "registered, meaning it can authenticate as itself without user interaction."
        ),
        "impact": (
            "Apps with active credentials can acquire access tokens silently. "
            "If a credential is compromised, the attacker gains the full access of the app's "
            "granted permissions until the credential is revoked."
        ),
        "checkNext": (
            "Review the registered credentials in Azure portal. "
            "Confirm each credential is actively in use and owned by a known team. "
            "Check for unexpected credential additions in the audit log."
        ),
        "falsePositiveNotes": (
            "Most non-trivial service apps legitimately hold credentials to authenticate. "
            "Treat this as a credential inventory signal rather than a standalone risk."
        ),
        "recommendedAction": (
            "Audit all registered credentials. "
            "Remove credentials that are no longer in use. "
            "Prefer certificate credentials over password credentials."
        ),
    },
    "PASSWORD_CREDENTIALS_PRESENT": {
        "title": "Password credentials (client secrets) registered on this app",
        "summary": (
            "The app has one or more client secrets (password credentials) registered. "
            "Password credentials are symmetric keys that can be used to authenticate as the app."
        ),
        "impact": (
            "Client secrets are high-value credential material. "
            "A leaked or guessable secret allows an attacker to impersonate the app and "
            "exercise all of its granted permissions."
        ),
        "checkNext": (
            "Review each client secret in Azure portal. "
            "Check creation date, expiry, and responsible team. "
            "Review the audit log for unexpected secret additions. "
            "Assess whether secrets can be replaced with certificate credentials."
        ),
        "falsePositiveNotes": (
            "Client secrets are a standard authentication mechanism for service apps. "
            "Presence alone is not a risk; risk derives from hygiene and distribution."
        ),
        "recommendedAction": (
            "Rotate or remove stale client secrets. "
            "Prefer certificate credentials or workload identity federation where available. "
            "Establish a secret rotation policy."
        ),
    },
    "GOVERNANCE_UNKNOWN": {
        "title": "Governance posture unknown or indeterminate",
        "summary": (
            "The scanner was unable to determine the app's governance status — for example, "
            "whether assignment is required — due to missing or ambiguous data."
        ),
        "impact": (
            "Without a confirmed governance posture, it is unclear whether the app's reachability "
            "is intentionally broad or inadvertently misconfigured."
        ),
        "checkNext": (
            "Verify the app's appRoleAssignmentRequired setting in Azure portal. "
            "Confirm whether a governance decision has been documented for this app."
        ),
        "falsePositiveNotes": (
            "Governance data may be unavailable for first-party apps or apps with limited "
            "Graph API permissions at scan time."
        ),
        "recommendedAction": (
            "Confirm the app's assignment and governance settings. "
            "Document the governance decision in the app's access review record."
        ),
    },
    "EXTERNAL_IDENTITY_POSTURE_AMPLIFIER": {
        "title": "External identity posture amplifier detected",
        "summary": (
            "The app shows characteristics that amplify external identity risk — for example, "
            "combining governance ambiguity, credential presence, and broad reachability "
            "in a way that increases exposure to external identity abuse."
        ),
        "impact": (
            "Amplifier signals indicate the app sits at the intersection of multiple risk "
            "dimensions. Exploiting one vector may cascade to others, increasing the overall "
            "impact of a successful attack."
        ),
        "checkNext": (
            "Review this finding alongside all other reason codes for the same app. "
            "Assess whether the combination of signals represents an elevated composite risk. "
            "Determine whether the app's external-facing posture is intentional."
        ),
        "falsePositiveNotes": (
            "Amplifier signals are derived from the combination of other conditions. "
            "If the underlying conditions are individually accepted risks, "
            "the amplifier may also be acceptable."
        ),
        "recommendedAction": (
            "Address each contributing risk signal individually. "
            "Review the app's external access posture and confirm governance decisions."
        ),
    },
    "GOVERNS": {
        "title": "Governance edge: this app governs another service principal",
        "summary": (
            "The graph contains a GOVERNS edge from this app's service principal to another "
            "service principal, indicating a governance or authority relationship in the graph model."
        ),
        "impact": (
            "A GOVERNS relationship means a compromise of this app may allow influence over "
            "a downstream service principal's configuration, permissions, or credentials."
        ),
        "checkNext": (
            "Review the downstream service principals linked by GOVERNS edges. "
            "Confirm whether the governance relationship is intentional and documented. "
            "Assess the risk profile of governed service principals."
        ),
        "falsePositiveNotes": (
            "GOVERNS edges are constructed by the OID-See graph model from owner or role "
            "relationships. Review the underlying source relationship before treating this "
            "as a standalone risk."
        ),
        "recommendedAction": (
            "Review the ownership and governance chain for all governed service principals. "
            "Confirm that governance relationships reflect intended administrative authority."
        ),
    },
}

# Fallback template for unknown or undocumented reason codes
_FALLBACK_EVIDENCE: Dict[str, str] = {
    "title": "Risk indicator present",
    "summary": "A risk indicator was detected by the OID-See scanner.",
    "impact": "Review the associated risk reason code for details.",
    "checkNext": "Review the finding reason code and associated scanner output.",
    "falsePositiveNotes": "Review the specific context of this finding before acting.",
    "recommendedAction": "Review admin consent and confirm business owner.",
}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _finding_id(sp_id: str, reason_codes: List[str]) -> str:
    """Derive a stable, deterministic finding ID from the SP ID and sorted reason codes."""
    digest_input = sp_id + "|" + ",".join(sorted(reason_codes))
    return "oidf-" + hashlib.sha256(digest_input.encode()).hexdigest()[:12]


def _derive_confidence(reason_codes: List[str]) -> str:
    """Return the highest confidence level seen across all reason codes."""
    best = "low"
    for code in reason_codes:
        level = _REASON_CONFIDENCE.get(code, "low")
        if _CONFIDENCE_ORDER.get(level, 0) > _CONFIDENCE_ORDER.get(best, 0):
            best = level
    return best


def _build_evidence_block(reason: Dict[str, Any]) -> Dict[str, Any]:
    """Build a single evidence block for one reason entry from the export."""
    code = reason.get("code", "UNKNOWN")
    template = _REASON_EVIDENCE.get(code, _FALLBACK_EVIDENCE)
    message = reason.get("message", "")

    return {
        "reasonCode": code,
        "weight": reason.get("weight", 0),
        "title": template["title"],
        "summary": template["summary"],
        "scannerMessage": message,
        "impact": template["impact"],
        "checkNext": template["checkNext"],
        "falsePositiveNotes": template["falsePositiveNotes"],
    }


def _aggregate_recommended_actions(reason_codes: List[str]) -> str:
    """Aggregate recommended actions from all reason codes into a single string."""
    seen: List[str] = []
    for code in reason_codes:
        template = _REASON_EVIDENCE.get(code, _FALLBACK_EVIDENCE)
        action = template.get("recommendedAction", "")
        if action and action not in seen:
            seen.append(action)
    return " ".join(seen)


def _build_affected_relationships(
    node_id: str,
    edges: List[Dict[str, Any]],
    node_index: Dict[str, Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Return edges where this node is the source (outbound) or target (inbound).

    Args:
        node_id:    The graph node ID of the service principal being processed.
        edges:      All edges from the export.
        node_index: Mapping from node ID to node object, used to look up display names
                    for the other node on each edge.

    Each relationship includes:
    - direction: "outbound" (this node is ``from``) or "inbound" (this node is ``to``)
    - edgeId, edgeType, fromNodeId, toNodeId
    - otherNodeId: the node on the other end of the edge
    - otherNodeDisplayName: display name of the other node where available
    - Any extra edge properties beyond id/from/to/type are forwarded as-is.
    """
    result = []
    for edge in edges:
        from_id = edge.get("from")
        to_id = edge.get("to")
        if from_id == node_id:
            other_id = to_id
            direction = "outbound"
        elif to_id == node_id:
            other_id = from_id
            direction = "inbound"
        else:
            continue

        other_node = node_index.get(other_id) if other_id else None
        other_display = None
        if other_node:
            other_display = other_node.get("displayName") or (
                (other_node.get("properties") or {}).get("appDisplayName")
            )

        rel: Dict[str, Any] = {
            "direction": direction,
            "edgeId": edge.get("id"),
            "edgeType": edge.get("type"),
            "fromNodeId": from_id,
            "toNodeId": to_id,
            "otherNodeId": other_id,
            "otherNodeDisplayName": other_display,
        }

        # Forward any extra edge properties (properties key is common in some exports)
        extra = edge.get("properties")
        if extra and isinstance(extra, dict):
            rel["edgeProperties"] = extra

        result.append(rel)
    return result


def _extract_sp_fields(node: Dict[str, Any]) -> Dict[str, Any]:
    """Extract standard finding-level fields from a ServicePrincipal node."""
    props = node.get("properties") or {}
    vp = props.get("verifiedPublisher") or {}

    return {
        "displayName": node.get("displayName") or props.get("appDisplayName") or "",
        "appId": props.get("appId"),
        "servicePrincipalId": props.get("servicePrincipalId"),
        "publisherName": props.get("publisherName"),
        "verifiedPublisherId": vp.get("verifiedPublisherId") if isinstance(vp, dict) else None,
        "appOwnerOrganizationId": props.get("appOwnerOrganizationId"),
        "appOwnership": props.get("appOwnership"),
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def build_findings(
    export: Dict[str, Any],
    min_risk_level: str = "low",
) -> List[Dict[str, Any]]:
    """
    Build analyst-ready finding objects from an OID-See graph export.

    Findings are derived entirely from existing scanner output.  No independent
    scoring is performed.  Apps at or above ``min_risk_level`` that carry at
    least one scored reason code are included.

    ``NO_OWNERS`` is intentionally excluded from findings — it does not represent
    a security risk and is not included in scored reason codes.

    Args:
        export:         Parsed OID-See JSON export (dict).
        min_risk_level: Lowest risk level to include.  Defaults to "low"
                        (score >= 15).  Set to "info" to include all apps.

    Returns:
        List of finding dicts sorted by riskScore descending.
    """
    nodes: List[Dict[str, Any]] = export.get("nodes") or []
    edges: List[Dict[str, Any]] = export.get("edges") or []
    min_order = _RISK_LEVEL_ORDER.get(min_risk_level, 1)

    # Build a quick index from node.id → node for relationship lookups
    node_index: Dict[str, Dict[str, Any]] = {n["id"]: n for n in nodes if "id" in n}

    findings: List[Dict[str, Any]] = []

    for node in nodes:
        if node.get("type") != "ServicePrincipal":
            continue

        risk = node.get("risk") or {}
        score: int = risk.get("score", 0)
        level: str = risk.get("level", "info")

        if _RISK_LEVEL_ORDER.get(level, 0) < min_order:
            continue

        raw_reasons: List[Dict[str, Any]] = risk.get("reasons") or []

        # Exclude NO_OWNERS — it is governance context, not a security finding
        scored_reasons = [r for r in raw_reasons if r.get("code") != "NO_OWNERS"]

        if not scored_reasons:
            continue

        node_id_str: str = node.get("id", "")
        sp_fields = _extract_sp_fields(node)
        reason_codes = [r["code"] for r in scored_reasons if r.get("code")]

        evidence = [_build_evidence_block(r) for r in scored_reasons]
        confidence = _derive_confidence(reason_codes)
        recommended_action = _aggregate_recommended_actions(reason_codes)
        affected_relationships = _build_affected_relationships(node_id_str, edges, node_index)

        finding: Dict[str, Any] = {
            "findingId": _finding_id(sp_fields.get("servicePrincipalId") or node_id_str, reason_codes),
            "displayName": sp_fields["displayName"],
            "appId": sp_fields["appId"],
            "servicePrincipalId": sp_fields["servicePrincipalId"],
            "publisherName": sp_fields["publisherName"],
            "verifiedPublisherId": sp_fields["verifiedPublisherId"],
            "appOwnerOrganizationId": sp_fields["appOwnerOrganizationId"],
            "appOwnership": sp_fields["appOwnership"],
            "riskScore": score,
            "riskLevel": level,
            "reasonCodes": reason_codes,
            "evidence": evidence,
            "confidence": confidence,
            "recommendedAction": recommended_action,
            "falsePositiveNotes": (
                "Review each evidence item for specific false-positive context. "
                "Microsoft first-party apps (appOwnership=1st Party) are expected to hold "
                "privileged permissions and should not be flagged without additional indicators."
            ),
            "affectedRelationships": affected_relationships,
        }

        findings.append(finding)

    findings.sort(key=lambda f: f["riskScore"], reverse=True)
    return findings


def findings_to_csv_rows(findings: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """
    Flatten finding objects into CSV-compatible row dicts.

    Complex nested fields (evidence, affectedRelationships) are serialised as
    human-readable summary strings so that the CSV remains useful without a
    JSON parser.

    Args:
        findings: List of finding dicts from :func:`build_findings`.

    Returns:
        List of flat dicts suitable for :class:`csv.DictWriter`.
    """
    rows = []
    for f in findings:
        evidence_summary = "; ".join(
            e.get("title", "") for e in (f.get("evidence") or [])
        )
        affected_summary = "; ".join(
            "{direction} {edgeType}: {fromNodeId} -> {toNodeId}".format(
                direction=r.get("direction", ""),
                edgeType=r.get("edgeType", ""),
                fromNodeId=r.get("fromNodeId", ""),
                toNodeId=r.get("toNodeId", ""),
            )
            for r in (f.get("affectedRelationships") or [])
        )
        rows.append({
            "findingId": f.get("findingId", ""),
            "displayName": f.get("displayName", ""),
            "appId": f.get("appId", "") or "",
            "servicePrincipalId": f.get("servicePrincipalId", "") or "",
            "publisherName": f.get("publisherName", "") or "",
            "verifiedPublisherId": f.get("verifiedPublisherId", "") or "",
            "appOwnerOrganizationId": f.get("appOwnerOrganizationId", "") or "",
            "appOwnership": f.get("appOwnership", "") or "",
            "riskScore": str(f.get("riskScore", 0)),
            "riskLevel": f.get("riskLevel", ""),
            "reasonCodes": ",".join(f.get("reasonCodes") or []),
            "confidence": f.get("confidence", ""),
            "evidenceSummary": evidence_summary,
            "recommendedAction": f.get("recommendedAction", ""),
            "falsePositiveNotes": f.get("falsePositiveNotes", ""),
            "affectedRelationships": affected_summary,
        })
    return rows


CSV_FIELDNAMES = [
    "findingId",
    "displayName",
    "appId",
    "servicePrincipalId",
    "publisherName",
    "verifiedPublisherId",
    "appOwnerOrganizationId",
    "appOwnership",
    "riskScore",
    "riskLevel",
    "reasonCodes",
    "confidence",
    "evidenceSummary",
    "recommendedAction",
    "falsePositiveNotes",
    "affectedRelationships",
]


def findings_to_markdown(
    findings: List[Dict[str, Any]],
    tenant_display_name: str = "",
    generated_at: str = "",
) -> str:
    """
    Render finding objects as a Markdown document.

    Each finding becomes a top-level section with a metadata table, evidence
    bullets, and a recommended action callout.

    Args:
        findings:             List of finding dicts from :func:`build_findings`.
        tenant_display_name:  Optional tenant name for the report header.
        generated_at:         Optional ISO 8601 timestamp for the report header.

    Returns:
        Markdown string.
    """
    lines: List[str] = []

    title = "OID-See Findings Report"
    if tenant_display_name:
        title += f" — {tenant_display_name}"
    lines.append(f"# {title}")
    if generated_at:
        lines.append(f"\n_Generated: {generated_at}_")
    lines.append(
        f"\n**{len(findings)} finding(s)** — derived from OID-See risk reasons. "
        "All findings reflect existing scorer output; no independent scoring is performed."
    )
    lines.append("")

    if not findings:
        lines.append("_No findings above the minimum risk threshold._")
        return "\n".join(lines)

    for idx, f in enumerate(findings, start=1):
        level = f.get("riskLevel", "info").upper()
        name = f.get("displayName") or f.get("appId") or "Unknown App"
        lines.append(f"---\n")
        lines.append(f"## {idx}. [{level}] {name}")
        lines.append("")

        # Metadata table
        lines.append("| Field | Value |")
        lines.append("| --- | --- |")
        lines.append(f"| **Finding ID** | `{f.get('findingId', '')}` |")
        lines.append(f"| **App ID** | `{f.get('appId') or ''}` |")
        lines.append(f"| **Service Principal ID** | `{f.get('servicePrincipalId') or ''}` |")
        lines.append(f"| **Publisher** | {f.get('publisherName') or '_unknown_'} |")
        lines.append(f"| **Verified Publisher ID** | {f.get('verifiedPublisherId') or '_none_'} |")
        lines.append(f"| **App Owner Org ID** | {f.get('appOwnerOrganizationId') or '_unknown_'} |")
        lines.append(f"| **Ownership** | {f.get('appOwnership') or '_unknown_'} |")
        lines.append(f"| **Risk Score** | **{f.get('riskScore', 0)}** / 100 |")
        lines.append(f"| **Risk Level** | {level} |")
        lines.append(f"| **Confidence** | {f.get('confidence', '')} |")
        lines.append(f"| **Reason Codes** | `{'`, `'.join(f.get('reasonCodes') or [])}` |")
        lines.append("")

        # Evidence blocks
        evidence = f.get("evidence") or []
        if evidence:
            lines.append("### Evidence")
            lines.append("")
            for ev in evidence:
                lines.append(f"#### {ev.get('title', ev.get('reasonCode', ''))} (weight: {ev.get('weight', 0)})")
                lines.append("")
                lines.append(f"**Summary:** {ev.get('summary', '')}")
                lines.append("")
                if ev.get("scannerMessage"):
                    lines.append(f"**Scanner message:** _{ev['scannerMessage']}_")
                    lines.append("")
                lines.append(f"**Impact:** {ev.get('impact', '')}")
                lines.append("")
                lines.append(f"**Check next:** {ev.get('checkNext', '')}")
                lines.append("")
                lines.append(f"**False positive notes:** {ev.get('falsePositiveNotes', '')}")
                lines.append("")

        # Recommended action
        action = f.get("recommendedAction", "")
        if action:
            lines.append("### Recommended Action")
            lines.append("")
            lines.append(action)
            lines.append("")

        rels = f.get("affectedRelationships") or []
        if rels:
            lines.append("### Affected Relationships")
            lines.append("")
            for r in rels:
                direction = r.get("direction", "")
                edge_type = r.get("edgeType", "")
                from_id = r.get("fromNodeId", "")
                to_id = r.get("toNodeId", "")
                other_display = r.get("otherNodeDisplayName")
                edge_id = r.get("edgeId", "")
                display_suffix = f" ({other_display})" if other_display else ""
                lines.append(
                    f"- [{direction}] `{edge_type}`: `{from_id}` → `{to_id}`{display_suffix}"
                    f" (edge `{edge_id}`)"
                )
            lines.append("")

    return "\n".join(lines)

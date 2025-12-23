#!/usr/bin/env python3
"""
OID-See Graph Scanner (Microsoft Graph only)

Collects Entra / Microsoft Graph objects required to populate an OID-See export:
- Service principals (focused on multi-tenant / third-party by default)
- Related application objects (where available in-tenant)
- Delegated permission grants (oauth2PermissionGrants)
- Application permission grants (appRoleAssignments)
- Assignments to apps (appRoleAssignedTo)
- Owners
- Directory role assignments to apps (roleManagement/directory/roleAssignments)
- Resource service principals referenced by grants (e.g., Microsoft Graph)

Anything that is *not* available purely via Microsoft Graph (WHOIS, eTLD checks, DNS, etc.)
is left as a placeholder in the export (keys present, value null / empty).

Auth:
- Device Code (delegated)
- Client Secret (application)

NOTE on semantics:
- `offline_access` is treated as *persistence* (refresh tokens), not impersonation.
- "Impersonation" edges are only emitted for explicit `user_impersonation`-style scopes or
  `access_as_user`-style scopes, not for all delegated scopes.

Output:
- Writes a JSON file that should validate against `oidsee-graph-export.schema.json`.

"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

import requests
import random
import tldextract
from azure.identity import ClientSecretCredential, DeviceCodeCredential


GRAPH_BETA = "https://graph.microsoft.com/beta"
GRAPH_V1 = "https://graph.microsoft.com/v1.0"
AZURE_CLI_CLIENT_ID = "04b07795-8ddb-461a-bbee-02f9e1bf7b46"

# -----------------------------
# Scoring configuration loader
# -----------------------------

# Fallback defaults in case JSON file is missing or malformed
DEFAULT_SCORING_CONFIG = {
    "classify_app_role_value": {
        "weights": {
            "high_write_markers": 50,
            "high_read_markers": 25,
            "default": 35
        },
        "markers": {
            "high_write_markers": [
                "directory.readwrite",
                "directory.access",
                "rolemanagement.readwrite",
                "mail.readwrite",
                "files.readwrite",
                "sites.fullcontrol",
                "sites.readwrite",
                "group.readwrite",
                "reports.readwrite",
                "device.readwrite",
                "user.readwrite"
            ],
            "high_read_markers": [
                "directory.read.all",
                "auditlog.read",
                "mail.read",
                "files.read",
                "sites.read",
                "group.read.all",
                "reports.read.all",
                "user.read.all"
            ]
        }
    },
    "classify_scopes": {
        "scope_classifications": {
            "too_broad": {
                "condition": "scope ends with '.All'",
                "edge_type": "HAS_TOO_MANY_SCOPES",
                "classification_label": "too_broad"
            },
            "privileged": {
                "condition": "scope contains 'write' or 'readwrite'",
                "edge_type": "HAS_PRIVILEGED_SCOPES",
                "classification_label": "privileged"
            },
            "regular": {
                "edge_type": "HAS_SCOPES",
                "classification_label": "regular"
            }
        }
    },
    "compute_risk_for_sp": {
        "scoring_contributors": {
            "CAN_IMPERSONATE": {
                "weight": 40,
                "description": "Delegated impersonation markers present (access_as_user/user_impersonation)"
            },
            "HAS_APP_ROLE": {
                "weight": 35,
                "description": "Application permissions (app roles) granted"
            },
            "HAS_PRIVILEGED_SCOPES": {
                "weight": 20,
                "description": "Privileged delegated scopes granted"
            },
            "HAS_TOO_MANY_SCOPES": {
                "weight": 15,
                "description": "Delegated consent is overly broad"
            },
            "PERSISTENCE": {
                "weight": 15,
                "description": "offline_access delegated grant allows refresh tokens"
            },
            "ASSIGNED_TO": {
                "reachable_users_thresholds": [
                    {"threshold": 100, "weight": 25},
                    {"threshold": 20, "weight": 15},
                    {"threshold": 5, "weight": 10},
                    {"threshold": 0, "weight": 5}
                ],
                "description": "App is assigned to principals approximating accessible users"
            },
            "BROAD_REACHABILITY": {
                "weight": 15,
                "description": "No assignments but appRoleAssignmentRequired=false implies broad reach"
            },
            "PRIVILEGE": {
                "base_weight": 10,
                "per_role_weight": 5,
                "max_weight": 30,
                "description": "Directory roles reachable from app depends on assignments"
            },
            "DECEPTION": {
                "weight": 20,
                "description": "Unverified publisher with name mismatch between publisher and display name"
            },
            "MIXED_REPLYURL_DOMAINS": {
                "identity_laundering_weight": 15,
                "identity_laundering_description": "Identity laundering signal: reply URLs use domains not aligned with homepage/branding",
                "attribution_ambiguity_weight": 5,
                "attribution_ambiguity_description": "Attribution ambiguity: multiple distinct domains in reply URLs"
            },
            "LEGACY": {
                "weight": 10,
                "description": "App created before July 2025",
                "cutoff_date": "2025-07-01T00:00:00Z"
            },
            "NO_OWNERS": {
                "weight": 15,
                "description": "No owners found for application"
            },
            "GOVERNANCE": {
                "weight": 5,
                "description": "Assignments not required for app governance"
            },
            "GOVERNANCE_UNKNOWN": {
                "weight": 3,
                "description": "Assignment requirement unknown"
            }
        },
        "final_score_limitation": {
            "min_max_clamping": {
                "minimum_allowed_score": 0,
                "maximum_allowed_score": 100
            },
            "score_buckets": {
                "critical": 85,
                "high": 60,
                "medium": 35,
                "low": 15
            }
        }
    }
}

def load_scoring_config(config_path: str = "scoring_logic.json") -> Dict[str, Any]:
    """
    Load scoring configuration from JSON file with error handling.
    Falls back to hardcoded defaults if file is missing or malformed.
    """
    # Try to find the config file relative to this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_file = os.path.join(script_dir, config_path)
    
    try:
        with open(config_file, "r", encoding="utf-8") as f:
            config = json.load(f)
            print(f"✓ Loaded scoring configuration from {config_path}", file=sys.stderr)
            return config
    except FileNotFoundError:
        print(f"⚠️  Scoring config file '{config_path}' not found, using defaults", file=sys.stderr)
        return DEFAULT_SCORING_CONFIG
    except json.JSONDecodeError as e:
        print(f"⚠️  Invalid JSON in '{config_path}': {e}, using defaults", file=sys.stderr)
        return DEFAULT_SCORING_CONFIG
    except Exception as e:
        print(f"⚠️  Error loading '{config_path}': {e}, using defaults", file=sys.stderr)
        return DEFAULT_SCORING_CONFIG

# Load the scoring configuration at module level
SCORING_CONFIG = load_scoring_config()


# -----------------------------
# Graph client
# -----------------------------

class GraphClient:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.credential = None
        self._token: Optional[str] = None
        self._token_expires: float = 0.0
        self.max_retries: int = 6
        self.base_delay: float = 0.8

    class GraphNotFound(Exception):
        pass

    def authenticate_device_code(self, client_id: str) -> None:
        self.credential = DeviceCodeCredential(
            tenant_id=self.tenant_id,
            client_id=client_id,
            timeout=900,
        )
        print("Requesting device code for interactive login...", file=sys.stderr)
        # prime token
        _ = self._get_token()
        print(f"✓ Authenticated via device code for client_id={client_id}", file=sys.stderr)

    def authenticate_client_secret(self, client_id: str, client_secret: str) -> None:
        self.credential = ClientSecretCredential(
            tenant_id=self.tenant_id,
            client_id=client_id,
            client_secret=client_secret,
        )
        _ = self._get_token()
        print(f"✓ Authenticated via client secret for client_id={client_id}", file=sys.stderr)

    def _get_token(self) -> str:
        if not self.credential:
            raise RuntimeError("Not authenticated. Call authenticate_* first.")
        now = time.time()
        if self._token and now < (self._token_expires - 60):
            return self._token

        tok = self.credential.get_token("https://graph.microsoft.com/.default")
        self._token = tok.token
        # tok.expires_on is epoch seconds (azure-identity)
        self._token_expires = float(tok.expires_on) if getattr(tok, "expires_on", None) else (now + 3000)
        return self._token

    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self._get_token()}", "Content-Type": "application/json"}

    def _request(self, method: str, url: str, *, params: Optional[Dict[str, Any]] = None, json: Optional[Dict[str, Any]] = None, timeout: int = 60) -> Dict[str, Any]:
        last_err: Optional[str] = None
        for attempt in range(self.max_retries):
            try:
                r = requests.request(method, url, headers=self._headers(), params=params, json=json, timeout=timeout)
            except requests.RequestException as e:
                last_err = f"{type(e).__name__}: {e}"
                # network/transient error -> backoff
                delay = self.base_delay * (2 ** attempt) + random.uniform(0, 0.3)
                time.sleep(delay)
                continue

            if r.status_code in (429, 503):
                # throttle/backoff with Retry-After when present
                ra = r.headers.get("Retry-After")
                try:
                    delay = float(ra) if ra is not None else (self.base_delay * (2 ** attempt))
                except Exception:
                    delay = self.base_delay * (2 ** attempt)
                delay = max(delay, self.base_delay) + random.uniform(0, 0.5)
                time.sleep(delay)
                continue

            if r.status_code == 404:
                raise GraphClient.GraphNotFound(f"404 Not Found: {url}")

            if r.status_code >= 400:
                last_err = f"HTTP {r.status_code}: {r.text[:500]}"
                # retry other 5xx
                if 500 <= r.status_code < 600 and attempt < self.max_retries - 1:
                    delay = self.base_delay * (2 ** attempt) + random.uniform(0, 0.3)
                    time.sleep(delay)
                    continue
                raise RuntimeError(f"Graph {method} failed: {last_err}")

            try:
                return r.json()
            except ValueError:
                return {}

        raise RuntimeError(f"Graph {method} failed after retries: {last_err or 'unknown error'}")

    def get(self, url: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return self._request("GET", url, params=params)

    def post(self, url: str, json: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return self._request("POST", url, params=params, json=json)

    def get_paged(self, url: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Follow @odata.nextLink and return aggregated 'value'. Handles throttling."""
        out: List[Dict[str, Any]] = []
        next_url = url
        next_params = params
        while next_url:
            data = self.get(next_url, params=next_params)
            out.extend(data.get("value", []))
            next_url = data.get("@odata.nextLink")
            next_params = None  # nextLink already includes query
        return out


# -----------------------------
# OID-See graph model helpers
# -----------------------------

def utc_now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sanitize_name_for_id(name: str) -> str:
    """Convert display name to ID-safe format: lowercase, replace spaces/special chars with hyphens."""
    if not name:
        return "unknown"
    import re
    # Replace non-alphanumeric with hyphens, collapse multiple hyphens, strip edges
    safe = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return safe[:50] if safe else "unknown"  # Cap length


def node_id(kind: str, identifier: str, display_name: Optional[str] = None) -> str:
    """Generate node ID using display name if available, falling back to identifier."""
    if display_name:
        return f"{kind}:{sanitize_name_for_id(display_name)}"
    return f"{kind}:{identifier}"


def make_node(nid: str, ntype: str, display_name: str, props: Dict[str, Any]) -> Dict[str, Any]:
    return {"id": nid, "type": ntype, "displayName": display_name, "properties": props}


def make_edge(src: str, dst: str, etype: str, props: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    # Human-friendly, type-related edge id using display names from node IDs
    TYPE_ID_MAP = {
        "INSTANCE_OF": "instance",
        "OWNS": "own",
        "MEMBER_OF": "member",
        "HAS_SCOPES": "scope",
        "HAS_PRIVILEGED_SCOPES": "privileged-scope",
        "HAS_TOO_MANY_SCOPES": "too-many-scopes",
        "HAS_ROLE": "role",
        "ASSIGNED_TO": "assigned",
        "CAN_IMPERSONATE": "impersonate",
        # Non-schema helpers kept readable
        "HAS_APP_ROLE": "app-role",
        "HAS_OFFLINE_ACCESS": "persistence",
    }
    def _extract_name(ref: str) -> str:
        # Extract the display name part after ':' from node ID
        return (ref or "").split(":", 1)[-1]
    
    friendly = TYPE_ID_MAP.get(etype, etype.lower().replace("_", "-"))
    base_id = f"e-{friendly}-{_extract_name(src)}-{_extract_name(dst)}"
    
    # For edge types that can have multiple instances between the same nodes,
    # append a differentiating attribute to ensure unique IDs
    props = props or {}
    suffix = ""
    
    if etype == "ASSIGNED_TO" and "appRoleId" in props:
        # Multiple assignments can exist between the same principal and app with different appRoleIds
        suffix = f"-{props['appRoleId']}"
    elif etype == "HAS_APP_ROLE" and "resourceId" in props:
        # Multiple app roles can exist between the same SP and different role nodes
        suffix = f"-{props['resourceId']}"
    elif etype == "INSTANCE_OF" and "servicePrincipalId" in props:
        # Multiple SPs can instance the same Application (e.g., multi-tenant apps)
        # Use SP ID to differentiate when SP display names collide
        suffix = f"-{props['servicePrincipalId']}"
    
    eid = base_id + suffix
    return {"id": eid, "from": src, "to": dst, "type": etype, "properties": props}


def is_verified_publisher(vp: Optional[Dict[str, Any]]) -> bool:
    if not vp:
        return False
    return bool(vp.get("verifiedPublisherId"))


def safe_get(d: Dict[str, Any], *keys: str, default=None):
    cur: Any = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k)
    return cur if cur is not None else default


# -----------------------------
# Directory object resolution
# -----------------------------

def chunked(seq: List[str], n: int) -> Iterable[List[str]]:
    for i in range(0, len(seq), n):
        yield seq[i:i+n]


class DirectoryCache:
    """Resolves directoryObjects by id with batching."""
    def __init__(self, graph: GraphClient):
        self.graph = graph
        self._cache: Dict[str, Dict[str, Any]] = {}

    def get_many(self, ids: Set[str]) -> None:
        unknown = [i for i in ids if i and i not in self._cache]
        if not unknown:
            return
        # /directoryObjects/getByIds supports up to 1000 ids but keep it conservative
        for batch in chunked(unknown, 500):
            body = {"ids": batch, "types": ["user", "group", "servicePrincipal", "directoryRole"]}
            try:
                data = self.graph.post(f"{GRAPH_V1}/directoryObjects/getByIds", json=body)
            except GraphClient.GraphNotFound:
                # getByIds won't 404 on batch; ignore
                data = {"value": []}
            for obj in data.get("value", []):
                oid = obj.get("id")
                if oid:
                    self._cache[oid] = obj

    def get(self, oid: str) -> Optional[Dict[str, Any]]:
        return self._cache.get(oid)


# -----------------------------
# Risk heuristics (lightweight)
# -----------------------------

HIGH_RISK_DELEGATED = {
    # not exhaustive; extend later
    "Directory.AccessAsUser.All",
    "Directory.ReadWrite.All",
    "RoleManagement.ReadWrite.Directory",
    "User.ReadWrite.All",
    "Mail.ReadWrite",
    "Mail.Read",
    "offline_access",  # persistence (separately tagged)
}

IMPERSONATION_MARKERS = {"user_impersonation", "access_as_user"}


def classify_app_role_value(name: Optional[str]) -> int:
    """Classify app role value based on loaded configuration."""
    config = SCORING_CONFIG.get("classify_app_role_value", {})
    weights = config.get("weights", {})
    markers = config.get("markers", {})
    
    default_weight = weights.get("default", 35)
    
    if not name:
        return default_weight
    
    n = name.lower()
    
    # Check high write markers
    high_write_markers = markers.get("high_write_markers", [])
    high_write_weight = weights.get("high_write_markers", 50)
    if any(m in n for m in high_write_markers):
        return high_write_weight
    
    # Check high read markers
    high_read_markers = markers.get("high_read_markers", [])
    high_read_weight = weights.get("high_read_markers", 25)
    if any(m in n for m in high_read_markers):
        return high_read_weight
    
    return default_weight


def classify_scopes(scopes: Set[str]) -> Dict[str, Any]:
    """Classify scopes and determine appropriate edge type based on loaded configuration."""
    config = SCORING_CONFIG.get("classify_scopes", {})
    classifications = config.get("scope_classifications", {})
    
    too_broad = []
    privileged = []
    regular = []
    
    for scope in scopes:
        scope_lower = scope.lower()
        # Check for too broadly scoped (.All)
        if scope_lower.endswith(".all"):
            too_broad.append(scope)
        # Check for privileged (write/readwrite)
        elif "write" in scope_lower or "readwrite" in scope_lower:
            privileged.append(scope)
        else:
            regular.append(scope)
    
    # Determine edge type based on classification using config
    too_broad_config = classifications.get("too_broad", {})
    privileged_config = classifications.get("privileged", {})
    regular_config = classifications.get("regular", {})
    
    if too_broad:
        edge_type = too_broad_config.get("edge_type", "HAS_TOO_MANY_SCOPES")
        classification = too_broad_config.get("classification_label", "too_broad")
    elif privileged:
        edge_type = privileged_config.get("edge_type", "HAS_PRIVILEGED_SCOPES")
        classification = privileged_config.get("classification_label", "privileged")
    else:
        edge_type = regular_config.get("edge_type", "HAS_SCOPES")
        classification = regular_config.get("classification_label", "regular")
    
    return {
        "edge_type": edge_type,
        "classification": classification,
        "too_broad": too_broad,
        "privileged": privileged,
        "regular": regular,
    }


def _parse_iso_datetime(value: Optional[str]) -> Optional[dt.datetime]:
    if not value:
        return None
    try:
        val = value.replace("Z", "+00:00")
        return dt.datetime.fromisoformat(val)
    except Exception:
        return None


def analyze_credentials(
    password_creds: List[Dict[str, Any]],
    key_creds: List[Dict[str, Any]],
    federated_creds: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Analyze credential health and hygiene.
    
    Returns insights about:
    - Long-lived secrets (>180 days)
    - Expired but present credentials
    - Multiple active secrets
    - Certificate rollover hygiene
    """
    now = dt.datetime.now(dt.timezone.utc)
    insights = {
        "total_password_credentials": len(password_creds),
        "total_key_credentials": len(key_creds),
        "total_federated_credentials": len(federated_creds) if federated_creds else 0,
        "active_password_credentials": 0,
        "active_key_credentials": 0,
        "expired_password_credentials": 0,
        "expired_key_credentials": 0,
        "long_lived_secrets": [],
        "expired_but_present": [],
        "certificate_rollover_issues": [],
    }
    
    # Analyze password credentials
    for cred in password_creds:
        start_dt = _parse_iso_datetime(cred.get("startDateTime"))
        end_dt = _parse_iso_datetime(cred.get("endDateTime"))
        
        if end_dt and end_dt < now:
            insights["expired_password_credentials"] += 1
            insights["expired_but_present"].append({
                "type": "password",
                "displayName": cred.get("displayName"),
                "keyId": cred.get("keyId"),
                "endDateTime": cred.get("endDateTime"),
            })
        else:
            insights["active_password_credentials"] += 1
            # Check for long-lived secrets (>180 days)
            if start_dt and end_dt:
                lifetime = (end_dt - start_dt).days
                if lifetime > 180:
                    insights["long_lived_secrets"].append({
                        "type": "password",
                        "displayName": cred.get("displayName"),
                        "keyId": cred.get("keyId"),
                        "lifetime_days": lifetime,
                        "endDateTime": cred.get("endDateTime"),
                    })
    
    # Analyze key credentials (certificates)
    for cred in key_creds:
        start_dt = _parse_iso_datetime(cred.get("startDateTime"))
        end_dt = _parse_iso_datetime(cred.get("endDateTime"))
        
        if end_dt and end_dt < now:
            insights["expired_key_credentials"] += 1
            insights["expired_but_present"].append({
                "type": "certificate",
                "displayName": cred.get("displayName"),
                "keyId": cred.get("keyId"),
                "endDateTime": cred.get("endDateTime"),
            })
        else:
            insights["active_key_credentials"] += 1
            # Check certificate expiry within 30 days
            if end_dt and (end_dt - now).days <= 30:
                insights["certificate_rollover_issues"].append({
                    "displayName": cred.get("displayName"),
                    "keyId": cred.get("keyId"),
                    "endDateTime": cred.get("endDateTime"),
                    "days_until_expiry": (end_dt - now).days,
                })
    
    return insights


def analyze_reply_urls(reply_urls: List[str]) -> Dict[str, Any]:
    """
    Analyze reply URLs for security and consistency issues.
    
    Returns:
    - Normalized URLs with scheme + host + eTLD+1
    - Flags for non-HTTPS schemes, IP literals, localhost, punycode
    - Domain cluster summary
    """
    analysis = {
        "total_urls": len(reply_urls),
        "normalized_domains": set(),
        "non_https_urls": [],
        "ip_literal_urls": [],
        "localhost_urls": [],
        "punycode_urls": [],
        "schemes": set(),
    }
    
    for url in reply_urls:
        if not url:
            continue
            
        # Parse URL components
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            
            # Track schemes
            if parsed.scheme:
                analysis["schemes"].add(parsed.scheme)
            
            # Flag non-HTTPS
            if parsed.scheme and parsed.scheme.lower() not in ("https",):
                analysis["non_https_urls"].append(url)
            
            # Check for IP literals and localhost
            hostname = parsed.hostname or parsed.netloc
            if hostname:
                # Simple IP detection (IPv4)
                import re
                is_ip_literal = False
                if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', hostname):
                    analysis["ip_literal_urls"].append(url)
                    is_ip_literal = True
                # IPv6 in brackets
                if hostname.startswith('[') and hostname.endswith(']'):
                    analysis["ip_literal_urls"].append(url)
                    is_ip_literal = True
                # Localhost (can be IP or name)
                if hostname.lower() in ('localhost', '127.0.0.1', '::1'):
                    analysis["localhost_urls"].append(url)
                # Punycode (IDN)
                elif 'xn--' in hostname.lower():
                    analysis["punycode_urls"].append(url)
            
            # Extract eTLD+1 for domain clustering
            domain = extract_etldplus1(url)
            if domain:
                analysis["normalized_domains"].add(domain)
        except Exception:
            # Skip malformed URLs
            continue
    
    # Convert sets to lists for JSON serialization
    analysis["normalized_domains"] = sorted(analysis["normalized_domains"])
    analysis["schemes"] = sorted(analysis["schemes"])
    
    return analysis


def resolve_permission_details(
    resource_sp: Dict[str, Any],
    scope_names: Optional[Set[str]] = None,
    app_role_ids: Optional[Set[str]] = None,
) -> Dict[str, Any]:
    """
    Resolve OAuth2 scopes and app roles to human-readable details.
    
    Returns:
    - Resolved scopes with displayName, description, admin/user consent
    - Resolved app roles with displayName, description, allowedMemberTypes
    - Resource app identification
    """
    result = {
        "resource_app_id": resource_sp.get("appId"),
        "resource_display_name": resource_sp.get("displayName") or resource_sp.get("appDisplayName"),
        "resolved_scopes": [],
        "resolved_app_roles": [],
    }
    
    # Resolve OAuth2 scopes
    if scope_names:
        published_scopes = resource_sp.get("publishedPermissionScopes") or resource_sp.get("oauth2PermissionScopes") or []
        scopes_by_value = {s.get("value"): s for s in published_scopes if s.get("value")}
        
        for scope_name in scope_names:
            scope_info = scopes_by_value.get(scope_name)
            if scope_info:
                result["resolved_scopes"].append({
                    "value": scope_name,
                    "id": scope_info.get("id"),
                    "displayName": scope_info.get("adminConsentDisplayName") or scope_info.get("value"),
                    "description": scope_info.get("adminConsentDescription") or scope_info.get("userConsentDescription"),
                    "adminConsentDisplayName": scope_info.get("adminConsentDisplayName"),
                    "adminConsentDescription": scope_info.get("adminConsentDescription"),
                    "userConsentDisplayName": scope_info.get("userConsentDisplayName"),
                    "userConsentDescription": scope_info.get("userConsentDescription"),
                    "type": scope_info.get("type"),
                    "isEnabled": scope_info.get("isEnabled"),
                })
            else:
                # Scope not found in resource - include basic info
                result["resolved_scopes"].append({
                    "value": scope_name,
                    "displayName": scope_name,
                    "description": None,
                })
    
    # Resolve app roles
    if app_role_ids:
        app_roles = resource_sp.get("appRoles") or []
        roles_by_id = {r.get("id"): r for r in app_roles if r.get("id")}
        
        for role_id in app_role_ids:
            role_info = roles_by_id.get(role_id)
            if role_info:
                result["resolved_app_roles"].append({
                    "id": role_id,
                    "value": role_info.get("value"),
                    "displayName": role_info.get("displayName"),
                    "description": role_info.get("description"),
                    "allowedMemberTypes": role_info.get("allowedMemberTypes"),
                    "isEnabled": role_info.get("isEnabled"),
                })
            else:
                # Role not found in resource
                result["resolved_app_roles"].append({
                    "id": role_id,
                    "displayName": None,
                    "description": None,
                })
    
    return result


def extract_etldplus1(url: Optional[str]) -> Optional[str]:
    """
    Extract the eTLD+1 (registrable domain) from a URL.
    Returns None if extraction fails or URL is invalid.
    
    Examples:
        "https://app.contoso.com/callback" -> "contoso.com"
        "http://subdomain.example.co.uk/path" -> "example.co.uk"
        "https://localhost:5000" -> None (localhost is not a registrable domain)
    """
    if not url:
        return None
    
    try:
        extracted = tldextract.extract(url)
        # Only return a valid registrable domain (domain + suffix)
        # Skip if domain is empty or if it's a localhost/IP
        if extracted.domain and extracted.suffix:
            return f"{extracted.domain}.{extracted.suffix}"
        return None
    except Exception:
        return None


def check_mixed_replyurl_domains(
    reply_urls: List[str],
    homepage: Optional[str],
    info: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Check for mixed reply URL domains - a potential attribution ambiguity 
    or identity laundering signal.
    
    Returns a dict with:
        - "has_mixed_domains": bool
        - "domains": set of distinct eTLD+1 domains found
        - "non_aligned_domains": set of domains not aligned with homepage/branding
        - "signal_type": "attribution_ambiguity" | "identity_laundering" | None
    
    Signal types:
        - "attribution_ambiguity": Multiple distinct domains, but all align with homepage/info
        - "identity_laundering": At least one domain does not align with homepage/info
    """
    if not reply_urls:
        return {
            "has_mixed_domains": False,
            "domains": [],
            "non_aligned_domains": [],
            "signal_type": None,
        }
    
    # Extract domains from all reply URLs
    domains = set()
    for url in reply_urls:
        domain = extract_etldplus1(url)
        if domain:
            domains.add(domain)
    
    # If only one domain or no valid domains, no mixed domain issue
    if len(domains) <= 1:
        return {
            "has_mixed_domains": False,
            "domains": sorted(domains),
            "non_aligned_domains": [],
            "signal_type": None,
        }
    
    # Extract reference domains from homepage and branding info
    reference_domains = set()
    
    # Check homepage
    if homepage:
        homepage_domain = extract_etldplus1(homepage)
        if homepage_domain:
            reference_domains.add(homepage_domain)
    
    # Check info.marketingUrl and other branding fields
    if info:
        marketing_url = info.get("marketingUrl")
        if marketing_url:
            marketing_domain = extract_etldplus1(marketing_url)
            if marketing_domain:
                reference_domains.add(marketing_domain)
        
        # Also check privacyStatementUrl, termsOfServiceUrl as potential branding indicators
        privacy_url = info.get("privacyStatementUrl")
        if privacy_url:
            privacy_domain = extract_etldplus1(privacy_url)
            if privacy_domain:
                reference_domains.add(privacy_domain)
        
        tos_url = info.get("termsOfServiceUrl")
        if tos_url:
            tos_domain = extract_etldplus1(tos_url)
            if tos_domain:
                reference_domains.add(tos_domain)
    
    # Find domains that don't align with any reference domains
    non_aligned_domains = domains - reference_domains if reference_domains else domains
    
    # Determine signal type
    signal_type = None
    if len(domains) > 1:
        if non_aligned_domains:
            # At least one domain doesn't align - potential identity laundering
            signal_type = "identity_laundering"
        else:
            # Multiple domains but all align - attribution ambiguity
            signal_type = "attribution_ambiguity"
    
    # Convert sets to lists for JSON serialization
    return {
        "has_mixed_domains": True,
        "domains": sorted(domains),
        "non_aligned_domains": sorted(non_aligned_domains),
        "signal_type": signal_type,
    }


def _level_from_score(score: int) -> str:
    """Determine risk level from score based on loaded configuration."""
    config = SCORING_CONFIG.get("compute_risk_for_sp", {})
    score_buckets = config.get("final_score_limitation", {}).get("score_buckets", {})
    
    # Handle both numeric and string formats in the JSON
    def get_threshold(key, default):
        value = score_buckets.get(key, default)
        if isinstance(value, str):
            # Parse strings like "score >= 85" or "85 > score >= 60" to extract the lower bound
            # Find the last number with >= before it (the lower bound)
            matches = re.findall(r'>=\s*(\d+)', value)
            if matches:
                return int(matches[-1])  # Use the last match (lower bound)
            # If no >=, try to extract any number
            matches = re.findall(r'\d+', value)
            return int(matches[0]) if matches else default
        return int(value)
    
    critical_threshold = get_threshold("critical", 85)
    high_threshold = get_threshold("high", 60)
    medium_threshold = get_threshold("medium", 35)
    low_threshold = get_threshold("low", 15)
    
    if score >= critical_threshold:
        return "critical"
    if score >= high_threshold:
        return "high"
    if score >= medium_threshold:
        return "medium"
    if score >= low_threshold:
        return "low"
    return "info"


def compute_risk_for_sp(
    sp: Dict[str, Any],
    has_impersonation: bool,
    has_offline_access: bool,
    app_role_max_weight: int,
    has_privileged_scopes: bool,
    has_too_many_scopes: bool,
    delegated_scopes_by_resource: Dict[str, Set[str]],
    assignments: List[Dict[str, Any]],
    owners: List[Dict[str, Any]],
    requires_assignment: Optional[bool],
    dir_role_assignments: List[Dict[str, Any]],
    sp_display: str,
    dir_cache: DirectoryCache,
    credential_insights: Optional[Dict[str, Any]] = None,
    reply_url_analysis: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Compute risk score for service principal based on loaded configuration."""
    config = SCORING_CONFIG.get("compute_risk_for_sp", {})
    contributors = config.get("scoring_contributors", {})
    final_score_config = config.get("final_score_limitation", {})
    
    score = 0
    reasons: List[Dict[str, Any]] = []

    # CAN_IMPERSONATE
    if has_impersonation:
        impersonate_config = contributors.get("CAN_IMPERSONATE", {})
        weight = impersonate_config.get("weight", 40)
        description = impersonate_config.get("description", "Delegated impersonation markers present")
        score += weight
        reasons.append({
            "code": "CAN_IMPERSONATE",
            "message": description,
            "weight": weight,
        })

    # HAS_APP_ROLE
    if app_role_max_weight > 0:
        app_role_config = contributors.get("HAS_APP_ROLE", {})
        min_weight_raw = app_role_config.get("weight", 35)
        # Handle string weight values gracefully (scoring_logic.json may contain descriptive strings)
        min_weight = min_weight_raw if isinstance(min_weight_raw, (int, float)) else 35
        weight = max(min_weight, app_role_max_weight)
        description = app_role_config.get("description", "Application permissions (app roles) granted")
        score += weight
        reasons.append({
            "code": "HAS_APP_ROLE",
            "message": description,
            "weight": weight,
        })

    # HAS_PRIVILEGED_SCOPES
    if has_privileged_scopes:
        privileged_config = contributors.get("HAS_PRIVILEGED_SCOPES", {})
        weight = privileged_config.get("weight", 20)
        description = privileged_config.get("description", "Privileged delegated scopes granted")
        score += weight
        reasons.append({
            "code": "HAS_PRIVILEGED_SCOPES",
            "message": description,
            "weight": weight,
        })

    # HAS_TOO_MANY_SCOPES
    if has_too_many_scopes:
        too_many_config = contributors.get("HAS_TOO_MANY_SCOPES", {})
        weight = too_many_config.get("weight", 15)
        description = too_many_config.get("description", "Delegated consent is overly broad")
        score += weight
        reasons.append({
            "code": "HAS_TOO_MANY_SCOPES",
            "message": description,
            "weight": weight,
        })

    # PERSISTENCE (offline_access)
    if has_offline_access:
        persistence_config = contributors.get("PERSISTENCE", {})
        weight = persistence_config.get("weight", 15)
        description = persistence_config.get("description", "offline_access delegated grant allows refresh tokens")
        score += weight
        reasons.append({
            "code": "PERSISTENCE",
            "message": description,
            "weight": weight,
        })

    # ASSIGNED_TO (reachable users)
    reachable_users = 0
    for a in assignments:
        pid = a.get("principalId")
        pobj = dir_cache.get(pid) if pid else None
        otype = (pobj.get("@odata.type") or "").lower() if pobj else ""
        if "user" in otype:
            reachable_users += 1
        elif "group" in otype:
            reachable_users += 5
    
    if reachable_users > 0:
        assigned_config = contributors.get("ASSIGNED_TO", {})
        thresholds = assigned_config.get("reachable_users_thresholds", [
            {"threshold": 100, "weight": 25},
            {"threshold": 20, "weight": 15},
            {"threshold": 5, "weight": 10},
            {"threshold": 0, "weight": 5}
        ])
        
        # Find appropriate weight based on thresholds
        weight = 5  # default
        for t in thresholds:
            if reachable_users > t.get("threshold", 0):
                weight = t.get("weight", 5)
                break
        
        description = assigned_config.get("description", "App is assigned to principals")
        score += weight
        reasons.append({
            "code": "ASSIGNED_TO",
            "message": f"App is assigned to principals approximating ~{reachable_users} users",
            "weight": weight,
        })
    elif requires_assignment is False:
        # BROAD_REACHABILITY
        broad_config = contributors.get("BROAD_REACHABILITY", {})
        weight = broad_config.get("weight", 15)
        description = broad_config.get("description", "No assignments but appRoleAssignmentRequired=false implies broad reach")
        score += weight
        reasons.append({
            "code": "BROAD_REACHABILITY",
            "message": description,
            "weight": weight,
        })

    # PRIVILEGE (directory roles)
    roles_reachable = len(dir_role_assignments or [])
    if roles_reachable > 0:
        privilege_config = contributors.get("PRIVILEGE", {})
        base_weight = privilege_config.get("base_weight", 10)
        per_role_weight = privilege_config.get("per_role_weight", 5)
        max_weight = privilege_config.get("max_weight", 30)
        weight = min(base_weight + per_role_weight * roles_reachable, max_weight)
        description = privilege_config.get("description", "Directory roles reachable from app")
        score += weight
        reasons.append({
            "code": "PRIVILEGE",
            "message": f"Directory roles reachable from app ({roles_reachable} assignments)",
            "weight": weight,
        })

    # DECEPTION
    verified = is_verified_publisher(sp.get("verifiedPublisher"))
    publisher = sp.get("publisherName") or ""
    display_name = sp_display or sp.get("appDisplayName") or ""
    deception = (not verified) and publisher and display_name and publisher.lower() != display_name.lower()
    if deception:
        deception_config = contributors.get("DECEPTION", {})
        weight = deception_config.get("weight", 20)
        description = deception_config.get("description", "Unverified publisher with name mismatch")
        score += weight
        reasons.append({
            "code": "DECEPTION",
            "message": description,
            "weight": weight,
        })

    # MIXED_REPLYURL_DOMAINS (heuristic, non-blocking)
    reply_urls = sp.get("replyUrls") or []
    homepage = sp.get("homepage")
    info = sp.get("info") or {}
    mixed_domains_result = check_mixed_replyurl_domains(reply_urls, homepage, info)
    
    if mixed_domains_result.get("has_mixed_domains") and mixed_domains_result.get("signal_type"):
        mixed_domains_config = contributors.get("MIXED_REPLYURL_DOMAINS", {})
        signal_type = mixed_domains_result["signal_type"]
        
        # Different weights for different signal types
        if signal_type == "identity_laundering":
            weight = mixed_domains_config.get("identity_laundering_weight", 15)
            description = mixed_domains_config.get(
                "identity_laundering_description",
                "Identity laundering signal: reply URLs use domains not aligned with homepage/branding"
            )
            reasons.append({
                "code": "MIXED_REPLYURL_DOMAINS",
                "message": description,
                "weight": weight,
                "signal_type": "identity_laundering",
                "domains": mixed_domains_result["domains"],
                "non_aligned_domains": mixed_domains_result["non_aligned_domains"],
            })
            score += weight
        elif signal_type == "attribution_ambiguity":
            weight = mixed_domains_config.get("attribution_ambiguity_weight", 5)
            description = mixed_domains_config.get(
                "attribution_ambiguity_description",
                "Attribution ambiguity: multiple distinct domains in reply URLs"
            )
            reasons.append({
                "code": "MIXED_REPLYURL_DOMAINS",
                "message": description,
                "weight": weight,
                "signal_type": "attribution_ambiguity",
                "domains": mixed_domains_result["domains"],
            })
            score += weight

    # LEGACY
    created = _parse_iso_datetime(sp.get("createdDateTime"))
    legacy_config = contributors.get("LEGACY", {})
    cutoff_date_str = legacy_config.get("cutoff_date", "2025-07-01T00:00:00Z")
    legacy_cutoff = _parse_iso_datetime(cutoff_date_str) or dt.datetime(2025, 7, 1, tzinfo=dt.timezone.utc)
    if created and created < legacy_cutoff:
        weight = legacy_config.get("weight", 10)
        description = legacy_config.get("description", "App created before July 2025")
        score += weight
        reasons.append({
            "code": "LEGACY",
            "message": description,
            "weight": weight,
        })

    # NO_OWNERS
    if owners is None or len(owners) == 0:
        no_owners_config = contributors.get("NO_OWNERS", {})
        weight = no_owners_config.get("weight", 15)
        description = no_owners_config.get("description", "No owners found for application")
        score += weight
        reasons.append({
            "code": "NO_OWNERS",
            "message": description,
            "weight": weight,
        })

    # GOVERNANCE
    if requires_assignment is False:
        governance_config = contributors.get("GOVERNANCE", {})
        weight = governance_config.get("weight", 5)
        description = governance_config.get("description", "Assignments not required for app")
        score += weight
        reasons.append({
            "code": "GOVERNANCE",
            "message": description,
            "weight": weight,
        })
    elif requires_assignment is None:
        governance_unknown_config = contributors.get("GOVERNANCE_UNKNOWN", {})
        weight = governance_unknown_config.get("weight", 3)
        description = governance_unknown_config.get("description", "Assignment requirement unknown")
        score += weight
        reasons.append({
            "code": "GOVERNANCE_UNKNOWN",
            "message": description,
            "weight": weight,
        })

    # CREDENTIAL_HYGIENE
    if credential_insights:
        cred_config = contributors.get("CREDENTIAL_HYGIENE", {})
        
        # Long-lived secrets
        if credential_insights.get("long_lived_secrets"):
            weight = cred_config.get("long_lived_secret_weight", 10)
            description = cred_config.get("long_lived_secret_description", "Long-lived secrets detected")
            count = len(credential_insights["long_lived_secrets"])
            score += weight
            reasons.append({
                "code": "CREDENTIAL_HYGIENE",
                "message": f"{description} ({count} secrets)",
                "weight": weight,
                "subtype": "long_lived_secrets",
            })
        
        # Expired but present credentials
        if credential_insights.get("expired_but_present"):
            weight = cred_config.get("expired_credential_weight", 5)
            description = cred_config.get("expired_credential_description", "Expired credentials still present")
            count = len(credential_insights["expired_but_present"])
            score += weight
            reasons.append({
                "code": "CREDENTIAL_HYGIENE",
                "message": f"{description} ({count} credentials)",
                "weight": weight,
                "subtype": "expired_credentials",
            })
        
        # Multiple active secrets (>3)
        total_active = credential_insights.get("active_password_credentials", 0) + credential_insights.get("active_key_credentials", 0)
        if total_active > 3:
            weight = cred_config.get("multiple_active_secrets_weight", 5)
            description = cred_config.get("multiple_active_secrets_description", "Multiple active secrets detected")
            score += weight
            reasons.append({
                "code": "CREDENTIAL_HYGIENE",
                "message": f"{description} ({total_active} active)",
                "weight": weight,
                "subtype": "multiple_secrets",
            })
        
        # Certificate rollover issues
        if credential_insights.get("certificate_rollover_issues"):
            weight = cred_config.get("certificate_expiring_weight", 8)
            description = cred_config.get("certificate_expiring_description", "Certificate expiring soon")
            count = len(credential_insights["certificate_rollover_issues"])
            score += weight
            reasons.append({
                "code": "CREDENTIAL_HYGIENE",
                "message": f"{description} ({count} certificates)",
                "weight": weight,
                "subtype": "certificate_expiring",
            })

    # REPLY_URL_ANOMALIES
    if reply_url_analysis:
        anomaly_config = contributors.get("REPLY_URL_ANOMALIES", {})
        
        # Non-HTTPS URLs
        if reply_url_analysis.get("non_https_urls"):
            weight = anomaly_config.get("non_https_weight", 10)
            description = anomaly_config.get("non_https_description", "Non-HTTPS reply URLs detected")
            count = len(reply_url_analysis["non_https_urls"])
            score += weight
            reasons.append({
                "code": "REPLY_URL_ANOMALIES",
                "message": f"{description} ({count} URLs)",
                "weight": weight,
                "subtype": "non_https",
            })
        
        # IP literals
        if reply_url_analysis.get("ip_literal_urls"):
            weight = anomaly_config.get("ip_literal_weight", 12)
            description = anomaly_config.get("ip_literal_description", "IP literal in reply URLs")
            count = len(reply_url_analysis["ip_literal_urls"])
            score += weight
            reasons.append({
                "code": "REPLY_URL_ANOMALIES",
                "message": f"{description} ({count} URLs)",
                "weight": weight,
                "subtype": "ip_literal",
            })
        
        # Punycode
        if reply_url_analysis.get("punycode_urls"):
            weight = anomaly_config.get("punycode_weight", 8)
            description = anomaly_config.get("punycode_description", "Punycode domains in reply URLs")
            count = len(reply_url_analysis["punycode_urls"])
            score += weight
            reasons.append({
                "code": "REPLY_URL_ANOMALIES",
                "message": f"{description} ({count} URLs)",
                "weight": weight,
                "subtype": "punycode",
            })

    # Apply min/max clamping
    clamping = final_score_config.get("min_max_clamping", {})
    min_score = clamping.get("minimum_allowed_score", 0)
    max_score = clamping.get("maximum_allowed_score", 100)
    score = max(min_score, min(max_score, score))
    
    level = _level_from_score(score)

    return {"score": score, "level": level, "reasons": reasons}


# -----------------------------
# Collector
# -----------------------------

@dataclass
class CollectOptions:
    include_all_service_principals: bool = False
    include_first_party: bool = False
    include_single_tenant: bool = False


class OidSeeCollector:
    def __init__(self, graph: GraphClient, opts: CollectOptions):
        self.graph = graph
        self.opts = opts

        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.edges: List[Dict[str, Any]] = []

        self.dir_cache = DirectoryCache(graph)
        self.sp_cache: Dict[str, Dict[str, Any]] = {}        # by servicePrincipal id
        self.sp_by_appid: Dict[str, Dict[str, Any]] = {}     # by appId (best-effort)
        self.app_cache_by_appid: Dict[str, Dict[str, Any]] = {}  # in-tenant applications by appId

        self._resource_sp_needed: Set[str] = set()
        self._principal_ids_needed: Set[str] = set()
        self._role_def_ids_needed: Set[str] = set()
        self._role_defs: Dict[str, Dict[str, Any]] = {}

    # ---- add nodes with de-dupe

    def add_node(self, nid: str, ntype: str, display_name: str, props: Dict[str, Any]) -> None:
        if nid not in self.nodes:
            self.nodes[nid] = make_node(nid, ntype, display_name, props)

    def add_edge(self, src: str, dst: str, etype: str, props: Optional[Dict[str, Any]] = None) -> None:
        self.edges.append(make_edge(src, dst, etype, props))

    # ---- fetching

    def fetch_tenant(self) -> Dict[str, Any]:
        org = self.graph.get_paged(f"{GRAPH_V1}/organization?$select=id,displayName,tenantType,verifiedDomains")
        o = org[0] if org else {}
        verified_domains = [d.get("name") for d in o.get("verifiedDomains", []) if d.get("isDefault")]
        return {
            "tenantId": o.get("id"),
            "displayName": o.get("displayName"),
            "tenantType": o.get("tenantType"),
            "defaultDomain": verified_domains[0] if verified_domains else None,
        }

    def list_service_principals(self) -> List[Dict[str, Any]]:
        # Pull a fairly wide selection; avoid exploding payload.
        select = ",".join([
            "id", "appId", "appDisplayName", "displayName",
            "servicePrincipalType", "signInAudience",
            "appOwnerOrganizationId", "publisherName",
            "createdDateTime", "homepage", "logoutUrl",
            "replyUrls", "tags", "appRoleAssignmentRequired",
            "verifiedPublisher", "info", "passwordCredentials", "keyCredentials",
        ])
        sps = self.graph.get_paged(f"{GRAPH_BETA}/servicePrincipals?$select={select}&$top=999")
        return sps

    def should_include_sp(self, sp: Dict[str, Any], tenant_id: str) -> bool:
        if self.opts.include_all_service_principals:
            return True

        # Only "Application" SPs by default
        if sp.get("servicePrincipalType") != "Application":
            return False

        # Skip disabled
        if sp.get("accountEnabled") is False:
            return False

        # First-party (rough heuristic): appOwnerOrganizationId == tenant OR == Microsoft "organizations" tenant
        # NOTE: Microsoft uses multiple owner org ids (including the MSA first-party tenant 9188...).
        # This is intentionally a weak heuristic; you can include first-party explicitly.
        owner_org = sp.get("appOwnerOrganizationId")
        if not self.opts.include_first_party:
            if owner_org in {tenant_id, "f8cdef31-a31e-4b4a-93e4-5f571e91255a"}:
                # f8cdef31... commonly seen for Microsoft services (but not guaranteed)
                return False

        # Only multi-tenant by default (export ALL multi-tenant SPs)
        aud = sp.get("signInAudience")
        if not self.opts.include_single_tenant:
            if aud == "AzureADMyOrg":
                return False

        return True

    def fetch_applications_for_sps(self, sps: List[Dict[str, Any]]) -> None:
        # In-tenant apps only. For many 3P apps, /applications won't contain them.
        app_ids = sorted({sp.get("appId") for sp in sps if sp.get("appId")})
        # Graph can't filter by a list directly; do best-effort: just skip, or do per-appId query.
        for appid in app_ids:
            try:
                # Include credentials and federated identity credentials in the select
                apps = self.graph.get_paged(f"{GRAPH_BETA}/applications?$filter=appId eq '{appid}'&$select=id,appId,displayName,createdDateTime,signInAudience,web,spa,publicClient,requiredResourceAccess,passwordCredentials,keyCredentials,federatedIdentityCredentials")
                if apps:
                    self.app_cache_by_appid[appid] = apps[0]
            except Exception:
                # placeholder - app not readable or doesn't exist in tenant
                continue

    def fetch_oauth2_permission_grants(self, client_sp_id: str) -> List[Dict[str, Any]]:
        # /oauth2PermissionGrants supports filter by clientId
        select = "id,clientId,resourceId,scope,consentType,principalId,expiryTime"
        url = f"{GRAPH_BETA}/oauth2PermissionGrants?$filter=clientId eq '{client_sp_id}'&$select={select}"
        return self.graph.get_paged(url)

    def fetch_app_role_assignments(self, client_sp_id: str) -> List[Dict[str, Any]]:
        # application permissions granted to this service principal
        select = "id,appRoleId,principalId,resourceId"
        url = f"{GRAPH_BETA}/servicePrincipals/{client_sp_id}/appRoleAssignments?$select={select}"
        return self.graph.get_paged(url)

    def fetch_app_role_assigned_to(self, sp_id: str) -> List[Dict[str, Any]]:
        # principals assigned to this app
        select = "id,appRoleId,principalId,resourceId"
        url = f"{GRAPH_BETA}/servicePrincipals/{sp_id}/appRoleAssignedTo?$select={select}"
        return self.graph.get_paged(url)

    def fetch_owners(self, sp_id: str) -> List[Dict[str, Any]]:
        # directoryObject collection
        url = f"{GRAPH_BETA}/servicePrincipals/{sp_id}/owners?$select=id,displayName"
        return self.graph.get_paged(url)

    def fetch_directory_role_assignments_to_principal(self, principal_id: str) -> List[Dict[str, Any]]:
        # roleManagement API (v1.0)
        select = "id,principalId,roleDefinitionId,directoryScopeId"
        url = f"{GRAPH_V1}/roleManagement/directory/roleAssignments?$filter=principalId eq '{principal_id}'&$select={select}"
        return self.graph.get_paged(url)

    def fetch_role_definitions(self, ids: Set[str]) -> None:
        # roleDefinitions are queryable; do per-id (small usually)
        for rid in ids:
            if rid in self._role_defs:
                continue
            try:
                rd = self.graph.get(f"{GRAPH_V1}/roleManagement/directory/roleDefinitions/{rid}?$select=id,displayName,description,isBuiltIn")
                self._role_defs[rid] = rd
            except Exception:
                self._role_defs[rid] = {"id": rid, "displayName": None}

    # ---- resource SP lookup

    def ensure_resource_sps_loaded(self) -> None:
        if not self._resource_sp_needed:
            return
        missing = [rid for rid in self._resource_sp_needed if rid not in self.sp_cache]
        for rid in missing:
            try:
                sp = self.graph.get(f"{GRAPH_BETA}/servicePrincipals/{rid}?$select=id,appId,displayName,appDisplayName,publisherName,replyUrls,servicePrincipalType,signInAudience,verifiedPublisher,appRoles,publishedPermissionScopes,oauth2PermissionScopes,api")
                self.sp_cache[rid] = sp
            except Exception:
                # keep minimal placeholder
                self.sp_cache[rid] = {"id": rid, "displayName": None, "appId": None}

    # ---- graph build

    def build(self) -> Dict[str, Any]:
        print("→ Fetching tenant metadata...", file=sys.stderr)
        tenant = self.fetch_tenant()
        tenant_id = tenant.get("tenantId")
        if not tenant_id:
            raise RuntimeError("Could not determine tenantId from /organization")

        print("→ Listing service principals...", file=sys.stderr)
        sps = self.list_service_principals()
        print(f"  found {len(sps)} service principals (pre-filter)", file=sys.stderr)
        # cache all quickly (id->sp)
        for sp in sps:
            sid = sp.get("id")
            if sid:
                self.sp_cache[sid] = sp
            appid = sp.get("appId")
            if appid and appid not in self.sp_by_appid:
                self.sp_by_appid[appid] = sp

        # filter
        target_sps = [sp for sp in sps if self.should_include_sp(sp, tenant_id)]
        print(f"→ Targeting {len(target_sps)} service principals (post-filter)", file=sys.stderr)

        # best-effort application objects
        print("→ Fetching in-tenant application objects (best-effort)...", file=sys.stderr)
        self.fetch_applications_for_sps(target_sps)
        print(f"  application cache populated for {len(self.app_cache_by_appid)} appIds", file=sys.stderr)

        # First pass: gather grants, assignments, owners, role assignments and collect referenced IDs
        sp_delegated_scopes: Dict[str, Dict[str, Set[str]]] = {}  # spId -> resourceId -> scopes set

        grants_by_sp: Dict[str, List[Dict[str, Any]]] = {}
        app_perms_by_sp: Dict[str, List[Dict[str, Any]]] = {}
        assigned_to_by_sp: Dict[str, List[Dict[str, Any]]] = {}
        owners_by_sp: Dict[str, List[Dict[str, Any]]] = {}
        dir_roles_by_sp: Dict[str, List[Dict[str, Any]]] = {}

        print("→ Collecting delegated grants, app permissions, assignments, owners, and directory roles...", file=sys.stderr)
        for sp in target_sps:
            sp_id = sp["id"]
            # Delegated grants
            try:
                grants = self.fetch_oauth2_permission_grants(sp_id)
            except Exception as e:
                print(f"⚠️  oauth2PermissionGrants failed for {sp_id}: {e}", file=sys.stderr)
                grants = []
            grants_by_sp[sp_id] = grants

            scopes_by_res: Dict[str, Set[str]] = {}
            for g in grants:
                rid = g.get("resourceId")
                if rid:
                    self._resource_sp_needed.add(rid)
                    scopes = set((g.get("scope") or "").split())
                    scopes_by_res.setdefault(rid, set()).update(scopes)
                pid = g.get("principalId")
                if pid:
                    self._principal_ids_needed.add(pid)
            sp_delegated_scopes[sp_id] = scopes_by_res

            # App permissions (appRoleAssignments)
            try:
                app_perms = self.fetch_app_role_assignments(sp_id)
            except Exception as e:
                print(f"⚠️  appRoleAssignments failed for {sp_id}: {e}", file=sys.stderr)
                app_perms = []
            app_perms_by_sp[sp_id] = app_perms

            for a in app_perms:
                rid = a.get("resourceId")
                if rid:
                    self._resource_sp_needed.add(rid)

            # Assigned to (who can use it, if assignment required / optional)
            try:
                assigned_to = self.fetch_app_role_assigned_to(sp_id)
            except Exception as e:
                print(f"⚠️  appRoleAssignedTo failed for {sp_id}: {e}", file=sys.stderr)
                assigned_to = []
            assigned_to_by_sp[sp_id] = assigned_to
            for a in assigned_to:
                pid = a.get("principalId")
                if pid:
                    self._principal_ids_needed.add(pid)

            # Owners
            try:
                owners = self.fetch_owners(sp_id)
            except Exception as e:
                print(f"⚠️  owners failed for {sp_id}: {e}", file=sys.stderr)
                owners = []
            owners_by_sp[sp_id] = owners
            for o in owners:
                oid = o.get("id")
                if oid:
                    self._principal_ids_needed.add(oid)

            # Directory role assignments (Azure AD roles to the SP itself)
            try:
                dras = self.fetch_directory_role_assignments_to_principal(sp_id)
            except Exception as e:
                print(f"⚠️  directory roleAssignments failed for {sp_id}: {e}", file=sys.stderr)
                dras = []
            dir_roles_by_sp[sp_id] = dras
            for ra in dras:
                rid = ra.get("roleDefinitionId")
                if rid:
                    self._role_def_ids_needed.add(rid)

        # Summaries
        grants_total = sum(len(v) for v in grants_by_sp.values())
        app_perms_total = sum(len(v) for v in app_perms_by_sp.values())
        assigned_total = sum(len(v) for v in assigned_to_by_sp.values())
        owners_total = sum(len(v) for v in owners_by_sp.values())
        dir_roles_total = sum(len(v) for v in dir_roles_by_sp.values())
        print(f"  collected: {grants_total} grants, {app_perms_total} app-perms, {assigned_total} assignments, {owners_total} owners, {dir_roles_total} role assignments", file=sys.stderr)

        # Resolve referenced directory objects and resource SPs
        print(f"→ Resolving {len(self._principal_ids_needed)} principals via getByIds...", file=sys.stderr)
        self.dir_cache.get_many(self._principal_ids_needed)
        missing_before = len([rid for rid in self._resource_sp_needed if rid not in self.sp_cache])
        print(f"→ Loading {missing_before} resource service principals...", file=sys.stderr)
        self.ensure_resource_sps_loaded()
        missing_after = len([rid for rid in self._resource_sp_needed if rid not in self.sp_cache])
        print(f"  loaded {missing_before - missing_after} resources (remaining {missing_after})", file=sys.stderr)
        print(f"→ Fetching {len(self._role_def_ids_needed)} role definitions...", file=sys.stderr)
        self.fetch_role_definitions(self._role_def_ids_needed)

        # Second pass: emit nodes and edges
        print("→ Emitting nodes and edges...", file=sys.stderr)
        for sp in target_sps:
            sp_id = sp["id"]
            sp_display = sp.get("displayName") or sp.get("appDisplayName")
            sp_nid = node_id("sp", sp_id, sp_display)

            # Aggregate flags for risk scoring
            has_impersonation = False
            has_offline_access = False
            has_privileged_scopes = False
            has_too_many_scopes = False
            app_role_max_weight = 0
            # App role weights from application permissions
            for a in app_perms_by_sp.get(sp_id, []):
                rid = a.get("resourceId")
                arid = a.get("appRoleId")
                res_sp = self.sp_cache.get(rid, {})
                app_roles = res_sp.get("appRoles") or []
                roles_by_id = {r.get("id"): r for r in app_roles if r.get("id")}
                rmeta = roles_by_id.get(arid, {}) if arid else {}
                role_name = rmeta.get("value") or rmeta.get("displayName") or ""
                app_role_max_weight = max(app_role_max_weight, classify_app_role_value(role_name))

            for scopes in sp_delegated_scopes.get(sp_id, {}).values():
                lower_set = {s.lower() for s in scopes}
                if lower_set & IMPERSONATION_MARKERS:
                    has_impersonation = True
                if "offline_access" in lower_set:
                    has_offline_access = True
                classified = classify_scopes(scopes)
                if classified["classification"] == "privileged":
                    has_privileged_scopes = True
                if classified["classification"] == "too_broad":
                    has_too_many_scopes = True

            has_app_roles = bool(app_perms_by_sp.get(sp_id))
            owners = owners_by_sp.get(sp_id, [])
            requires_assignment = sp.get("appRoleAssignmentRequired")

            # Analyze credentials from both SP and Application (before risk calculation)
            appid = sp.get("appId")
            app_obj = self.app_cache_by_appid.get(appid) if appid else None
            
            sp_password_creds = sp.get("passwordCredentials") or []
            sp_key_creds = sp.get("keyCredentials") or []
            app_password_creds = (app_obj or {}).get("passwordCredentials") or []
            app_key_creds = (app_obj or {}).get("keyCredentials") or []
            app_federated_creds = (app_obj or {}).get("federatedIdentityCredentials") or []
            
            # Combine credentials for analysis
            all_password_creds = sp_password_creds + app_password_creds
            all_key_creds = sp_key_creds + app_key_creds
            credential_insights = analyze_credentials(all_password_creds, all_key_creds, app_federated_creds)
            
            # Analyze reply URLs (before risk calculation)
            reply_urls = sp.get("replyUrls") or []
            reply_url_analysis = analyze_reply_urls(reply_urls)

            # service principal node - compute risk with enhanced insights
            risk = compute_risk_for_sp(
                sp,
                has_impersonation,
                has_offline_access,
                app_role_max_weight,
                has_privileged_scopes,
                has_too_many_scopes,
                sp_delegated_scopes.get(sp_id, {}),
                assigned_to_by_sp.get(sp_id, []),
                owners,
                requires_assignment,
                dir_roles_by_sp.get(sp_id, []),
                sp_display,
                self.dir_cache,
                credential_insights,
                reply_url_analysis,
            )
            
            # Check for identity laundering signals
            mixed_domains_result = check_mixed_replyurl_domains(reply_urls, sp.get("homepage"), sp.get("info") or {})
            identity_laundering_suspected = (
                mixed_domains_result.get("signal_type") == "identity_laundering"
            )
            
            # Build trust signals
            trust_signals = {
                "identityLaunderingSuspected": identity_laundering_suspected,
                "mixedReplyUrlDomains": mixed_domains_result.get("has_mixed_domains", False),
                "nonAlignedDomains": mixed_domains_result.get("non_aligned_domains", []),
            }
            
            props = {
                "servicePrincipalId": sp_id,
                "appId": sp.get("appId"),
                "appDisplayName": sp.get("appDisplayName"),
                "publisherName": sp.get("publisherName"),
                "signInAudience": sp.get("signInAudience"),
                "appOwnerOrganizationId": sp.get("appOwnerOrganizationId"),
                "createdDateTime": sp.get("createdDateTime"),
                "replyUrls": sp.get("replyUrls") or [],
                "homepage": sp.get("homepage"),
                "logoutUrl": sp.get("logoutUrl"),
                "requiresAssignment": sp.get("appRoleAssignmentRequired"),
                "verifiedPublisher": sp.get("verifiedPublisher"),
                "tags": sp.get("tags") or [],
                "info": sp.get("info") or {},
                "keyCredentials": sp.get("keyCredentials") or [],
                "passwordCredentials": sp.get("passwordCredentials") or [],
                # Enhanced fields
                "credentialInsights": credential_insights,
                "replyUrlAnalysis": reply_url_analysis,
                "trustSignals": trust_signals,
            }
            node = self.add_node(sp_nid, "ServicePrincipal", sp_display, props)
            # Add risk at top level if present
            if risk and risk.get("score", 0) > 0:
                self.nodes[sp_nid]["risk"] = risk

            # Application node (best-effort)
            if appid:
                app_obj = self.app_cache_by_appid.get(appid)
                app_display = (app_obj or {}).get("displayName") or sp.get("appDisplayName")
                app_nid = node_id("app", appid, app_display)
                self.add_node(app_nid, "Application", app_display, {
                    "appId": appid,
                    "isMultiTenant": (app_obj or {}).get("signInAudience") not in (None, "AzureADMyOrg"),
                    "createdDateTime": (app_obj or {}).get("createdDateTime"),
                    "signInAudience": (app_obj or {}).get("signInAudience") or sp.get("signInAudience"),
                    "replyUrls": sp.get("replyUrls") or [],
                    "web": (app_obj or {}).get("web"),
                    "spa": (app_obj or {}).get("spa"),
                    "publicClient": (app_obj or {}).get("publicClient"),
                    "requiredResourceAccess": (app_obj or {}).get("requiredResourceAccess"),
                    "passwordCredentials": (app_obj or {}).get("passwordCredentials") or [],
                    "keyCredentials": (app_obj or {}).get("keyCredentials") or [],
                    "federatedIdentityCredentials": (app_obj or {}).get("federatedIdentityCredentials") or [],
                })
                # Pass servicePrincipalId to ensure unique edge IDs when multiple SPs instance the same app
                self.add_edge(sp_nid, app_nid, "INSTANCE_OF", {"servicePrincipalId": sp_id})

            # Owners
            for o in owners_by_sp.get(sp_id, []):
                oid = o.get("id")
                if not oid:
                    continue
                od = self.dir_cache.get(oid) or {"id": oid, "displayName": o.get("displayName")}
                # node type based on @odata.type
                otype = (od.get("@odata.type") or "").lower()
                o_display = od.get("displayName") or "Unknown"
                if "user" in otype:
                    onid = node_id("user", oid, o_display)
                    self.add_node(onid, "User", o_display, {
                        "azureObjectId": oid,
                        "userPrincipalName": od.get("userPrincipalName"),
                    })
                elif "group" in otype:
                    onid = node_id("group", oid, o_display)
                    self.add_node(onid, "Group", o_display, {
                        "groupId": oid,
                    })
                elif "directoryrole" in otype:
                    onid = node_id("role", oid, o_display)
                    self.add_node(onid, "Role", o_display, {
                        "roleTemplateId": od.get("roleTemplateId"),
                    })
                else:
                    onid = node_id("dir", oid, o_display)
                    self.add_node(onid, "User", o_display, {
                        "azureObjectId": oid,
                    })
                self.add_edge(onid, sp_nid, "OWNS", {})

            # Delegated scopes -> classified edges to resource SP nodes
            for rid, scopes in sp_delegated_scopes.get(sp_id, {}).items():
                res_sp = self.sp_cache.get(rid, {"id": rid})
                res_display = res_sp.get("displayName") or res_sp.get("appDisplayName") or "Unknown Resource"
                res_nid = node_id("sp", rid, res_display)
                if res_nid not in self.nodes:
                    self.add_node(res_nid, "ResourceApi", res_display, {
                        "appId": res_sp.get("appId"),
                        "servicePrincipalId": rid,
                        "publisherName": res_sp.get("publisherName"),
                        "verifiedPublisher": res_sp.get("verifiedPublisher"),
                        "appRoles": res_sp.get("appRoles"),
                        "publishedPermissionScopes": res_sp.get("publishedPermissionScopes") or res_sp.get("oauth2PermissionScopes"),
                        "replyUrls": res_sp.get("replyUrls"),
                    })
                
                # Resolve permission details for scopes
                permission_details = resolve_permission_details(
                    resource_sp=res_sp,
                    scope_names=scopes,
                    app_role_ids=None
                )
                
                # Classify scopes and emit appropriate edge
                classification = classify_scopes(scopes)
                edge_props = {
                    "scopes": sorted(scopes),
                    "permissionType": "delegated",
                    "classification": classification["classification"],
                    "resourceAppId": permission_details.get("resource_app_id"),
                    "resourceDisplayName": permission_details.get("resource_display_name"),
                    "resolvedScopes": permission_details.get("resolved_scopes", []),
                }
                if classification["too_broad"]:
                    edge_props["tooBroadScopes"] = sorted(classification["too_broad"])
                if classification["privileged"]:
                    edge_props["privilegedScopes"] = sorted(classification["privileged"])
                
                self.add_edge(sp_nid, res_nid, classification["edge_type"], edge_props)

                # Persistence edge
                if "offline_access" in scopes:
                    self.add_edge(sp_nid, res_nid, "HAS_OFFLINE_ACCESS", {"resourceId": rid})

                # Impersonation edge ONLY for explicit markers
                if any(m in scopes for m in IMPERSONATION_MARKERS):
                    self.add_edge(sp_nid, res_nid, "CAN_IMPERSONATE", {"markers": sorted(set(scopes) & IMPERSONATION_MARKERS)})

            # Application permissions -> HAS_APP_ROLE edges to resource SP nodes
            app_perms = app_perms_by_sp.get(sp_id, [])
            if app_perms:
                by_res: Dict[str, Set[str]] = {}
                for a in app_perms:
                    rid = a.get("resourceId")
                    arid = a.get("appRoleId")
                    if rid and arid:
                        by_res.setdefault(rid, set()).add(arid)
                for rid, role_ids in by_res.items():
                    res_sp = self.sp_cache.get(rid, {"id": rid})
                    res_display = res_sp.get("displayName") or res_sp.get("appDisplayName") or "Unknown Resource"
                    res_nid = node_id("sp", rid, res_display)
                    if res_nid not in self.nodes:
                        self.add_node(res_nid, "ResourceApi", res_display, {
                            "appId": res_sp.get("appId"),
                            "servicePrincipalId": rid,
                            "publisherName": res_sp.get("publisherName"),
                            "verifiedPublisher": res_sp.get("verifiedPublisher"),
                            "appRoles": res_sp.get("appRoles"),
                            "publishedPermissionScopes": res_sp.get("publishedPermissionScopes") or res_sp.get("oauth2PermissionScopes"),
                            "replyUrls": res_sp.get("replyUrls"),
                        })
                    
                    # Resolve app role details
                    permission_details = resolve_permission_details(
                        resource_sp=res_sp,
                        scope_names=None,
                        app_role_ids=role_ids
                    )
                    
                    self.add_edge(sp_nid, res_nid, "HAS_APP_ROLE", {
                        "appRoleIds": sorted(role_ids),
                        "resourceAppId": permission_details.get("resource_app_id"),
                        "resourceDisplayName": permission_details.get("resource_display_name"),
                        "resolvedAppRoles": permission_details.get("resolved_app_roles", []),
                    })

                    # Create APP_ROLE nodes (optional, but helps visualisation)
                    # Attempt to resolve role displayName/value from resource SP appRoles list
                    app_roles = res_sp.get("appRoles") or []
                    roles_by_id = {r.get("id"): r for r in app_roles if r.get("id")}
                    for arid in role_ids:
                        r = roles_by_id.get(arid, {})
                        role_display = r.get("displayName") or r.get("value") or "Unknown Role"
                        # Use the GUID (arid) for node ID to ensure uniqueness, not the display name
                        # Multiple roles can have the same display name (e.g., "Unknown Role")
                        rnid = node_id("approle", arid, None)
                        self.add_node(rnid, "Role", role_display, {
                            "roleTemplateId": arid,
                            "value": r.get("value"),
                            "description": r.get("description"),
                            "allowedMemberTypes": r.get("allowedMemberTypes"),
                        })
                        self.add_edge(sp_nid, rnid, "HAS_APP_ROLE", {"resourceId": rid})

            # Assigned-to edges (who is assigned to this app)
            for a in assigned_to_by_sp.get(sp_id, []):
                pid = a.get("principalId")
                if not pid:
                    continue
                pobj = self.dir_cache.get(pid) or {"id": pid}
                otype = (pobj.get("@odata.type") or "").lower()
                p_display = pobj.get("displayName") or "Unknown"
                if "user" in otype:
                    pnid = node_id("user", pid, p_display)
                    self.add_node(pnid, "User", p_display, {
                        "azureObjectId": pid,
                        "userPrincipalName": pobj.get("userPrincipalName"),
                    })
                elif "group" in otype:
                    pnid = node_id("group", pid, p_display)
                    self.add_node(pnid, "Group", p_display, {
                        "groupId": pid,
                    })
                elif "serviceprincipal" in otype:
                    pnid = node_id("sp", pid, p_display)
                    self.add_node(pnid, "ServicePrincipal", p_display, {
                        "servicePrincipalId": pid,
                        "appId": pobj.get("appId"),
                    })
                else:
                    pnid = node_id("dir", pid, p_display)
                    self.add_node(pnid, "User", p_display, {
                        "azureObjectId": pid,
                    })

                # ASSIGNED_TO edge direction: principal -> app
                self.add_edge(pnid, sp_nid, "ASSIGNED_TO", {"appRoleId": a.get("appRoleId")})

            # Directory roles assigned to the SP
            for ra in dir_roles_by_sp.get(sp_id, []):
                rd_id = ra.get("roleDefinitionId")
                if not rd_id:
                    continue
                rd = self._role_defs.get(rd_id, {"id": rd_id})
                rd_display = rd.get("displayName") or "Unknown Role"
                rnid = node_id("roledef", rd_id, rd_display)
                self.add_node(rnid, "Role", rd_display, {
                    "roleTemplateId": rd_id,
                    "description": rd.get("description"),
                    "isBuiltIn": rd.get("isBuiltIn"),
                })
                self.add_edge(sp_nid, rnid, "HAS_ROLE", {"directoryScopeId": ra.get("directoryScopeId")})

        # Final pass: apply governance offsets if any GOVERNS edges exist
        # Deduct risk on ServicePrincipal nodes based on governance strength
        governs_by_sp: Dict[str, List[Dict[str, Any]]] = {}
        for e in self.edges:
            if e.get("type") == "GOVERNS" and isinstance(e.get("to"), str) and e["to"].startswith("sp:"):
                governs_by_sp.setdefault(e["to"], []).append(e)

        for sp_nid, gov_edges in governs_by_sp.items():
            node = self.nodes.get(sp_nid)
            if not node:
                continue
            existing = node.get("risk") or {"score": 0, "level": "info", "reasons": []}
            deduction_total = 0
            descs: List[str] = []
            for ge in gov_edges:
                props = ge.get("properties", {})
                strength = (props.get("strength") or "moderate").lower()
                if strength in ("strong", "strict"):
                    deduction = 30
                elif strength in ("moderate", "medium"):
                    deduction = 15
                else:
                    deduction = 5
                deduction_total += deduction
                desc = props.get("description") or props.get("control") or strength
                if desc:
                    descs.append(str(desc))

            if deduction_total > 0:
                new_score = max(0, int(existing.get("score") or 0) - deduction_total)
                node["risk"] = {
                    "score": new_score,
                    "level": _level_from_score(new_score),
                    "reasons": (existing.get("reasons") or []) + [{
                        "code": "GOVERNS",
                        "message": f"Governance controls applied ({', '.join(descs)})",
                        "weight": -deduction_total,
                    }],
                }
        if governs_by_sp:
            print(f"→ Applied governance deductions to {len(governs_by_sp)} apps", file=sys.stderr)

        export = {
            "format": {
                "name": "oidsee-graph",
                "version": "1.1"
            },
            "generatedAt": utc_now_iso(),
            "tenant": {
                "tenantId": tenant.get("tenantId"),
                "displayName": tenant.get("displayName"),
                "cloud": "Public"
            },
            "nodes": list(self.nodes.values()),
            "edges": self.edges,
        }
        return export


# -----------------------------
# CLI
# -----------------------------

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="OID-See Graph Scanner (Graph-only)")
    p.add_argument("--tenant-id", required=True, help="Tenant ID (GUID) to authenticate against")
    p.add_argument("--device-code-client-id", help="Public client app id for device code auth (delegated)", default=AZURE_CLI_CLIENT_ID)
    p.add_argument("--client-id", help="Client id for client secret auth (defaults to Azure CLI client id)")
    p.add_argument("--client-secret", help="Client secret for client secret auth")
    p.add_argument("--out", default="oidsee-export.json", help="Output JSON file path")
    p.add_argument("--include-first-party", action="store_true", help="Include Microsoft-first-party apps (heuristic)")
    p.add_argument("--include-single-tenant", action="store_true", help="Include AzureADMyOrg signInAudience apps")
    p.add_argument("--include-all-sps", action="store_true", help="Include all service principals (overrides filters)")
    p.add_argument("--max-retries", type=int, default=6, help="Max HTTP retries for Graph requests (throttling/transient)")
    p.add_argument("--retry-base-delay", type=float, default=0.8, help="Base delay (seconds) for exponential backoff")
    return p.parse_args()


def main() -> int:
    args = parse_args()

    graph = GraphClient(args.tenant_id)
    # Configure HTTP retry/backoff behavior
    graph.max_retries = max(1, int(args.max_retries))
    graph.base_delay = max(0.1, float(args.retry_base_delay))
    if args.client_secret:
        cid = args.client_id or AZURE_CLI_CLIENT_ID
        graph.authenticate_client_secret(cid, args.client_secret)
    else:
        cid = args.device_code_client_id or AZURE_CLI_CLIENT_ID
        graph.authenticate_device_code(cid)

    opts = CollectOptions(
        include_all_service_principals=bool(args.include_all_sps),
        include_first_party=bool(args.include_first_party),
        include_single_tenant=bool(args.include_single_tenant),
    )

    collector = OidSeeCollector(graph, opts)
    export = collector.build()

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(export, f, indent=2, sort_keys=False)

    print(f"✓ Wrote {args.out} ({len(export['nodes'])} nodes, {len(export['edges'])} edges)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

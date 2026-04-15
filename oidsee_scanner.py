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
import base64
import datetime as dt
import json
import math
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from threading import Lock
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

import requests
import random
import tldextract
from azure.identity import (
    ClientSecretCredential,
    DeviceCodeCredential,
    InteractiveBrowserCredential,
    AzureCliCredential,
    DefaultAzureCredential,
)


GRAPH_BETA = "https://graph.microsoft.com/beta"
GRAPH_V1 = "https://graph.microsoft.com/v1.0"
AZURE_CLI_CLIENT_ID = "04b07795-8ddb-461a-bbee-02f9e1bf7b46"

# Microsoft tenant IDs that could indicate identity laundering for unverified apps
MICROSOFT_TENANT_IDS = [
    "f8cdef31-a31e-4b4a-93e4-5f571e91255a",  # Microsoft Accounts (MSA)
    "72f988bf-86f1-41af-91ab-2d7cd011db47",  # Microsoft Services
    "cdc5aeea-15c5-4db6-b079-fcadd2505dc2",  # Microsoft third tenant
]

# URL for Merill's Microsoft Apps list
# Attribution: https://github.com/merill/microsoft-info by Merill Fernando
MERILL_MICROSOFT_APPS_URL = "https://raw.githubusercontent.com/merill/microsoft-info/main/_info/MicrosoftApps.json"

# URL for Microsoft's official Graph permissions tiering data (privilege levels 1-5 per permission).
# Maintained by the Microsoft Graph team and updated weekly.
# Issue #56: https://github.com/OID-See/OID-See/issues/56
MSFT_PERMISSIONS_URL = (
    "https://raw.githubusercontent.com/microsoftgraph/microsoft-graph-devx-content"
    "/refs/heads/master/permissions/new/permissions.json"
)

# Global cache for Microsoft first-party apps
_MICROSOFT_APPS_CACHE: Optional[Dict[str, Dict[str, Any]]] = None

# Global cache for Microsoft permissions tiering data.
# Structure: { "PermissionName": { "schemes": { "DelegatedWork": { "privilegeLevel": int }, ... } } }
_MSFT_PERMISSIONS_CACHE: Optional[Dict[str, Any]] = None
# Case-insensitive lookup index: lowercased name -> original-case name
_MSFT_PERMISSIONS_INDEX: Optional[Dict[str, str]] = None

OUTPUT_FORMAT_OIDSEE = "oidsee-graph"
OUTPUT_FORMAT_BLOODHOUND_OPENGRAPH = "bloodhound-opengraph"


def _fetch_microsoft_apps_list() -> Dict[str, Dict[str, Any]]:
    """
    Fetch the list of Microsoft first-party apps from Merill's repository.
    
    Attribution: This uses the Microsoft Apps list maintained by Merill Fernando
    at https://github.com/merill/microsoft-info
    
    Returns a dict mapping appId to app info.
    """
    global _MICROSOFT_APPS_CACHE
    
    if _MICROSOFT_APPS_CACHE is not None:
        return _MICROSOFT_APPS_CACHE
    
    # Start with the static fallback so offline mode still works
    apps_dict = {app["AppId"].lower(): app for app in _load_static_fallback_apps()}
    
    try:
        print(f"Fetching Microsoft first-party apps list from Merill's repository...")
        response = requests.get(MERILL_MICROSOFT_APPS_URL, timeout=10)
        response.raise_for_status()
        
        apps_list = response.json()
        
        # Merill's data takes precedence over the static fallback
        for app in apps_list:
            app_id = app.get("AppId")
            if app_id:
                apps_dict[app_id.lower()] = app
        
        print(f"Loaded {len(apps_dict)} Microsoft first-party apps ({len(apps_list)} from Merill, fallback merged)")
        _MICROSOFT_APPS_CACHE = apps_dict
        return apps_dict
        
    except Exception as e:
        print(f"Warning: Could not fetch Microsoft apps list from Merill's repository: {e}")
        print(f"Using static fallback list only ({len(apps_dict)} apps)")
        _MICROSOFT_APPS_CACHE = apps_dict
        return apps_dict


def _load_static_fallback_apps() -> List[Dict[str, Any]]:
    """
    Load the curated static list of well-known Microsoft first-party apps.

    The file covers commonly-seen portal, service, and platform apps from
    Microsoft documentation that may not appear in Merill's dynamic list.
    Issue #57: https://github.com/OID-See/OID-See/issues/57

    Returns a list of app dicts (AppId, AppDisplayName, Source).
    """
    fallback_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "microsoft_first_party_apps_fallback.json")
    try:
        with open(fallback_path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load static first-party apps fallback ({fallback_path}): {e}")
        return []


def _fetch_microsoft_permissions() -> Dict[str, Any]:
    """
    Fetch and cache Microsoft's official Graph permissions tiering data.

    Source: microsoft-graph-devx-content (updated weekly by the MS Graph team).
    Each permission entry contains privilege levels 1-5 per auth scheme:
      DelegatedWork, DelegatedPersonal, Application.
    Level 1 = least privileged; Level 5 = highest privilege.

    Issue #56: https://github.com/OID-See/OID-See/issues/56

    Returns a dict: { "PermissionName": { "schemes": { scheme: { "privilegeLevel": int } } } }
    On failure returns an empty dict (graceful degradation — pattern matching takes over).
    """
    global _MSFT_PERMISSIONS_CACHE, _MSFT_PERMISSIONS_INDEX
    
    if _MSFT_PERMISSIONS_CACHE is not None:
        return _MSFT_PERMISSIONS_CACHE
    
    try:
        print("Fetching Microsoft Graph permissions tiering data...")
        response = requests.get(MSFT_PERMISSIONS_URL, timeout=15)
        response.raise_for_status()
        data = response.json()
        permissions = data.get("permissions", {})
        _MSFT_PERMISSIONS_CACHE = permissions
        # Build a case-insensitive lookup index once to avoid O(n) scans
        _MSFT_PERMISSIONS_INDEX = {k.lower(): k for k in permissions}
        print(f"Loaded privilege levels for {len(permissions)} Microsoft Graph permissions")
        return permissions
    except Exception as e:
        print(f"Warning: Could not fetch Microsoft permissions tiering data: {e}")
        print("Falling back to pattern-based scope/app-role classification only")
        _MSFT_PERMISSIONS_CACHE = {}
        _MSFT_PERMISSIONS_INDEX = {}
        return {}


def get_permission_privilege_level(name: str, scheme: str = "DelegatedWork") -> Optional[int]:
    """
    Return Microsoft's official privilege level (1–5) for a permission in a given scheme.

    Args:
        name:   Permission name, e.g. "Mail.ReadWrite" or "Directory.ReadWrite.All".
        scheme: One of "DelegatedWork", "DelegatedPersonal", or "Application".

    Returns:
        Integer 1–5 if found in Microsoft's tiering data, otherwise None.
        Level 5 = highest privilege (near admin-level); level 1 = lowest.
    """
    permissions = _fetch_microsoft_permissions()
    if not permissions:
        return None

    # Try exact match first
    perm = permissions.get(name)
    if perm is None:
        # Fall back to case-insensitive lookup via the pre-built index
        index = _MSFT_PERMISSIONS_INDEX or {}
        canonical = index.get(name.lower())
        if canonical:
            perm = permissions.get(canonical)

    if not perm:
        return None

    scheme_data = perm.get("schemes", {}).get(scheme)
    if scheme_data:
        return scheme_data.get("privilegeLevel")
    return None


def classify_app_ownership(app_id: str, app_owner_org_id: Optional[str], 
                           has_app_object_in_tenant: bool) -> str:
    """
    Classify an app as "1st Party" (Microsoft), "3rd Party" (external), or "Internal" (tenant-owned).
    
    Attribution: Uses Microsoft Apps list from https://github.com/merill/microsoft-info by Merill Fernando
    
    Args:
        app_id: The application ID (GUID)
        app_owner_org_id: The appOwnerOrganizationId from the service principal
        has_app_object_in_tenant: Whether the Application object exists in the current tenant
        
    Returns:
        "1st Party", "3rd Party", or "Internal"
    """
    # Get the Microsoft apps list
    microsoft_apps = _fetch_microsoft_apps_list()
    
    # Check if app is in Merill's authoritative list
    if app_id and app_id.lower() in microsoft_apps:
        return "1st Party"
    
    # Fallback: Check if appOwnerOrganizationId is a Microsoft tenant
    if app_owner_org_id in MICROSOFT_TENANT_IDS:
        return "1st Party"
    
    # If the Application object exists in this tenant, it's Internal
    if has_app_object_in_tenant:
        return "Internal"
    
    # Otherwise it's 3rd Party
    return "3rd Party"


# -----------------------------
# JWT token introspection helpers
# -----------------------------

def parse_jwt_payload(access_token: str) -> dict:
    """
    Safely decode JWT payload without signature validation.
    
    Args:
        access_token: JWT bearer token string
        
    Returns:
        Decoded payload as dict, or empty dict on error
    """
    try:
        # JWT structure: header.payload.signature
        parts = access_token.split('.')
        if len(parts) != 3:
            return {}
        
        # Decode payload (second part)
        payload_encoded = parts[1]
        
        # Add padding if needed for base64url decode
        padding = len(payload_encoded) % 4
        if padding:
            payload_encoded += '=' * (4 - padding)
        
        # Base64url decode
        payload_bytes = base64.urlsafe_b64decode(payload_encoded)
        payload = json.loads(payload_bytes.decode('utf-8'))
        
        return payload
    except Exception as e:
        print(f"⚠️  JWT parsing failed: {e}", file=sys.stderr)
        return {}


def get_token_permissions(access_token: str) -> dict:
    """
    Evaluate token type and check for Policy.Read.All permission.
    
    Args:
        access_token: JWT bearer token string
        
    Returns:
        Dict with:
        - tokenType: 'delegated' or 'app-only' or 'unknown'
        - hasPolicyReadAll: bool
        - scopes: list of delegated scopes (if delegated)
        - roles: list of app roles (if app-only)
    """
    payload = parse_jwt_payload(access_token)
    if not payload:
        return {
            'tokenType': 'unknown',
            'hasPolicyReadAll': False,
            'scopes': [],
            'roles': []
        }
    
    # Check for delegated token (scp claim)
    scp = payload.get('scp', '')
    if scp:
        scopes = [s.strip() for s in scp.split(' ') if s.strip()]
        has_policy_read = 'Policy.Read.All' in scopes or 'Policy.ReadWrite.All' in scopes
        return {
            'tokenType': 'delegated',
            'hasPolicyReadAll': has_policy_read,
            'scopes': scopes,
            'roles': []
        }
    
    # Check for app-only token (roles claim)
    roles = payload.get('roles', [])
    if roles:
        has_policy_read = 'Policy.Read.All' in roles or 'Policy.ReadWrite.All' in roles
        return {
            'tokenType': 'app-only',
            'hasPolicyReadAll': has_policy_read,
            'scopes': [],
            'roles': roles
        }
    
    # Unknown token type
    return {
        'tokenType': 'unknown',
        'hasPolicyReadAll': False,
        'scopes': [],
        'roles': []
    }


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
            "OFFLINE_ACCESS_PERSISTENCE": {
                "weight": 8,
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
            "CREATED_BEFORE_CONSENT_HARDENING": {
                "weight": 10,
                "description": "Application created before July 2025, when consent to applications from unverified publishers began requiring administrative approval. These applications may have been onboarded under weaker consent controls.",
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

    def authenticate_interactive_browser(self, client_id: str) -> None:
        self.credential = InteractiveBrowserCredential(
            client_id=client_id,
            tenant_id=self.tenant_id,
            timeout=300,  # 5 minutes
        )
        print("Opening browser for interactive login...", file=sys.stderr)
        _ = self._get_token()
        print(f"✓ Authenticated via interactive browser for client_id={client_id}", file=sys.stderr)

    def authenticate_azure_cli(self) -> None:
        self.credential = AzureCliCredential(tenant_id=self.tenant_id)
        print("Using Azure CLI authentication...", file=sys.stderr)
        _ = self._get_token()
        print("✓ Authenticated via Azure CLI", file=sys.stderr)

    def authenticate_default(self, client_id: str = None) -> None:
        # Enable interactive browser as fallback
        self.credential = DefaultAzureCredential(
            exclude_interactive_browser_credential=False,
            interactive_browser_client_id=client_id,
            tenant_id=self.tenant_id,
        )
        _ = self._get_token()
        print("✓ Authenticated via DefaultAzureCredential chain", file=sys.stderr)

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
    
    def get_access_token(self) -> str:
        """Expose the current access token for introspection."""
        return self._get_token()

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

    def batch(self, requests: List[Dict[str, Any]], api_version: str = "beta") -> List[Dict[str, Any]]:
        """
        Execute a batch of requests using Microsoft Graph $batch endpoint.
        
        Args:
            requests: List of request dictionaries with 'id', 'method', and 'url' keys
                     URLs should NOT include the version prefix (/beta or /v1.0)
                     Example: [{"id": "1", "method": "GET", "url": "/users"}]
            api_version: API version to use for all requests ("beta" or "v1.0")
        
        Returns:
            List of response dictionaries with 'id', 'status', and 'body' keys
        """
        # Use the specified API version for the batch endpoint
        batch_base = f"https://graph.microsoft.com/{api_version}"
        batch_url = f"{batch_base}/$batch"
        payload = {"requests": requests}
        
        response = self.post(batch_url, json=payload)
        responses = response.get("responses", [])
        
        # Log any errors
        for resp in responses:
            if resp.get("status", 200) >= 400:
                error_body = resp.get("body", {})
                error_msg = error_body.get("error", {}).get("message", "Unknown error")
                print(f"  ERROR: Batch request {resp.get('id')} failed: {resp.get('status')} - {error_msg}", file=sys.stderr)
        
        return responses

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
    # Increased from 50 to 100 chars to reduce collisions for long names like
    # "Microsoft Defender for Cloud Discovery Component Internal/External"
    return safe[:100] if safe else "unknown"


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


def _opengraph_safe_kind(value: Any, default: str) -> str:
    kind = re.sub(r"[^A-Za-z0-9_]+", "_", str(value or default)).strip("_")
    return kind or default


def _opengraph_scalar(value: Any) -> Optional[Any]:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        if isinstance(value, float) and not math.isfinite(value):
            return str(value)
        return value
    if isinstance(value, str):
        return value
    return None


def _to_opengraph_property_map(props: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not isinstance(props, dict):
        return {}

    out: Dict[str, Any] = {}
    for key, raw in props.items():
        if raw is None:
            continue

        scalar = _opengraph_scalar(raw)
        if scalar is not None:
            out[key] = scalar
            continue

        if isinstance(raw, list):
            converted = []
            for item in raw:
                scalar_item = _opengraph_scalar(item)
                if scalar_item is None:
                    scalar_item = json.dumps(item, sort_keys=True, default=str)
                converted.append(scalar_item)

            if not converted:
                continue

            value_types = {type(v) for v in converted}
            if len(value_types) > 1:
                converted = [str(v) for v in converted]
            out[key] = converted
            continue

        out[key] = json.dumps(raw, sort_keys=True, default=str)

    return out


def convert_oidsee_export_to_bloodhound_opengraph(export: Dict[str, Any]) -> Dict[str, Any]:
    nodes_in = export.get("nodes", [])
    edges_in = export.get("edges", [])

    nodes_out: List[Dict[str, Any]] = []
    for node in nodes_in:
        node_id_val = node.get("id")
        if not isinstance(node_id_val, str) or not node_id_val:
            continue

        node_props = _to_opengraph_property_map(node.get("properties"))
        display_name = node.get("displayName")
        if isinstance(display_name, str) and display_name:
            node_props["displayName"] = display_name

        node_type = _opengraph_safe_kind(node.get("type"), "OIDSeeNode")
        nodes_out.append({
            "id": node_id_val,
            "kinds": [node_type],
            "properties": node_props or None,
        })

    edges_out: List[Dict[str, Any]] = []
    for edge in edges_in:
        src = edge.get("from")
        dst = edge.get("to")
        if not isinstance(src, str) or not isinstance(dst, str) or not src or not dst:
            continue

        edge_props = _to_opengraph_property_map(edge.get("properties"))
        edge_id = edge.get("id")
        if isinstance(edge_id, str) and edge_id:
            edge_props["oidseeEdgeId"] = edge_id

        edge_kind = _opengraph_safe_kind(edge.get("type"), "RELATED_TO")
        edges_out.append({
            "start": {"match_by": "id", "value": src},
            "end": {"match_by": "id", "value": dst},
            "kind": edge_kind,
            "properties": edge_props or None,
        })

    return {
        "graph": {
            "metadata": {"source_kind": "OIDSee"},
            "nodes": nodes_out,
            "edges": edges_out,
        }
    }


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
        self._cache_lock = Lock()

    def get_many(self, ids: Set[str]) -> None:
        unknown = [i for i in ids if i and i not in self._cache]
        if not unknown:
            return
        # /directoryObjects/getByIds supports up to 1000 ids but keep it conservative
        batches = list(chunked(unknown, 500))
        
        def fetch_batch(batch: List[str]) -> List[Dict[str, Any]]:
            body = {"ids": batch, "types": ["user", "group", "servicePrincipal", "directoryRole"]}
            try:
                data = self.graph.post(f"{GRAPH_V1}/directoryObjects/getByIds", json=body)
                return data.get("value", [])
            except GraphClient.GraphNotFound:
                # getByIds won't 404 on batch; ignore
                return []
        
        # Parallelize batch requests for better performance with large ID sets
        # Use parallelism if we have multiple batches to process
        if len(batches) > 1:
            with ThreadPoolExecutor(max_workers=5) as executor:
                future_to_batch = {executor.submit(fetch_batch, batch): batch for batch in batches}
                for future in as_completed(future_to_batch):
                    objects = future.result()
                    with self._cache_lock:
                        for obj in objects:
                            oid = obj.get("id")
                            if oid:
                                self._cache[oid] = obj
        elif len(batches) == 1:
            # Single batch - process directly with proper locking for thread safety
            objects = fetch_batch(batches[0])
            with self._cache_lock:
                for obj in objects:
                    oid = obj.get("id")
                    if oid:
                        self._cache[oid] = obj

    def get(self, oid: str) -> Optional[Dict[str, Any]]:
        return self._cache.get(oid)


# -----------------------------
# Risk heuristics (lightweight)
# -----------------------------

# Offline fallback set for delegated scopes that are unconditionally high-risk.
# These mirror the entries in Microsoft's permissions.json at privilege level 5 and are
# used only when the remote tiering data cannot be fetched (graceful degradation).
# When the tiering data IS available this set is effectively superseded.
HIGH_RISK_DELEGATED_FALLBACK = {
    "Directory.AccessAsUser.All",
    "Directory.ReadWrite.All",
    "RoleManagement.ReadWrite.Directory",
    "User.ReadWrite.All",
    "Mail.ReadWrite",
    "offline_access",  # persistence (tagged separately via OFFLINE_ACCESS_PERSISTENCE)
}

IMPERSONATION_MARKERS = {"user_impersonation", "access_as_user"}


def classify_app_role_value(name: Optional[str]) -> int:
    """Classify app role value based on loaded configuration, refined by MS privilege tiering."""
    config = SCORING_CONFIG.get("classify_app_role_value", {})
    weights = config.get("weights", {})
    markers = config.get("markers", {})
    
    default_weight = weights.get("default", 35)
    
    if not name:
        return default_weight
    
    n = name.lower()
    
    # Pattern-matched weight (existing logic)
    pattern_weight = default_weight

    # Check readwrite.all (highest priority)
    readwrite_all_markers = markers.get("readwrite_all", [])
    readwrite_all_weight = weights.get("readwrite_all", 60)
    if any(m in n for m in readwrite_all_markers):
        pattern_weight = readwrite_all_weight
    else:
        # Check action privileged (second priority)
        action_privileged_markers = markers.get("action_privileged", [])
        action_privileged_weight = weights.get("action_privileged", 55)
        if any(m in n for m in action_privileged_markers):
            pattern_weight = action_privileged_weight
        else:
            # Check high write markers
            high_write_markers = markers.get("high_write_markers", [])
            high_write_weight = weights.get("high_write_markers", 50)
            if any(m in n for m in high_write_markers):
                pattern_weight = high_write_weight
            else:
                # Check high read markers
                high_read_markers = markers.get("high_read_markers", [])
                high_read_weight = weights.get("high_read_markers", 25)
                if any(m in n for m in high_read_markers):
                    pattern_weight = high_read_weight

    # Refine using Microsoft's official Application-scheme privilege level
    ms_level = get_permission_privilege_level(name, scheme="Application")
    if ms_level is not None:
        ms_weight = _privilege_level_to_approle_weight(ms_level, weights)
        return max(pattern_weight, ms_weight)

    return pattern_weight


# Privilege level → app role weight mapping (mirrors the classify_app_role_value tiers)
_PRIVILEGE_LEVEL_TO_APPROLE_WEIGHT: Dict[int, str] = {
    5: "readwrite_all",        # highest privilege → readwrite_all weight
    4: "action_privileged",    # high privilege → action_privileged weight
    3: "high_write_markers",   # medium-high → high_write weight
    2: "high_read_markers",    # medium → high_read weight
    1: "default",              # low → default weight (treat as low-risk)
}


def _privilege_level_to_approle_weight(level: int, weights: Dict[str, int]) -> int:
    """Map a Microsoft privilege level (1-5) to an app role weight using the scoring config."""
    weight_key = _PRIVILEGE_LEVEL_TO_APPROLE_WEIGHT.get(level, "default")
    fallback = {
        "readwrite_all": 60,
        "action_privileged": 55,
        "high_write_markers": 50,
        "high_read_markers": 25,
        "default": 35,
    }
    return weights.get(weight_key, fallback.get(weight_key, 35))


def classify_scopes(scopes: Set[str]) -> Dict[str, Any]:
    """
    Classify scopes and determine risk level based on loaded configuration with priority.

    Each scope is classified first by name patterns, then optionally upgraded using
    Microsoft's official privilege level (1–5) from the Graph permissions tiering data.
    The highest privilege level across all delegated scopes is tracked and returned
    so callers can fire additional scoring contributors when MS confirms high privilege.

    Returns edge type (always HAS_SCOPES) with metadata about risk class and weight.
    """
    config = SCORING_CONFIG.get("classify_scopes", {})
    classifications = config.get("scope_classifications", {})
    
    readwrite_all = []
    action_privileged = []
    too_broad = []
    write_privileged = []
    regular = []
    high_privilege_scopes: List[Dict[str, Any]] = []  # scopes with MS privilege level >= 4
    max_privilege_level: Optional[int] = None

    # Get action patterns from config
    action_config = classifications.get("action_privileged", {})
    action_patterns = action_config.get("patterns", [".action"])
    
    for scope in scopes:
        scope_lower = scope.lower()

        # --- Pattern-based classification (existing logic) ---
        if "readwrite.all" in scope_lower:
            pattern_class = "readwrite_all"
        elif any(pattern in scope_lower for pattern in action_patterns):
            pattern_class = "action_privileged"
        elif scope_lower.endswith(".all"):
            pattern_class = "too_broad"
        elif "write" in scope_lower or "readwrite" in scope_lower:
            pattern_class = "write_privileged"
        else:
            pattern_class = "regular"

        # --- MS privilege level override (issue #56) ---
        # Try DelegatedWork first; fall back to DelegatedPersonal for personal-account scopes
        ms_level = get_permission_privilege_level(scope, "DelegatedWork")
        if ms_level is None:
            ms_level = get_permission_privilege_level(scope, "DelegatedPersonal")

        if ms_level is not None:
            if max_privilege_level is None or ms_level > max_privilege_level:
                max_privilege_level = ms_level
            if ms_level >= 4:
                high_privilege_scopes.append({"scope": scope, "privilegeLevel": ms_level})
            # Upgrade the classification when MS rates this scope higher than patterns suggest
            ms_class = _privilege_level_to_scope_class(ms_level)
            final_class = _higher_scope_class(pattern_class, ms_class)
        else:
            final_class = pattern_class

        if final_class == "readwrite_all":
            readwrite_all.append(scope)
        elif final_class == "action_privileged":
            action_privileged.append(scope)
        elif final_class == "too_broad":
            too_broad.append(scope)
        elif final_class == "write_privileged":
            write_privileged.append(scope)
        else:
            regular.append(scope)
    
    # Determine overall classification and risk weight based on highest priority bucket
    readwrite_all_config = classifications.get("readwrite_all", {})
    action_privileged_config = classifications.get("action_privileged", {})
    too_broad_config = classifications.get("too_broad", {})
    write_privileged_config = classifications.get("write_privileged", {})
    regular_config = classifications.get("regular", {})
    
    if readwrite_all:
        classification = readwrite_all_config.get("classification_label", "readwrite_all")
        risk_weight = readwrite_all_config.get("risk_weight", 30)
    elif action_privileged:
        classification = action_privileged_config.get("classification_label", "action_privileged")
        risk_weight = action_privileged_config.get("risk_weight", 25)
    elif too_broad:
        classification = too_broad_config.get("classification_label", "too_broad")
        risk_weight = too_broad_config.get("risk_weight", 15)
    elif write_privileged:
        classification = write_privileged_config.get("classification_label", "write_privileged")
        risk_weight = write_privileged_config.get("risk_weight", 20)
    else:
        classification = regular_config.get("classification_label", "regular")
        risk_weight = regular_config.get("risk_weight", 0)
    
    return {
        "edge_type": "HAS_SCOPES",
        "classification": classification,
        "risk_weight": risk_weight,
        "readwrite_all": readwrite_all,
        "action_privileged": action_privileged,
        "too_broad": too_broad,
        "write_privileged": write_privileged,
        "regular": regular,
        "max_privilege_level": max_privilege_level,
        "high_privilege_scopes": high_privilege_scopes,
    }


# Ordered list of scope risk classes from lowest to highest priority
_SCOPE_CLASS_PRIORITY = ["regular", "too_broad", "write_privileged", "action_privileged", "readwrite_all"]


def _privilege_level_to_scope_class(level: int) -> str:
    """Map a Microsoft privilege level (1-5) to a scope risk class."""
    if level >= 5:
        return "readwrite_all"
    if level == 4:
        return "write_privileged"
    if level == 3:
        return "too_broad"
    return "regular"


def _higher_scope_class(class_a: str, class_b: str) -> str:
    """Return whichever scope risk class is higher priority."""
    priority_a = _SCOPE_CLASS_PRIORITY.index(class_a) if class_a in _SCOPE_CLASS_PRIORITY else 0
    priority_b = _SCOPE_CLASS_PRIORITY.index(class_b) if class_b in _SCOPE_CLASS_PRIORITY else 0
    return class_a if priority_a >= priority_b else class_b


def get_role_tier(role_template_id: str) -> Optional[str]:
    """Get the tier (tier0, tier1, tier2) for a role template ID."""
    config = SCORING_CONFIG.get("role_tiering", {})
    role_template_ids = config.get("role_template_ids", {})
    return role_template_ids.get(role_template_id)


def get_tier_config(tier: str) -> Dict[str, Any]:
    """Get configuration for a specific tier (tier0, tier1, tier2)."""
    config = SCORING_CONFIG.get("role_tiering", {})
    tiers = config.get("tiers", {})
    return tiers.get(tier, {})


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
    - Flags for non-HTTPS schemes, IP literals, localhost, punycode, wildcards
    - Domain cluster summary
    """
    analysis = {
        "total_urls": len(reply_urls),
        "normalized_domains": set(),
        "non_https_urls": [],
        "ip_literal_urls": [],
        "localhost_urls": [],
        "punycode_urls": [],
        "wildcard_urls": [],
        "schemes": set(),
    }
    
    for url in reply_urls:
        if not url:
            continue
            
        # Check for wildcard URLs (e.g., https://*.contoso.com/callback)
        if '*' in url:
            analysis["wildcard_urls"].append(url)
            
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
            
            # Extract eTLD+1 for domain clustering (skip wildcards for domain extraction)
            if '*' not in url:
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


def analyze_public_client_indicators(app_obj: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyze application for public client flow indicators.
    
    Public clients (native/mobile apps) and implicit flow grants pose additional risk
    because they cannot securely store secrets and rely on redirect URIs for security.
    
    Returns:
    - is_public_client: bool - Whether the app allows public client flows
    - is_implicit_flow: bool - Whether implicit flow is enabled
    - is_spa: bool - Whether the app is configured as a SPA
    - fallback_to_default_client: bool - Whether the app falls back to default client settings
    - risk_indicators: list - List of risk indicator strings
    """
    if not app_obj:
        return {
            "is_public_client": None,
            "is_implicit_flow": None,
            "is_spa": None,
            "fallback_to_default_client": None,
            "risk_indicators": [],
        }
    
    # Extract relevant properties from the Application object
    public_client = app_obj.get("publicClient") or {}
    web = app_obj.get("web") or {}
    spa = app_obj.get("spa") or {}
    
    # Check if public client flows are allowed
    is_public_client = public_client.get("redirectUris") is not None and len(public_client.get("redirectUris", [])) > 0
    
    # Check if implicit flow is enabled (web.implicitGrantSettings)
    implicit_grant_settings = web.get("implicitGrantSettings") or {}
    enable_access_token_issuance = implicit_grant_settings.get("enableAccessTokenIssuance", False)
    enable_id_token_issuance = implicit_grant_settings.get("enableIdTokenIssuance", False)
    is_implicit_flow = enable_access_token_issuance or enable_id_token_issuance
    
    # Check if SPA redirect URIs are configured
    is_spa = spa.get("redirectUris") is not None and len(spa.get("redirectUris", [])) > 0
    
    # Check if fallback to default client is allowed
    fallback_to_default_client = public_client.get("redirectUris") is None and web.get("redirectUris") is None
    
    # Build risk indicators list
    risk_indicators = []
    if is_public_client:
        risk_indicators.append("PUBLIC_CLIENT_FLOWS_ENABLED")
    if is_implicit_flow:
        risk_indicators.append("IMPLICIT_FLOW_ENABLED")
    if enable_access_token_issuance:
        risk_indicators.append("IMPLICIT_ACCESS_TOKEN_ISSUANCE")
    if enable_id_token_issuance:
        risk_indicators.append("IMPLICIT_ID_TOKEN_ISSUANCE")
    if is_spa:
        risk_indicators.append("SPA_REDIRECT_URIS_CONFIGURED")
    
    return {
        "is_public_client": is_public_client,
        "is_implicit_flow": is_implicit_flow,
        "is_spa": is_spa,
        "fallback_to_default_client": fallback_to_default_client,
        "risk_indicators": risk_indicators,
    }


def enrich_reply_urls(
    reply_urls: List[str],
    enable_dns: bool = False,
    enable_rdap: bool = False,
    enable_ipwhois: bool = False
) -> Dict[str, Any]:
    """
    Perform optional enrichment on reply URLs using DNS, RDAP, and IP WHOIS lookups.
    
    This function attempts to enrich reply URL data with additional context:
    - DNS: Resolve eTLD+1 domains to IP addresses using dnspython (platform-agnostic)
    - RDAP: Query eTLD+1 domain registration information using ipwhois library
    - IP WHOIS: Lookup ownership information for IP literals using ipwhois library
    
    All enrichment operations are non-blocking - failures are logged but don't stop processing.
    Uses PyPI libraries (dnspython, ipwhois) for platform-agnostic operations.
    Lookups are performed concurrently for better performance.
    
    Args:
        reply_urls: List of reply URLs to enrich
        enable_dns: Enable DNS lookups
        enable_rdap: Enable RDAP lookups
        enable_ipwhois: Enable IP WHOIS lookups
    
    Returns:
        Dictionary with enrichment results and metadata
    """
    from urllib.parse import urlparse
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    enrichment = {
        "dns_lookups": {},
        "rdap_queries": {},
        "ipwhois_queries": {},
        "enrichment_errors": [],
        "enrichment_timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
        "enrichment_enabled": {
            "dns": enable_dns,
            "rdap": enable_rdap,
            "ipwhois": enable_ipwhois
        }
    }
    
    if not any([enable_dns, enable_rdap, enable_ipwhois]):
        return enrichment
    
    # Extract unique eTLD+1 domains and IPs from reply URLs
    domains = set()
    ip_literals = set()
    
    for url in reply_urls:
        if not url or '*' in url:  # Skip empty or wildcard URLs
            continue
        
        try:
            parsed = urlparse(url)
            hostname = parsed.hostname or parsed.netloc
            
            if not hostname:
                continue
            
            # Check if it's an IP literal
            import re
            if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', hostname):
                ip_literals.add(hostname)
            elif hostname.startswith('[') and hostname.endswith(']'):
                # IPv6
                ip_literals.add(hostname.strip('[]'))
            elif hostname.lower() not in ('localhost', '127.0.0.1', '::1'):
                # Extract eTLD+1 (e.g., "sub.example.com" -> "example.com")
                etld_plus_one = extract_etldplus1(url)
                if etld_plus_one:
                    domains.add(etld_plus_one)
        except Exception as e:
            enrichment["enrichment_errors"].append({
                "url": url,
                "error": "URL parsing failed"
            })
    
    # DNS Enrichment (concurrent)
    if enable_dns and domains:
        try:
            import dns.resolver
        except ImportError:
            enrichment["enrichment_errors"].append({
                "type": "dns",
                "error": "DNS enrichment unavailable"
            })
            enable_dns = False
        
        if enable_dns:
            def dns_lookup(domain):
                """Perform DNS lookup for a single domain."""
                try:
                    resolver = dns.resolver.Resolver()
                    resolver.timeout = 5  # Shorter timeout for better performance
                    resolver.lifetime = 5
                    
                    # Query A records (IPv4)
                    ip_addresses = []
                    try:
                        answers = resolver.resolve(domain, 'A')
                        ip_addresses.extend([str(rdata) for rdata in answers])
                    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
                        pass  # No A records, try AAAA
                    
                    # Query AAAA records (IPv6)
                    try:
                        answers = resolver.resolve(domain, 'AAAA')
                        ip_addresses.extend([str(rdata) for rdata in answers])
                    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
                        pass  # No AAAA records
                    
                    if ip_addresses:
                        return domain, {
                            "resolved_ips": ip_addresses,
                            "record_count": len(ip_addresses),
                            "success": True
                        }
                    else:
                        return domain, {
                            "success": False,
                            "error": "Domain not found"
                        }
                except dns.resolver.Timeout:
                    return domain, {
                        "success": False,
                        "error": "Request timed out"
                    }
                except dns.resolver.NXDOMAIN:
                    return domain, {
                        "success": False,
                        "error": "Domain not found"
                    }
                except Exception as e:
                    return domain, {
                        "success": False,
                        "error": "Lookup failed"
                    }
            
            # Perform DNS lookups concurrently
            with ThreadPoolExecutor(max_workers=5) as executor:
                future_to_domain = {executor.submit(dns_lookup, domain): domain for domain in domains}
                for future in as_completed(future_to_domain):
                    domain = future_to_domain[future]
                    try:
                        result_domain, result = future.result()
                        enrichment["dns_lookups"][result_domain] = result
                        if not result.get("success"):
                            enrichment["enrichment_errors"].append({
                                "domain": result_domain,
                                "type": "dns",
                                "error": result.get("error", "Unknown error")
                            })
                    except Exception as e:
                        enrichment["enrichment_errors"].append({
                            "domain": domain,
                            "type": "dns",
                            "error": "Lookup failed"
                        })
                        enrichment["dns_lookups"][domain] = {
                            "success": False,
                            "error": "Lookup failed"
                        }
    
    # RDAP Enrichment (concurrent)
    if enable_rdap and domains:
        try:
            from ipwhois import IPWhois
            from ipwhois.exceptions import IPDefinedError, ASNRegistryError
        except ImportError:
            enrichment["enrichment_errors"].append({
                "type": "rdap",
                "error": "RDAP enrichment unavailable"
            })
            enable_rdap = False
        
        if enable_rdap:
            def rdap_lookup(domain):
                """Perform RDAP lookup for a single domain."""
                try:
                    # First resolve domain to IP to query RDAP
                    try:
                        import dns.resolver
                        resolver = dns.resolver.Resolver()
                        resolver.timeout = 3
                        resolver.lifetime = 3
                        answers = resolver.resolve(domain, 'A')
                        ip = str(answers[0])
                    except Exception as dns_err:
                        return domain, {
                            "success": False,
                            "error": "Domain lookup failed"
                        }
                    
                    # Query RDAP via ipwhois
                    obj = IPWhois(ip)
                    results = obj.lookup_rdap(depth=1, retry_count=0)  # No retries for speed
                    
                    # Extract key information
                    return domain, {
                        "success": True,
                        "domain": domain,
                        "ip_queried": ip,
                        "asn": results.get('asn'),
                        "asn_description": results.get('asn_description'),
                        "asn_country_code": results.get('asn_country_code'),
                        "network": {
                            "cidr": results.get('network', {}).get('cidr'),
                            "name": results.get('network', {}).get('name'),
                            "handle": results.get('network', {}).get('handle'),
                            "country": results.get('network', {}).get('country'),
                        },
                        "raw_data": results  # Include full response
                    }
                except IPDefinedError as e:
                    return domain, {
                        "success": False,
                        "error": "Private or reserved IP"
                    }
                except ASNRegistryError as e:
                    return domain, {
                        "success": False,
                        "error": "Registry lookup failed"
                    }
                except Exception as e:
                    return domain, {
                        "success": False,
                        "error": "RDAP query failed"
                    }
            
            # Perform RDAP lookups concurrently
            with ThreadPoolExecutor(max_workers=3) as executor:
                future_to_domain = {executor.submit(rdap_lookup, domain): domain for domain in domains}
                for future in as_completed(future_to_domain):
                    domain = future_to_domain[future]
                    try:
                        result_domain, result = future.result()
                        enrichment["rdap_queries"][result_domain] = result
                        if not result.get("success"):
                            enrichment["enrichment_errors"].append({
                                "domain": result_domain,
                                "type": "rdap",
                                "error": result.get("error", "Unknown error")
                            })
                    except Exception as e:
                        enrichment["enrichment_errors"].append({
                            "domain": domain,
                            "type": "rdap",
                            "error": "RDAP query failed"
                        })
                        enrichment["rdap_queries"][domain] = {
                            "success": False,
                            "error": "RDAP query failed"
                        }
    
    # IP WHOIS Enrichment (concurrent)
    if enable_ipwhois and ip_literals:
        try:
            from ipwhois import IPWhois
            from ipwhois.exceptions import IPDefinedError, ASNRegistryError
        except ImportError:
            enrichment["enrichment_errors"].append({
                "type": "ipwhois",
                "error": "IP WHOIS enrichment unavailable"
            })
            enable_ipwhois = False
        
        if enable_ipwhois:
            def ipwhois_lookup(ip):
                """Perform IP WHOIS lookup for a single IP."""
                try:
                    # Query IP WHOIS via ipwhois library
                    obj = IPWhois(ip)
                    results = obj.lookup_rdap(depth=1, retry_count=0)  # No retries for speed
                    
                    # Extract key information
                    return ip, {
                        "success": True,
                        "ip": ip,
                        "asn": results.get('asn'),
                        "asn_description": results.get('asn_description'),
                        "asn_country_code": results.get('asn_country_code'),
                        "asn_date": results.get('asn_date'),
                        "asn_registry": results.get('asn_registry'),
                        "network": {
                            "cidr": results.get('network', {}).get('cidr'),
                            "name": results.get('network', {}).get('name'),
                            "handle": results.get('network', {}).get('handle'),
                            "country": results.get('network', {}).get('country'),
                            "start_address": results.get('network', {}).get('start_address'),
                            "end_address": results.get('network', {}).get('end_address'),
                        },
                        "raw_data": results  # Include full response
                    }
                except IPDefinedError as e:
                    return ip, {
                        "success": False,
                        "error": "Private or reserved IP"
                    }
                except ASNRegistryError as e:
                    return ip, {
                        "success": False,
                        "error": "Registry lookup failed"
                    }
                except Exception as e:
                    return ip, {
                        "success": False,
                        "error": "WHOIS query failed"
                    }
            
            # Perform IP WHOIS lookups concurrently
            with ThreadPoolExecutor(max_workers=3) as executor:
                future_to_ip = {executor.submit(ipwhois_lookup, ip): ip for ip in ip_literals}
                for future in as_completed(future_to_ip):
                    ip = future_to_ip[future]
                    try:
                        result_ip, result = future.result()
                        enrichment["ipwhois_queries"][result_ip] = result
                        if not result.get("success"):
                            enrichment["enrichment_errors"].append({
                                "ip": result_ip,
                                "type": "ipwhois",
                                "error": result.get("error", "Unknown error")
                            })
                    except Exception as e:
                        enrichment["enrichment_errors"].append({
                            "ip": ip,
                            "type": "ipwhois",
                            "error": "WHOIS query failed"
                        })
                        enrichment["ipwhois_queries"][ip] = {
                            "success": False,
                            "error": "WHOIS query failed"
                        }
    
    return enrichment


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


# Well-known Microsoft platform appIds
# These are Microsoft's own platform/infrastructure service principals
WELL_KNOWN_MICROSOFT_APPIDS = {
    "00000001-0000-0000-c000-000000000000": "Azure ESTS Service",
    "00000003-0000-0000-c000-000000000000": "Microsoft Graph",
    "00000006-0000-0ff1-ce00-000000000000": "Office 365 Portal / SharePoint",
}


def analyze_platform_signals(app_id: Optional[str]) -> Dict[str, Any]:
    """
    Analyze appId to determine if it's a well-known Microsoft platform service.
    
    Returns platform signals including:
    - isWellKnownMicrosoftAppId: boolean
    - wellKnownMicrosoftAppName: string | null
    - isMostlyZeroMicrosoftStyleAppId: boolean (heuristic for unrecognized MS appIds)
    - platformAppIdCategory: "well_known" | "mostly_zero_heuristic" | "normal"
    
    Args:
        app_id: The application ID (GUID) to analyze
    
    Returns:
        Dictionary with platform signal metadata
    """
    if not app_id:
        return {
            "isWellKnownMicrosoftAppId": False,
            "wellKnownMicrosoftAppName": None,
            "isMostlyZeroMicrosoftStyleAppId": False,
            "platformAppIdCategory": "normal"
        }
    
    app_id_lower = app_id.lower()
    
    # Check if it's in our well-known list
    if app_id_lower in WELL_KNOWN_MICROSOFT_APPIDS:
        return {
            "isWellKnownMicrosoftAppId": True,
            "wellKnownMicrosoftAppName": WELL_KNOWN_MICROSOFT_APPIDS[app_id_lower],
            "isMostlyZeroMicrosoftStyleAppId": True,
            "platformAppIdCategory": "well_known"
        }
    
    # Heuristic: Check for "mostly-zero" Microsoft-style appIds
    # Pattern: starts with many zeros and contains c000-000000000000 or 0ff1-ce00 style segments
    is_mostly_zero = False
    if app_id_lower.startswith("00000"):
        # Check for Microsoft-style patterns
        if "-c000-" in app_id_lower or "-0ff1-ce00-" in app_id_lower:
            is_mostly_zero = True
        # Also check if it ends with many zeros (another common pattern)
        elif app_id_lower.endswith("-000000000000"):
            is_mostly_zero = True
    
    if is_mostly_zero:
        return {
            "isWellKnownMicrosoftAppId": False,
            "wellKnownMicrosoftAppName": None,
            "isMostlyZeroMicrosoftStyleAppId": True,
            "platformAppIdCategory": "mostly_zero_heuristic"
        }
    
    # Normal appId
    return {
        "isWellKnownMicrosoftAppId": False,
        "wellKnownMicrosoftAppName": None,
        "isMostlyZeroMicrosoftStyleAppId": False,
        "platformAppIdCategory": "normal"
    }


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


def _normalize_organization_name(org_name: str) -> str:
    """
    Normalize organization names to handle common variations.
    
    This helps identify that "MICROSOFT", "MSFT", "Microsoft Corporation", 
    "Microsoft Corp.", etc. are all the same organization.
    
    Returns a normalized string for comparison.
    """
    if not org_name:
        return ""
    
    # Convert to lowercase for comparison
    normalized = org_name.lower().strip()
    
    # Remove common suffixes and variations
    suffixes_to_remove = [
        " corporation",
        " corp.",
        " corp",
        " incorporated",
        " inc.",
        " inc",
        " limited",
        " ltd.",
        " ltd",
        " llc",
        " l.l.c.",
        " gmbh",
        " ag",
        " s.a.",
        " sa",
        " bv",
        " nv",
        " services",
        " service",
    ]
    
    for suffix in suffixes_to_remove:
        if normalized.endswith(suffix):
            normalized = normalized[:-len(suffix)].strip()
    
    # Handle common abbreviations and variations
    # Map known abbreviations to their canonical forms
    abbreviation_map = {
        "msft": "microsoft",
        "ms": "microsoft",
        "ibm corp": "ibm",
        "google llc": "google",
        "amazon technologies": "amazon",
        "fb": "facebook",
        "meta platforms": "meta",
    }
    
    # Check if the normalized name matches any abbreviation
    for abbrev, canonical in abbreviation_map.items():
        if normalized == abbrev or normalized.startswith(abbrev + " "):
            return canonical
    
    # Remove extra whitespace
    normalized = " ".join(normalized.split())
    
    return normalized


def _check_same_organization(enrichment_data: Optional[Dict[str, Any]], domains: List[str]) -> bool:
    """
    Check if all domains belong to the same organization based on RDAP/WHOIS enrichment data.
    
    Returns True if:
    - Enrichment data is available and shows all domains have the same registrant organization
    - No enrichment data is available (benefit of the doubt)
    
    Returns False if:
    - Enrichment shows different organizations own different domains
    """
    if not enrichment_data or not domains:
        # No enrichment data or no domains - can't determine, give benefit of doubt
        return True
    
    rdap_queries = enrichment_data.get("rdap_queries", {})
    if not rdap_queries:
        # No RDAP data available - can't determine, give benefit of doubt
        return True
    
    # Extract organizations from RDAP data for each domain
    organizations = set()
    for domain in domains:
        rdap_data = rdap_queries.get(domain, {})
        if not rdap_data.get("success"):
            # If lookup failed for any domain, can't determine - give benefit of doubt
            continue
        
        # Try to extract organization from raw RDAP data
        raw_data = rdap_data.get("raw_data", {})
        if not raw_data:
            continue
        
        # RDAP data structure: objects -> entities -> vcardArray
        # Look for organization in various places
        org_name = None
        
        # Try to get from network object
        network = raw_data.get("network", {})
        if network:
            # Some registries put org name in network name
            network_name = network.get("name", "")
            if network_name:
                org_name = network_name
        
        # Try to get from objects/entities with role "registrant"
        if not org_name:
            objects = raw_data.get("objects", {})
            for obj_key, obj_data in objects.items():
                if isinstance(obj_data, dict):
                    roles = obj_data.get("roles", [])
                    if "registrant" in roles or "administrative" in roles:
                        # Look for organization in vcard
                        vcard = obj_data.get("vcardArray")
                        if vcard and len(vcard) > 1:
                            for field in vcard[1]:
                                if isinstance(field, list) and len(field) > 3:
                                    # vCard format: ["org", {}, "text", "Organization Name"]
                                    if field[0] == "org" and len(field) > 3:
                                        org_name = str(field[3])
                                        break
                    if org_name:
                        break
        
        if org_name:
            # Normalize the organization name before adding to set
            normalized_org = _normalize_organization_name(org_name)
            if normalized_org:
                organizations.add(normalized_org)
    
    # If we found organizations for multiple domains, check if they're all the same
    if len(organizations) > 1:
        # Multiple different organizations found
        return False
    
    # Either all same organization or couldn't determine - give benefit of doubt
    return True


def _create_enrichment_summary(enrichment_data: Optional[Dict[str, Any]], domains: List[str]) -> Optional[Dict[str, Any]]:
    """
    Create a friendly summary of enrichment data without raw RDAP/WHOIS responses.
    
    Returns a summary indicating:
    - Whether domains appear to be owned by the same organization
    - List of organizations found
    - Which domains were successfully enriched
    """
    if not enrichment_data or not domains:
        return None
    
    rdap_queries = enrichment_data.get("rdap_queries", {})
    if not rdap_queries:
        return None
    
    # Extract organization information for each domain
    domain_organizations = {}
    organizations = set()
    
    for domain in domains:
        rdap_data = rdap_queries.get(domain, {})
        
        if not rdap_data.get("success"):
            domain_organizations[domain] = {
                "enriched": False,
                "organization": None,
                "error": rdap_data.get("error", "Unknown error")
            }
            continue
        
        # Try to extract organization from raw RDAP data
        raw_data = rdap_data.get("raw_data", {})
        org_name = None
        
        if raw_data:
            # Try to get from network object
            network = raw_data.get("network", {})
            if network:
                network_name = network.get("name", "")
                if network_name:
                    org_name = network_name
            
            # Try to get from objects/entities with role "registrant"
            if not org_name:
                objects = raw_data.get("objects", {})
                for obj_key, obj_data in objects.items():
                    if isinstance(obj_data, dict):
                        roles = obj_data.get("roles", [])
                        if "registrant" in roles or "administrative" in roles:
                            vcard = obj_data.get("vcardArray")
                            if vcard and len(vcard) > 1:
                                for field in vcard[1]:
                                    if isinstance(field, list) and len(field) > 3:
                                        if field[0] == "org" and len(field) > 3:
                                            org_name = str(field[3])
                                            break
                        if org_name:
                            break
        
        domain_organizations[domain] = {
            "enriched": True,
            "organization": org_name,
            "asn": rdap_data.get("asn"),
            "asn_description": rdap_data.get("asn_description")
        }
        
        if org_name:
            # Use normalized name for comparison
            normalized_org = _normalize_organization_name(org_name)
            if normalized_org:
                organizations.add(normalized_org)
    
    # Determine if all domains appear to be owned by the same organization
    enriched_domains = [d for d, info in domain_organizations.items() if info["enriched"]]
    same_organization = len(organizations) <= 1 if organizations else None
    
    summary = {
        "domains_analyzed": len(domains),
        "domains_enriched": len(enriched_domains),
        "same_organization": same_organization,
        "organizations_found": sorted(organizations) if organizations else [],
        "domain_details": domain_organizations
    }
    
    return summary


def compute_risk_for_sp(
    sp: Dict[str, Any],
    has_impersonation: bool,
    has_offline_access: bool,
    app_role_max_weight: int,
    delegated_scopes_by_resource: Dict[str, Set[str]],
    assignments: List[Dict[str, Any]],
    owners: List[Dict[str, Any]],
    requires_assignment: Optional[bool],
    dir_role_assignments: List[Dict[str, Any]],
    sp_display: str,
    dir_cache: DirectoryCache,
    credential_insights: Optional[Dict[str, Any]] = None,
    reply_url_analysis: Optional[Dict[str, Any]] = None,
    public_client_indicators: Optional[Dict[str, Any]] = None,
    platform_signals: Optional[Dict[str, Any]] = None,
    reply_url_enrichment: Optional[Dict[str, Any]] = None,
    app_ownership: Optional[str] = None,
    role_defs: Optional[Dict[str, Dict[str, Any]]] = None,
    tenant_posture: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Compute risk score for service principal based on loaded configuration."""
    config = SCORING_CONFIG.get("compute_risk_for_sp", {})
    contributors = config.get("scoring_contributors", {})
    final_score_config = config.get("final_score_limitation", {})
    
    score = 0
    reasons: List[Dict[str, Any]] = []
    
    # Extract total_urls once for use in multiple reply URL checks
    total_urls = reply_url_analysis.get("total_urls", 0) if reply_url_analysis else 0

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

    # HAS_APP_ROLE (gate for well-known Microsoft platform apps)
    if app_role_max_weight > 0:
        # Skip or reduce weight for well-known Microsoft platform apps
        is_well_known_ms = platform_signals and platform_signals.get("isWellKnownMicrosoftAppId", False)
        if not is_well_known_ms:
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

    # HAS_PRIVILEGED_SCOPES - unified scope risk based on classification
    # Calculate max scope risk weight from delegated_scopes_by_resource
    max_scope_risk_weight = 0
    max_ms_privilege_level: Optional[int] = None  # highest MS privilege level seen across all scopes
    all_high_privilege_scopes: List[Dict[str, Any]] = []
    scope_risk_details = {
        "readwrite_all_count": 0,
        "action_privileged_count": 0,
        "too_broad_count": 0,
        "write_privileged_count": 0,
        "max_risk_class": "regular"
    }
    
    for resource_id, scopes in delegated_scopes_by_resource.items():
        if scopes:
            classification = classify_scopes(scopes)
            risk_weight = classification.get("risk_weight", 0)
            risk_class = classification.get("classification", "regular")
            
            if risk_weight > max_scope_risk_weight:
                max_scope_risk_weight = risk_weight
                scope_risk_details["max_risk_class"] = risk_class
            
            # Count scopes by risk class
            scope_risk_details["readwrite_all_count"] += len(classification.get("readwrite_all", []))
            scope_risk_details["action_privileged_count"] += len(classification.get("action_privileged", []))
            scope_risk_details["too_broad_count"] += len(classification.get("too_broad", []))
            scope_risk_details["write_privileged_count"] += len(classification.get("write_privileged", []))

            # Collect MS privilege level data (issue #56)
            resource_max_level = classification.get("max_privilege_level")
            if resource_max_level is not None:
                if max_ms_privilege_level is None or resource_max_level > max_ms_privilege_level:
                    max_ms_privilege_level = resource_max_level
            all_high_privilege_scopes.extend(classification.get("high_privilege_scopes", []))
    
    if max_scope_risk_weight > 0:
        privileged_config = contributors.get("HAS_PRIVILEGED_SCOPES", {})
        base_weight = privileged_config.get("weight", 20)
        # Use the higher of base weight or calculated risk weight
        weight = max(base_weight, max_scope_risk_weight)
        description = privileged_config.get("description", "Privileged delegated scopes granted")
        
        # Build detailed message
        risk_class = scope_risk_details["max_risk_class"]
        if risk_class == "readwrite_all":
            message = f"ReadWrite.All scopes granted ({scope_risk_details['readwrite_all_count']} scopes)"
        elif risk_class == "action_privileged":
            message = f"Action-style permissions granted ({scope_risk_details['action_privileged_count']} scopes)"
        elif risk_class == "too_broad":
            message = f"Overly broad .All scopes ({scope_risk_details['too_broad_count']} scopes)"
        elif risk_class == "write_privileged":
            message = f"Write-privileged scopes granted ({scope_risk_details['write_privileged_count']} scopes)"
        else:
            message = description
        
        score += weight
        reasons.append({
            "code": "HAS_PRIVILEGED_SCOPES",
            "message": message,
            "weight": weight,
            "scopeRiskClass": risk_class,
            "scopeRiskDetails": scope_risk_details,
        })

    # HAS_HIGH_PRIVILEGE_PERMISSION (issue #56)
    # Fires when Microsoft's official permissions tiering data confirms that one or more
    # delegated scopes carry privilege level 4 or 5 — providing authoritative confirmation
    # beyond pattern-matching alone.  Only applied when the tiering data is available
    # (max_ms_privilege_level is not None).
    if max_ms_privilege_level is not None and max_ms_privilege_level >= 4:
        hhp_config = contributors.get("HAS_HIGH_PRIVILEGE_PERMISSION", {})
        if max_ms_privilege_level >= 5:
            weight = hhp_config.get("weight_level5", 25)
        else:
            weight = hhp_config.get("weight_level4", 15)
        scope_names = ", ".join(s["scope"] for s in all_high_privilege_scopes[:3])
        suffix = f" (+{len(all_high_privilege_scopes) - 3} more)" if len(all_high_privilege_scopes) > 3 else ""
        message = (
            f"Microsoft confirms privilege level {max_ms_privilege_level}/5 "
            f"for delegated scope(s): {scope_names}{suffix}"
        )
        score += weight
        reasons.append({
            "code": "HAS_HIGH_PRIVILEGE_PERMISSION",
            "message": message,
            "weight": weight,
            "msPrivilegeLevel": max_ms_privilege_level,
            "highPrivilegeScopes": all_high_privilege_scopes,
        })

    # OFFLINE_ACCESS_PERSISTENCE (offline_access)
    if has_offline_access:
        persistence_config = contributors.get("OFFLINE_ACCESS_PERSISTENCE", {})
        weight = persistence_config.get("weight", 8)
        details = persistence_config.get("details", "App requests offline_access (delegated) for refresh-token persistence")
        score += weight
        reasons.append({
            "code": "OFFLINE_ACCESS_PERSISTENCE",
            "message": details,
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

    # PRIVILEGE (directory roles) - tier-aware scoring
    roles_reachable = len(dir_role_assignments or [])
    if roles_reachable > 0:
        privilege_config = contributors.get("PRIVILEGE", {})
        
        # Initialize tier counters and role tracking
        tier_counts = {"tier0": 0, "tier1": 0, "tier2": 0, "unknown": 0}
        roles_by_tier = {"tier0": [], "tier1": [], "tier2": [], "unknown": []}
        
        # Classify roles by tier
        role_defs_dict = role_defs or {}
        for ra in dir_role_assignments:
            role_def_id = ra.get("roleDefinitionId")
            if not role_def_id:
                continue
            
            tier = get_role_tier(role_def_id)
            rd = role_defs_dict.get(role_def_id, {"id": role_def_id})
            role_name = rd.get("displayName", "Unknown Role")
            
            if tier:
                tier_counts[tier] += 1
                roles_by_tier[tier].append({
                    "roleDefinitionId": role_def_id,
                    "displayName": role_name,
                    "tier": tier
                })
            else:
                tier_counts["unknown"] += 1
                roles_by_tier["unknown"].append({
                    "roleDefinitionId": role_def_id,
                    "displayName": role_name,
                    "tier": "unknown"
                })
        
        # Calculate tier-based weights
        total_weight = 0
        tier_details = []
        
        # Process each tier (highest priority first)
        for tier_name in ["tier0", "tier1", "tier2"]:
            count = tier_counts[tier_name]
            if count > 0:
                tier_config = get_tier_config(tier_name)
                base_weight = tier_config.get("base_weight", 0)
                per_role_weight = tier_config.get("weight_per_role", 0)
                max_weight = tier_config.get("max_weight", 0)
                
                tier_weight = min(base_weight + (per_role_weight * count), max_weight)
                total_weight += tier_weight
                
                tier_details.append({
                    "tier": tier_name,
                    "count": count,
                    "weight": tier_weight,
                    "roles": roles_by_tier[tier_name][:5]  # Top 5 roles per tier
                })
        
        # Fallback for unknown/unclassified roles
        unknown_count = tier_counts["unknown"]
        if unknown_count > 0:
            legacy_fallback = privilege_config.get("legacy_fallback", {})
            base_weight = legacy_fallback.get("base_weight", 10)
            per_role_weight = legacy_fallback.get("per_role_weight", 5)
            max_weight = legacy_fallback.get("max_weight", 30)
            
            unknown_weight = min(base_weight + (per_role_weight * unknown_count), max_weight)
            total_weight += unknown_weight
            
            tier_details.append({
                "tier": "unknown",
                "count": unknown_count,
                "weight": unknown_weight,
                "roles": roles_by_tier["unknown"][:5]
            })
        
        if total_weight > 0:
            description = privilege_config.get("description", "Directory roles reachable from app")
            score += total_weight
            reasons.append({
                "code": "PRIVILEGE",
                "message": f"{description} ({roles_reachable} total assignments)",
                "weight": total_weight,
                "tierBreakdown": tier_details,
                "rolesReachableTier0": tier_counts["tier0"],
                "rolesReachableTier1": tier_counts["tier1"],
                "rolesReachableTier2": tier_counts["tier2"],
            })

    # UNVERIFIED_PUBLISHER
    # Skip for Internal apps (appOwnerOrganizationId == tenantId) as they don't need verification
    verified = is_verified_publisher(sp.get("verifiedPublisher"))
    is_internal = app_ownership == "Internal"
    if not verified and not is_internal:
        unverified_config = contributors.get("UNVERIFIED_PUBLISHER", {})
        weight = unverified_config.get("weight", 6)
        details = unverified_config.get("details", "Service principal has no verifiedPublisherId")
        score += weight
        reasons.append({
            "code": "UNVERIFIED_PUBLISHER",
            "message": details,
            "weight": weight,
        })

    # DECEPTION (name mismatch in addition to unverified) - gate for well-known Microsoft platform apps and 1st Party apps
    # Only applies when there are reply URLs (user-facing OAuth flows where deception matters)
    publisher = sp.get("publisherName") or ""
    display_name = sp_display or sp.get("appDisplayName") or ""
    deception = (not verified) and publisher and display_name and publisher.lower() != display_name.lower()
    
    # Skip for well-known Microsoft platform apps and 1st Party apps (identified via Merill's feed)
    is_well_known_ms = platform_signals and platform_signals.get("isWellKnownMicrosoftAppId", False)
    is_first_party = app_ownership == "1st Party"
    
    if deception and not is_well_known_ms and not is_first_party and total_urls > 0:
        deception_config = contributors.get("DECEPTION", {})
        weight = deception_config.get("weight", 20)
        description = deception_config.get("description", "Unverified publisher with name mismatch")
        score += weight
        reasons.append({
            "code": "DECEPTION",
            "message": description,
            "weight": weight,
        })

    # IDENTITY_LAUNDERING (Microsoft-owned appOwnerOrganizationId but not a first-party app)
    # Only applies when there are reply URLs (user-facing OAuth flows where attribution confusion matters)
    # Skip if app is confirmed as 1st Party via Merill's Microsoft Apps feed
    app_owner_org_id = sp.get("appOwnerOrganizationId")
    is_first_party = app_ownership == "1st Party"
    if not verified and app_owner_org_id in MICROSOFT_TENANT_IDS and not is_first_party and total_urls > 0:
        identity_laundering_config = contributors.get("IDENTITY_LAUNDERING", {})
        weight = identity_laundering_config.get("weight", 15)
        details = identity_laundering_config.get("details", "App appears Microsoft-owned but is unverified multi-tenant")
        score += weight
        reasons.append({
            "code": "IDENTITY_LAUNDERING",
            "message": details,
            "weight": weight,
        })

    # MIXED_REPLYURL_DOMAINS (heuristic, non-blocking) - gate for well-known Microsoft platform apps and 1st Party apps
    reply_urls_value = sp.get("replyUrls")
    reply_urls = reply_urls_value if isinstance(reply_urls_value, list) else []
    homepage = sp.get("homepage")
    info_value = sp.get("info")
    # Ensure info is always a dict (Graph API might return unexpected types)
    info = info_value if isinstance(info_value, dict) else {}
    mixed_domains_result = check_mixed_replyurl_domains(reply_urls, homepage, info)
    
    # Skip for well-known Microsoft platform apps and 1st Party apps
    is_well_known_ms = platform_signals and platform_signals.get("isWellKnownMicrosoftAppId", False)
    is_first_party = app_ownership == "1st Party"
    
    # Only check mixed domains if there are reply URLs to analyze (total_urls calculated at function start)
    if total_urls > 0 and mixed_domains_result.get("has_mixed_domains") and mixed_domains_result.get("signal_type") and not is_well_known_ms and not is_first_party:
        mixed_domains_config = contributors.get("MIXED_REPLYURL_DOMAINS", {})
        signal_type = mixed_domains_result["signal_type"]
        
        # Check if all domains belong to the same organization via enrichment data
        all_domains = mixed_domains_result.get("domains", [])
        same_org = _check_same_organization(reply_url_enrichment, all_domains)
        
        # Only flag if enrichment doesn't show they're all owned by same organization
        if not same_org:
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
    
    # REPLYURL_OUTLIER_DOMAIN (domain not in main vendor domain set)
    # Only check for outlier domains if there are reply URLs to analyze
    # Also check enrichment data to see if non-aligned domains belong to same organization
    # Skip for well-known Microsoft platform apps and 1st Party apps
    is_first_party = app_ownership == "1st Party"
    is_well_known_ms = platform_signals and platform_signals.get("isWellKnownMicrosoftAppId", False)
    
    if reply_url_analysis and total_urls > 0 and mixed_domains_result.get("non_aligned_domains") and not is_well_known_ms and not is_first_party:
        non_aligned_domains = mixed_domains_result["non_aligned_domains"]
        
        # Check if non-aligned domains belong to the same organization as reference domains
        # If enrichment data shows they're all owned by the same org, don't flag as outlier
        all_domains = mixed_domains_result.get("domains", [])
        same_org = _check_same_organization(reply_url_enrichment, all_domains)
        
        if not same_org:
            # Different organizations confirmed via enrichment - this is a real outlier
            outlier_config = contributors.get("REPLYURL_OUTLIER_DOMAIN", {})
            weight = outlier_config.get("weight", 10)
            details = outlier_config.get("details", "Reply URLs on domains outside main vendor domain set")
            score += weight
            reasons.append({
                "code": "REPLYURL_OUTLIER_DOMAIN",
                "message": details,
                "weight": weight,
                "outlier_domains": non_aligned_domains,
            })

    # CREATED_BEFORE_CONSENT_HARDENING
    created = _parse_iso_datetime(sp.get("createdDateTime"))
    consent_hardening_config = contributors.get("CREATED_BEFORE_CONSENT_HARDENING", {})
    cutoff_date_str = consent_hardening_config.get("cutoff_date", "2025-07-01T00:00:00Z")
    consent_hardening_cutoff = _parse_iso_datetime(cutoff_date_str) or dt.datetime(2025, 7, 1, tzinfo=dt.timezone.utc)
    if created and created < consent_hardening_cutoff:
        weight = consent_hardening_config.get("weight", 10)
        description = consent_hardening_config.get("description", "Application created before July 2025, when consent to applications from unverified publishers began requiring administrative approval. These applications may have been onboarded under weaker consent controls.")
        score += weight
        reasons.append({
            "code": "CREATED_BEFORE_CONSENT_HARDENING",
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
    
    # CREDENTIALS_PRESENT (keyCredentials and/or passwordCredentials)
    has_key_creds = bool((sp.get("keyCredentials") or []))
    has_password_creds = bool((sp.get("passwordCredentials") or []))
    if has_key_creds or has_password_creds:
        creds_present_config = contributors.get("CREDENTIALS_PRESENT", {})
        weight = creds_present_config.get("weight", 10)
        details = creds_present_config.get("details", "Service principal has credentials present")
        score += weight
        reasons.append({
            "code": "CREDENTIALS_PRESENT",
            "message": details,
            "weight": weight,
        })
    
    # PASSWORD_CREDENTIALS_PRESENT (specific to password credentials)
    if has_password_creds:
        password_creds_config = contributors.get("PASSWORD_CREDENTIALS_PRESENT", {})
        weight = password_creds_config.get("weight", 12)
        details = password_creds_config.get("details", "Service principal has password credentials")
        score += weight
        reasons.append({
            "code": "PASSWORD_CREDENTIALS_PRESENT",
            "message": details,
            "weight": weight,
        })

    # REPLY_URL_ANOMALIES
    # Only check for anomalies if there are reply URLs to analyze
    if reply_url_analysis and total_urls > 0:
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
        
        # Wildcard URLs
        if reply_url_analysis.get("wildcard_urls"):
            weight = anomaly_config.get("wildcard_weight", 15)
            description = anomaly_config.get("wildcard_description", "Wildcard domains in reply URLs")
            count = len(reply_url_analysis["wildcard_urls"])
            score += weight
            reasons.append({
                "code": "REPLY_URL_ANOMALIES",
                "message": f"{description} ({count} URLs)",
                "weight": weight,
                "subtype": "wildcard",
            })

    # PUBLIC_CLIENT_FLOW_RISK (public client or implicit flow indicators)
    if public_client_indicators and public_client_indicators.get("risk_indicators"):
        public_client_config = contributors.get("PUBLIC_CLIENT_FLOW_RISK", {})
        risk_indicators = public_client_indicators.get("risk_indicators", [])
        
        # Assign risk based on specific indicators
        if "PUBLIC_CLIENT_FLOWS_ENABLED" in risk_indicators:
            weight = public_client_config.get("public_client_weight", 12)
            description = public_client_config.get("public_client_description", "Public client flows enabled")
            score += weight
            reasons.append({
                "code": "PUBLIC_CLIENT_FLOW_RISK",
                "message": description,
                "weight": weight,
                "subtype": "public_client",
            })
        
        if "IMPLICIT_FLOW_ENABLED" in risk_indicators:
            weight = public_client_config.get("implicit_flow_weight", 15)
            description = public_client_config.get("implicit_flow_description", "Implicit flow enabled")
            score += weight
            reasons.append({
                "code": "PUBLIC_CLIENT_FLOW_RISK",
                "message": description,
                "weight": weight,
                "subtype": "implicit_flow",
            })

    # EXTERNAL_IDENTITY_POSTURE_AMPLIFIER (opportunistic)
    # Only apply if tenant posture is permissive AND app already has high-risk indicators
    if tenant_posture and tenant_posture.get('postureRating') == 'permissive':
        # Check if app has any of the gating conditions
        has_broad_reachability = any(r.get('code') == 'BROAD_REACHABILITY' for r in reasons)
        has_governance_risk = any(r.get('code') in ('GOVERNANCE', 'GOVERNANCE_UNKNOWN') for r in reasons)
        has_unverified_with_privilege = (
            any(r.get('code') == 'UNVERIFIED_PUBLISHER' for r in reasons) and
            (app_role_max_weight > 0 or any(r.get('code') in ('HAS_PRIVILEGED_SCOPES', 'HAS_APP_ROLE') for r in reasons))
        )
        is_first_party_reachable = (
            app_ownership == '1st Party' and total_urls > 0
        )
        
        if has_broad_reachability or has_governance_risk or has_unverified_with_privilege or is_first_party_reachable:
            amplifier_config = contributors.get("EXTERNAL_IDENTITY_POSTURE_AMPLIFIER", {})
            weight = amplifier_config.get("weight", 8)
            description = amplifier_config.get("description", "Permissive external identity posture amplifies discovery and blast radius")
            score += weight
            reasons.append({
                "code": "EXTERNAL_IDENTITY_POSTURE_AMPLIFIER",
                "message": f"{description} (tenant posture: {tenant_posture.get('postureRating')})",
                "weight": weight,
                "postureDetails": {
                    "guestAccess": tenant_posture.get('guestAccess'),
                    "crossTenantDefaultStance": tenant_posture.get('crossTenantDefaultStance'),
                },
            })

    # Apply min/max clamping
    clamping = final_score_config.get("min_max_clamping", {})
    min_score = clamping.get("minimum_allowed_score", 0)
    max_score = clamping.get("maximum_allowed_score", 100)
    score = max(min_score, min(max_score, score))
    
    level = _level_from_score(score)

    return {"score": score, "level": level, "reasons": reasons}


# -----------------------------
# Progress tracking helper
# -----------------------------

def report_progress(completed: int, total: int, item_name: str, report_every: int = 100) -> None:
    """
    Report progress for long-running operations.
    
    Args:
        completed: Number of items completed
        total: Total number of items
        item_name: Name of items being processed (e.g., "application objects fetched")
        report_every: Report every N items or at completion
    """
    if completed % report_every == 0 or completed == total:
        print(f"  progress: {completed}/{total} {item_name}", file=sys.stderr)


# -----------------------------
# Collector
# -----------------------------

@dataclass
class CollectOptions:
    include_all_service_principals: bool = False
    include_first_party: bool = False
    include_single_tenant: bool = False
    enable_dns_enrichment: bool = True  # Default to enabled
    enable_rdap_enrichment: bool = True  # Default to enabled
    enable_ipwhois_enrichment: bool = True  # Default to enabled


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
        self.owners_cache: Dict[str, List[Dict[str, Any]]] = {}  # owners by SP id (cache to avoid redundant calls)

        self._resource_sp_needed: Set[str] = set()
        self._principal_ids_needed: Set[str] = set()
        self._role_def_ids_needed: Set[str] = set()
        self._role_defs: Dict[str, Dict[str, Any]] = {}
        
        # Thread safety locks for parallel operations
        self._app_cache_lock = Lock()
        self._sp_cache_lock = Lock()
        self._role_defs_lock = Lock()
        self._owners_cache_lock = Lock()
        self._id_collection_lock = Lock()  # For _resource_sp_needed, _principal_ids_needed, _role_def_ids_needed

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

    def collect_external_identity_posture(self, access_token: str) -> Dict[str, Any]:
        """
        Opportunistically collect tenant-level external identity and guest posture.
        
        Only attempts collection if the current token has Policy.Read.All permission.
        Returns posture data with conservative risk derivation.
        
        Args:
            access_token: The current Graph API access token
            
        Returns:
            Dict with posture data including:
            - collectionAttempted: bool
            - skippedReason: str (if not attempted)
            - guestAccess: str (if collected)
            - crossTenantDefaultStance: str (if collected)
            - postureRating: str (if collected)
            - rawPolicies: dict (if collected)
            - error: str (if collection failed)
        """
        result = {
            'collectionAttempted': False,
            'skippedReason': None,
            'guestAccess': None,
            'crossTenantDefaultStance': None,
            'postureRating': 'unknown',
            'rawPolicies': {},
            'error': None,
        }
        
        # Check token permissions
        token_perms = get_token_permissions(access_token)
        if not token_perms.get('hasPolicyReadAll'):
            result['skippedReason'] = f"Token lacks Policy.Read.All (type: {token_perms.get('tokenType', 'unknown')})"
            print(f"  ℹ️  Skipping external identity posture collection: {result['skippedReason']}", file=sys.stderr)
            return result
        
        result['collectionAttempted'] = True
        print("  → Collecting external identity posture (opportunistic)...", file=sys.stderr)
        
        # Attempt to collect policies
        policies = {}
        
        # 1. Authorization Policy (guest settings)
        try:
            auth_policy = self.graph.get(f"{GRAPH_BETA}/policies/authorizationPolicy")
            policies['authorizationPolicy'] = auth_policy
        except Exception as e:
            error_msg = str(e)
            if 'Forbidden' in error_msg or '403' in error_msg or 'Insufficient privileges' in error_msg:
                result['error'] = f"Policy.Read.All present but Graph denied access: {error_msg[:200]}"
                print(f"  ⚠️  {result['error']}", file=sys.stderr)
                return result
            print(f"  ⚠️  Failed to fetch authorizationPolicy: {error_msg[:200]}", file=sys.stderr)
        
        # 2. Cross-Tenant Access Policy
        try:
            cross_tenant = self.graph.get(f"{GRAPH_BETA}/policies/crossTenantAccessPolicy")
            policies['crossTenantAccessPolicy'] = cross_tenant
        except Exception as e:
            print(f"  ⚠️  Failed to fetch crossTenantAccessPolicy: {str(e)[:200]}", file=sys.stderr)
        
        # 3. External Identities Policy (if available)
        try:
            external_ids = self.graph.get(f"{GRAPH_BETA}/policies/externalIdentitiesPolicy")
            policies['externalIdentitiesPolicy'] = external_ids
        except Exception as e:
            # May not exist in all tenants, only log at debug level
            pass
        
        result['rawPolicies'] = policies
        
        # Derive posture fields conservatively
        auth_policy = policies.get('authorizationPolicy', {})
        cross_tenant = policies.get('crossTenantAccessPolicy', {})
        
        # Guest access level
        guest_user_role = auth_policy.get('guestUserRoleId', '')
        allow_invites = auth_policy.get('allowInvitesFrom', '')
        
        if guest_user_role == '2af84b1e-32c8-42b7-82bc-daa82404023b':
            # Restricted guest access
            guest_access = 'restricted'
        elif guest_user_role == '10dae51f-b6af-4016-8d66-8c2a99b929b3':
            # Limited guest access (default)
            guest_access = 'limited'
        elif allow_invites == 'adminsAndGuestInviters' or allow_invites == 'everyone':
            guest_access = 'permissive'
        else:
            guest_access = 'unknown'
        
        result['guestAccess'] = guest_access
        
        # Cross-tenant default stance
        default_settings = cross_tenant.get('default', {})
        b2b_inbound = default_settings.get('b2bCollaborationInbound', {})
        b2b_outbound = default_settings.get('b2bCollaborationOutbound', {})
        
        inbound_blocked = b2b_inbound.get('usersAndGroups', {}).get('accessType', '') == 'blocked'
        outbound_blocked = b2b_outbound.get('usersAndGroups', {}).get('accessType', '') == 'blocked'
        
        if inbound_blocked and outbound_blocked:
            cross_tenant_stance = 'restrictive'
        elif inbound_blocked or outbound_blocked:
            cross_tenant_stance = 'moderate'
        else:
            cross_tenant_stance = 'permissive'
        
        result['crossTenantDefaultStance'] = cross_tenant_stance
        
        # Derive overall posture rating (conservative)
        if guest_access == 'restricted' and cross_tenant_stance == 'restrictive':
            rating = 'hardened'
        elif guest_access in ('restricted', 'limited') and cross_tenant_stance in ('restrictive', 'moderate'):
            rating = 'moderate'
        elif guest_access == 'permissive' or cross_tenant_stance == 'permissive':
            rating = 'permissive'
        else:
            rating = 'unknown'
        
        result['postureRating'] = rating
        
        print(f"  ✓ External identity posture: {rating} (guest: {guest_access}, cross-tenant: {cross_tenant_stance})", file=sys.stderr)
        
        return result


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
        # NEW APPROACH: Bulk fetch all applications once, then filter in memory
        # This is MUCH faster than individual filtered queries per appId
        app_ids_needed = {sp.get("appId") for sp in sps if sp.get("appId")}
        
        try:
            # Single bulk fetch of ALL applications in tenant
            # Include credentials and federated identity credentials in the select
            print(f"  Fetching all in-tenant applications in bulk (single query)...", file=sys.stderr)
            all_apps = self.graph.get_paged(
                f"{GRAPH_BETA}/applications?$select=id,appId,displayName,createdDateTime,signInAudience,web,spa,publicClient,requiredResourceAccess,passwordCredentials,keyCredentials,federatedIdentityCredentials"
            )
            print(f"  Retrieved {len(all_apps)} total in-tenant applications", file=sys.stderr)
            
            # Build lookup dictionary and filter to only apps we care about
            # Use lock for thread safety even though bulk fetch is typically single-threaded
            matched = 0
            with self._app_cache_lock:
                for app in all_apps:
                    appid = app.get("appId")
                    if appid and appid in app_ids_needed:
                        self.app_cache_by_appid[appid] = app
                        matched += 1
            
            print(f"  Matched {matched} applications to target service principals", file=sys.stderr)
            
        except Exception as e:
            # Fallback to old approach if bulk fetch fails
            print(f"  Bulk fetch failed ({e}), falling back to individual queries", file=sys.stderr)
            app_ids = sorted(app_ids_needed)
            
            def fetch_single_app(appid: str) -> Optional[Tuple[str, Dict[str, Any]]]:
                try:
                    apps = self.graph.get_paged(f"{GRAPH_BETA}/applications?$filter=appId eq '{appid}'&$select=id,appId,displayName,createdDateTime,signInAudience,web,spa,publicClient,requiredResourceAccess,passwordCredentials,keyCredentials,federatedIdentityCredentials")
                    if apps:
                        return (appid, apps[0])
                except Exception:
                    pass
                return None
            
            completed = 0
            with ThreadPoolExecutor(max_workers=20) as executor:
                future_to_appid = {executor.submit(fetch_single_app, appid): appid for appid in app_ids}
                for future in as_completed(future_to_appid):
                    result = future.result()
                    if result:
                        appid, app_obj = result
                        with self._app_cache_lock:
                            self.app_cache_by_appid[appid] = app_obj
                    
                    completed += 1
                    report_progress(completed, len(app_ids), "application objects fetched")

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
        # Check cache first
        with self._owners_cache_lock:
            if sp_id in self.owners_cache:
                return self.owners_cache[sp_id]
        
        # directoryObject collection
        url = f"{GRAPH_BETA}/servicePrincipals/{sp_id}/owners?$select=id,displayName"
        owners = self.graph.get_paged(url)
        
        # Cache the result
        with self._owners_cache_lock:
            self.owners_cache[sp_id] = owners
        
        return owners

    def fetch_directory_role_assignments_to_principal(self, principal_id: str) -> List[Dict[str, Any]]:
        # roleManagement API (v1.0)
        select = "id,principalId,roleDefinitionId,directoryScopeId"
        url = f"{GRAPH_V1}/roleManagement/directory/roleAssignments?$filter=principalId eq '{principal_id}'&$select={select}"
        return self.graph.get_paged(url)

    def fetch_all_data_for_sp(self, sp: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fetch all data for a single service principal.
        Returns a dict with grants, app_perms, assigned_to, owners, dir_roles,
        and extracted IDs for resource_sps, principals, and role_defs.
        
        OPTIMIZED: Parallelizes the 5 Graph API calls per SP for faster collection.
        """
        sp_id = sp["id"]
        result = {
            "sp_id": sp_id,
            "grants": [],
            "app_perms": [],
            "assigned_to": [],
            "owners": [],
            "dir_roles": [],
            "resource_sp_ids": set(),
            "principal_ids": set(),
            "role_def_ids": set(),
            "scopes_by_res": {},
        }
        
        # Parallelize the 5 API calls for this SP using ThreadPoolExecutor
        # This reduces latency significantly (5 sequential calls → 1 parallel batch)
        with ThreadPoolExecutor(max_workers=5) as executor:
            # Submit all 5 calls in parallel
            future_grants = executor.submit(self._safe_fetch_oauth2_grants, sp_id)
            future_app_perms = executor.submit(self._safe_fetch_app_role_assignments, sp_id)
            future_assigned_to = executor.submit(self._safe_fetch_app_role_assigned_to, sp_id)
            future_owners = executor.submit(self._safe_fetch_owners, sp_id)
            future_dir_roles = executor.submit(self._safe_fetch_directory_roles, sp_id)
            
            # Collect results
            grants = future_grants.result()
            app_perms = future_app_perms.result()
            assigned_to = future_assigned_to.result()
            owners = future_owners.result()
            dir_roles = future_dir_roles.result()
        
        result["grants"] = grants
        result["app_perms"] = app_perms
        result["assigned_to"] = assigned_to
        result["owners"] = owners
        result["dir_roles"] = dir_roles
        
        # Process grants for scope extraction
        scopes_by_res: Dict[str, Set[str]] = {}
        for g in grants:
            rid = g.get("resourceId")
            if rid:
                result["resource_sp_ids"].add(rid)
                scopes = set((g.get("scope") or "").split())
                scopes_by_res.setdefault(rid, set()).update(scopes)
            pid = g.get("principalId")
            if pid:
                result["principal_ids"].add(pid)
        result["scopes_by_res"] = scopes_by_res
        
        # Extract resource SP IDs from app permissions
        for a in app_perms:
            rid = a.get("resourceId")
            if rid:
                result["resource_sp_ids"].add(rid)
        
        # Extract principal IDs from assignments
        for a in assigned_to:
            pid = a.get("principalId")
            if pid:
                result["principal_ids"].add(pid)
        
        # Extract principal IDs from owners
        for o in owners:
            oid = o.get("id")
            if oid:
                result["principal_ids"].add(oid)
        
        # Extract role definition IDs
        for ra in dir_roles:
            rid = ra.get("roleDefinitionId")
            if rid:
                result["role_def_ids"].add(rid)
        
        return result
    
    def fetch_all_data_for_sps_batched(self, sps: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """
        Fetch all data for multiple service principals using Graph API batching.
        This is significantly faster than individual requests as it combines up to 20 requests
        into a single HTTP call.
        
        Beta batch: 5 SPs × 4 operations = 20 requests per batch
        v1.0 batch: 20 SPs × 1 operation = 20 requests per batch
        
        Uses multi-threading to execute batches in parallel for maximum performance.
        
        Returns a dict mapping sp_id to result dict with grants, app_perms, assigned_to, owners, dir_roles,
        and extracted IDs.
        """
        results = {}
        results_lock = Lock()
        completed_batches = 0
        completed_batches_lock = Lock()
        total_batches = len([sps[i:i+5] for i in range(0, len(sps), 5)])  # Calculate total batches upfront
        
        # Maximize batching efficiency:
        # - Beta API: 5 SPs per batch (5 SPs × 4 operations = 20 requests)
        # - v1.0 API: Bundled with beta batch (same SPs, separate batch call)
        beta_batch_size = 5
        
        # Create batches for beta operations (limiting factor since each SP needs 4 beta requests)
        beta_sp_batches = [sps[i:i+beta_batch_size] for i in range(0, len(sps), beta_batch_size)]
        
        print(f"  Using Graph API batching: {len(beta_sp_batches)} beta batches of up to {beta_batch_size} SPs each", file=sys.stderr)
        print(f"  Multi-threading enabled: Processing batches in parallel", file=sys.stderr)
        
        def process_batch(batch_idx: int, sp_batch: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
            """Process a single batch of SPs with beta and v1.0 operations."""
            batch_results = {}
            
            # Build batch requests - separate beta and v1.0 calls since they can't be mixed
            beta_batch_requests = []
            v1_batch_requests = []
            request_map = {}  # Maps request ID to (sp_id, operation_type)
            req_counter = 1  # Simple sequential numeric IDs matching Microsoft Graph examples
            
            for sp in sp_batch:
                sp_id = sp["id"]
                
                # Beta API requests (4 operations)
                # 1. OAuth2 permission grants
                req_id_grants = str(req_counter)
                req_counter += 1
                beta_batch_requests.append({
                    "id": req_id_grants,
                    "method": "GET",
                    "url": f"/oauth2PermissionGrants?$filter=clientId eq '{sp_id}'&$select=id,clientId,resourceId,scope,consentType,principalId,expiryTime"
                })
                request_map[req_id_grants] = (sp_id, "grants")
                
                # 2. App role assignments (app permissions)
                req_id_app_perms = str(req_counter)
                req_counter += 1
                beta_batch_requests.append({
                    "id": req_id_app_perms,
                    "method": "GET",
                    "url": f"/servicePrincipals/{sp_id}/appRoleAssignments?$select=id,appRoleId,principalId,resourceId"
                })
                request_map[req_id_app_perms] = (sp_id, "app_perms")
                
                # 3. App role assigned to (assignments)
                req_id_assigned_to = str(req_counter)
                req_counter += 1
                beta_batch_requests.append({
                    "id": req_id_assigned_to,
                    "method": "GET",
                    "url": f"/servicePrincipals/{sp_id}/appRoleAssignedTo?$select=id,appRoleId,principalId,resourceId"
                })
                request_map[req_id_assigned_to] = (sp_id, "assigned_to")
                
                # 4. Owners
                req_id_owners = str(req_counter)
                req_counter += 1
                beta_batch_requests.append({
                    "id": req_id_owners,
                    "method": "GET",
                    "url": f"/servicePrincipals/{sp_id}/owners?$select=id,displayName"
                })
                request_map[req_id_owners] = (sp_id, "owners")
                
                # v1.0 API requests (1 operation)
                # 5. Directory role assignments
                req_id_dir_roles = str(req_counter)
                req_counter += 1
                v1_batch_requests.append({
                    "id": req_id_dir_roles,
                    "method": "GET",
                    "url": f"/roleManagement/directory/roleAssignments?$filter=principalId eq '{sp_id}'&$select=id,principalId,roleDefinitionId,directoryScopeId"
                })
                request_map[req_id_dir_roles] = (sp_id, "dir_roles")
                
                # Initialize result structure for this SP
                batch_results[sp_id] = {
                    "sp_id": sp_id,
                    "grants": [],
                    "app_perms": [],
                    "assigned_to": [],
                    "owners": [],
                    "dir_roles": [],
                    "resource_sp_ids": set(),
                    "principal_ids": set(),
                    "role_def_ids": set(),
                    "scopes_by_res": {},
                }
            
            # Execute batch requests (separate calls for beta and v1.0)
            try:
                all_responses = []
                
                # Execute beta batch if there are beta requests
                if beta_batch_requests:
                    beta_responses = self.graph.batch(beta_batch_requests, api_version="beta")
                    all_responses.extend(beta_responses)
                
                # Execute v1.0 batch if there are v1.0 requests
                if v1_batch_requests:
                    v1_responses = self.graph.batch(v1_batch_requests, api_version="v1.0")
                    all_responses.extend(v1_responses)
                
                # Process responses
                for response in all_responses:
                    req_id = response.get("id")
                    status = response.get("status", 0)
                    body = response.get("body", {})
                    
                    if req_id not in request_map:
                        continue
                    
                    sp_id, operation = request_map[req_id]
                    
                    # Handle successful responses (200 or 404)
                    if status == 200:
                        data = body.get("value", [])
                        batch_results[sp_id][operation] = data
                    elif status == 404:
                        # Not found is acceptable (no data for this operation)
                        batch_results[sp_id][operation] = []
                    else:
                        # Other errors - log with details and use empty data
                        error_msg = body.get("error", {}).get("message", "Unknown error")
                        print(f"⚠️  Batch request {req_id} ({operation}) failed with status {status}: {error_msg}", file=sys.stderr)
                        batch_results[sp_id][operation] = []
                        
            except Exception as e:
                print(f"⚠️  Batch {batch_idx + 1}/{len(beta_sp_batches)} failed: {e}, falling back to individual requests", file=sys.stderr)
                # Fallback to parallel individual requests for this batch
                with ThreadPoolExecutor(max_workers=5) as executor:
                    future_to_sp = {executor.submit(self.fetch_all_data_for_sp, sp): sp for sp in sp_batch}
                    for future in as_completed(future_to_sp):
                        try:
                            result = future.result()
                            batch_results[result["sp_id"]] = result
                        except Exception as e2:
                            print(f"⚠️  Failed to fetch data for SP {future_to_sp[future].get('id')}: {e2}", file=sys.stderr)
            
            return batch_results
        
        # Process batches in parallel using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=20) as executor:
            future_to_batch = {
                executor.submit(process_batch, batch_idx, sp_batch): (batch_idx, sp_batch)
                for batch_idx, sp_batch in enumerate(beta_sp_batches)
            }
            
            for future in as_completed(future_to_batch):
                batch_idx, sp_batch = future_to_batch[future]
                try:
                    batch_results = future.result()
                    
                    # Asynchronously update results with thread safety
                    with results_lock:
                        results.update(batch_results)
                    
                    # Progress indicator - track batch completion
                    with completed_batches_lock:
                        completed_batches += 1
                        if completed_batches % 25 == 0 or completed_batches == total_batches:
                            completed_sps = len(results)
                            print(f"  progress: {completed_sps}/{len(sps)} service principals processed ({completed_batches}/{total_batches} batches)", file=sys.stderr)
                except Exception as e:
                    print(f"⚠️  Unexpected error processing batch {batch_idx + 1}: {e}", file=sys.stderr)
        
        # Post-process results to extract IDs
        for sp_id, result in results.items():
            # Process grants for scope extraction
            scopes_by_res: Dict[str, Set[str]] = {}
            for g in result["grants"]:
                rid = g.get("resourceId")
                if rid:
                    result["resource_sp_ids"].add(rid)
                    scopes = set((g.get("scope") or "").split())
                    scopes_by_res.setdefault(rid, set()).update(scopes)
                pid = g.get("principalId")
                if pid:
                    result["principal_ids"].add(pid)
            result["scopes_by_res"] = scopes_by_res
            
            # Extract resource SP IDs from app permissions
            for a in result["app_perms"]:
                rid = a.get("resourceId")
                if rid:
                    result["resource_sp_ids"].add(rid)
            
            # Extract principal IDs from assignments
            for a in result["assigned_to"]:
                pid = a.get("principalId")
                if pid:
                    result["principal_ids"].add(pid)
            
            # Extract owner IDs
            for owner in result["owners"]:
                oid = owner.get("id")
                if oid:
                    result["principal_ids"].add(oid)
            
            # Extract role definition IDs
            for ra in result["dir_roles"]:
                rid = ra.get("roleDefinitionId")
                if rid:
                    result["role_def_ids"].add(rid)
        
        return results
    
    # Helper methods with error handling for parallel execution
    def _safe_fetch_oauth2_grants(self, sp_id: str) -> List[Dict[str, Any]]:
        try:
            return self.fetch_oauth2_permission_grants(sp_id)
        except Exception as e:
            print(f"⚠️  oauth2PermissionGrants failed for {sp_id}: {e}", file=sys.stderr)
            return []
    
    def _safe_fetch_app_role_assignments(self, sp_id: str) -> List[Dict[str, Any]]:
        try:
            return self.fetch_app_role_assignments(sp_id)
        except Exception as e:
            print(f"⚠️  appRoleAssignments failed for {sp_id}: {e}", file=sys.stderr)
            return []
    
    def _safe_fetch_app_role_assigned_to(self, sp_id: str) -> List[Dict[str, Any]]:
        try:
            return self.fetch_app_role_assigned_to(sp_id)
        except Exception as e:
            print(f"⚠️  appRoleAssignedTo failed for {sp_id}: {e}", file=sys.stderr)
            return []
    
    def _safe_fetch_owners(self, sp_id: str) -> List[Dict[str, Any]]:
        try:
            return self.fetch_owners(sp_id)
        except Exception as e:
            print(f"⚠️  owners failed for {sp_id}: {e}", file=sys.stderr)
            return []
    
    def _safe_fetch_directory_roles(self, sp_id: str) -> List[Dict[str, Any]]:
        try:
            return self.fetch_directory_role_assignments_to_principal(sp_id)
        except Exception as e:
            print(f"⚠️  directory roleAssignments failed for {sp_id}: {e}", file=sys.stderr)
            return []

    def fetch_role_definitions(self, ids: Set[str]) -> None:
        # roleDefinitions are queryable; fetch in parallel
        ids_to_fetch = [rid for rid in ids if rid not in self._role_defs]
        
        def fetch_single_role(rid: str) -> Tuple[str, Dict[str, Any]]:
            try:
                rd = self.graph.get(f"{GRAPH_V1}/roleManagement/directory/roleDefinitions/{rid}?$select=id,displayName,description,isBuiltIn")
                return (rid, rd)
            except Exception:
                return (rid, {"id": rid, "displayName": None})
        
        # Parallel fetch with ThreadPoolExecutor (increased workers for better performance)
        with ThreadPoolExecutor(max_workers=20) as executor:
            future_to_rid = {executor.submit(fetch_single_role, rid): rid for rid in ids_to_fetch}
            for future in as_completed(future_to_rid):
                rid, rd = future.result()
                with self._role_defs_lock:
                    self._role_defs[rid] = rd

    # ---- resource SP lookup

    def ensure_resource_sps_loaded(self) -> None:
        if not self._resource_sp_needed:
            return
        missing = [rid for rid in self._resource_sp_needed if rid not in self.sp_cache]
        
        def fetch_single_sp(rid: str) -> Tuple[str, Dict[str, Any]]:
            try:
                sp = self.graph.get(f"{GRAPH_BETA}/servicePrincipals/{rid}?$select=id,appId,displayName,appDisplayName,publisherName,replyUrls,servicePrincipalType,signInAudience,verifiedPublisher,appRoles,publishedPermissionScopes,oauth2PermissionScopes,api")
                return (rid, sp)
            except Exception:
                # keep minimal placeholder
                return (rid, {"id": rid, "displayName": None, "appId": None})
        
        # Parallel fetch with ThreadPoolExecutor (increased workers for better performance)
        completed = 0
        with ThreadPoolExecutor(max_workers=20) as executor:
            future_to_rid = {executor.submit(fetch_single_sp, rid): rid for rid in missing}
            for future in as_completed(future_to_rid):
                rid, sp = future.result()
                with self._sp_cache_lock:
                    self.sp_cache[rid] = sp
                
                # Progress indicator
                completed += 1
                report_progress(completed, len(missing), "resource service principals loaded", report_every=50)

    # ---- graph build

    def build(self) -> Dict[str, Any]:
        overall_start = time.time()
        
        print("→ Fetching tenant metadata...", file=sys.stderr)
        stage_start = time.time()
        tenant = self.fetch_tenant()
        tenant_id = tenant.get("tenantId")
        if not tenant_id:
            raise RuntimeError("Could not determine tenantId from /organization")
        print(f"  ✓ Completed in {time.time() - stage_start:.2f}s", file=sys.stderr)
        
        # Opportunistically collect external identity posture
        print("→ Collecting external identity posture (opportunistic)...", file=sys.stderr)
        stage_start = time.time()
        access_token = self.graph.get_access_token()
        external_identity_posture = self.collect_external_identity_posture(access_token)
        print(f"  ✓ Completed in {time.time() - stage_start:.2f}s", file=sys.stderr)

        print("→ Listing service principals...", file=sys.stderr)
        stage_start = time.time()
        sps = self.list_service_principals()
        print(f"  found {len(sps)} service principals (pre-filter) in {time.time() - stage_start:.2f}s", file=sys.stderr)
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
        stage_start = time.time()
        self.fetch_applications_for_sps(target_sps)
        print(f"  application cache populated for {len(self.app_cache_by_appid)} appIds in {time.time() - stage_start:.2f}s", file=sys.stderr)

        # Pre-enrich reply URLs if enrichment is enabled (once for all SPs)
        enrichment_cache = {}
        if any([self.opts.enable_dns_enrichment, self.opts.enable_rdap_enrichment, self.opts.enable_ipwhois_enrichment]):
            print("→ Pre-enriching reply URLs (deduplicating across all SPs)...", file=sys.stderr)
            stage_start_enrich = time.time()
            
            # Collect all unique reply URLs from all target SPs
            all_reply_urls = []
            for sp in target_sps:
                reply_urls_value = sp.get("replyUrls")
                if isinstance(reply_urls_value, list):
                    all_reply_urls.extend(reply_urls_value)
            
            # Perform enrichment once on the full deduplicated set
            if all_reply_urls:
                try:
                    global_enrichment = enrich_reply_urls(
                        all_reply_urls,
                        enable_dns=self.opts.enable_dns_enrichment,
                        enable_rdap=self.opts.enable_rdap_enrichment,
                        enable_ipwhois=self.opts.enable_ipwhois_enrichment
                    )
                    # Cache the results for reuse
                    enrichment_cache = {
                        "dns_lookups": global_enrichment.get("dns_lookups", {}),
                        "rdap_queries": global_enrichment.get("rdap_queries", {}),
                        "ipwhois_queries": global_enrichment.get("ipwhois_queries", {}),
                        "enrichment_enabled": global_enrichment.get("enrichment_enabled", {})
                    }
                    print(f"  ✓ Enrichment completed: {len(enrichment_cache.get('dns_lookups', {}))} DNS, "
                          f"{len(enrichment_cache.get('rdap_queries', {}))} RDAP, "
                          f"{len(enrichment_cache.get('ipwhois_queries', {}))} WHOIS lookups in {time.time() - stage_start_enrich:.2f}s", 
                          file=sys.stderr)
                except Exception as e:
                    print(f"⚠️  Global reply URL enrichment failed: {e}", file=sys.stderr)

        # First pass: gather grants, assignments, owners, role assignments and collect referenced IDs
        sp_delegated_scopes: Dict[str, Dict[str, Set[str]]] = {}  # spId -> resourceId -> scopes set

        grants_by_sp: Dict[str, List[Dict[str, Any]]] = {}
        app_perms_by_sp: Dict[str, List[Dict[str, Any]]] = {}
        assigned_to_by_sp: Dict[str, List[Dict[str, Any]]] = {}
        owners_by_sp: Dict[str, List[Dict[str, Any]]] = {}
        dir_roles_by_sp: Dict[str, List[Dict[str, Any]]] = {}

        print("→ Collecting delegated grants, app permissions, assignments, owners, and directory roles...", file=sys.stderr)
        stage_start = time.time()
        
        # Use batched collection (combines up to 20 API calls per HTTP request)
        batch_results = self.fetch_all_data_for_sps_batched(target_sps)
        
        # Store results from batch
        for sp_id, result in batch_results.items():
            grants_by_sp[sp_id] = result["grants"]
            app_perms_by_sp[sp_id] = result["app_perms"]
            assigned_to_by_sp[sp_id] = result["assigned_to"]
            owners_by_sp[sp_id] = result["owners"]
            dir_roles_by_sp[sp_id] = result["dir_roles"]
            sp_delegated_scopes[sp_id] = result["scopes_by_res"]
            
            # Collect referenced IDs with thread safety
            with self._id_collection_lock:
                self._resource_sp_needed.update(result["resource_sp_ids"])
                self._principal_ids_needed.update(result["principal_ids"])
                self._role_def_ids_needed.update(result["role_def_ids"])

        # Summaries
        grants_total = sum(len(v) for v in grants_by_sp.values())
        app_perms_total = sum(len(v) for v in app_perms_by_sp.values())
        assigned_total = sum(len(v) for v in assigned_to_by_sp.values())
        owners_total = sum(len(v) for v in owners_by_sp.values())
        dir_roles_total = sum(len(v) for v in dir_roles_by_sp.values())
        print(f"  collected: {grants_total} grants, {app_perms_total} app-perms, {assigned_total} assignments, {owners_total} owners, {dir_roles_total} role assignments in {time.time() - stage_start:.2f}s", file=sys.stderr)

        # Resolve referenced directory objects and resource SPs
        print(f"→ Resolving {len(self._principal_ids_needed)} principals via getByIds...", file=sys.stderr)
        stage_start = time.time()
        self.dir_cache.get_many(self._principal_ids_needed)
        print(f"  ✓ Completed in {time.time() - stage_start:.2f}s", file=sys.stderr)
        
        missing_before = len([rid for rid in self._resource_sp_needed if rid not in self.sp_cache])
        print(f"→ Loading {missing_before} resource service principals...", file=sys.stderr)
        stage_start = time.time()
        self.ensure_resource_sps_loaded()
        missing_after = len([rid for rid in self._resource_sp_needed if rid not in self.sp_cache])
        print(f"  loaded {missing_before - missing_after} resources (remaining {missing_after}) in {time.time() - stage_start:.2f}s", file=sys.stderr)
        
        print(f"→ Fetching {len(self._role_def_ids_needed)} role definitions...", file=sys.stderr)
        stage_start = time.time()
        self.fetch_role_definitions(self._role_def_ids_needed)
        print(f"  ✓ Completed in {time.time() - stage_start:.2f}s", file=sys.stderr)

        # Second pass: emit nodes and edges
        print("→ Emitting nodes and edges...", file=sys.stderr)
        stage_start = time.time()
        for sp in target_sps:
            sp_id = sp["id"]
            sp_display = sp.get("displayName") or sp.get("appDisplayName")
            sp_nid = node_id("sp", sp_id, sp_display)

            # Aggregate flags for risk scoring
            has_impersonation = False
            has_offline_access = False
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

            has_app_roles = bool(app_perms_by_sp.get(sp_id))
            owners = owners_by_sp.get(sp_id, [])
            requires_assignment = sp.get("appRoleAssignmentRequired")

            # Analyze credentials from both SP and Application (before risk calculation)
            appid = sp.get("appId")
            app_obj = self.app_cache_by_appid.get(appid) if appid else None
            
            sp_password_creds_value = sp.get("passwordCredentials")
            sp_password_creds = sp_password_creds_value if isinstance(sp_password_creds_value, list) else []
            sp_key_creds_value = sp.get("keyCredentials")
            sp_key_creds = sp_key_creds_value if isinstance(sp_key_creds_value, list) else []
            app_password_creds = (app_obj or {}).get("passwordCredentials") or []
            app_key_creds = (app_obj or {}).get("keyCredentials") or []
            app_federated_creds = (app_obj or {}).get("federatedIdentityCredentials") or []
            
            # Combine credentials for analysis
            all_password_creds = sp_password_creds + app_password_creds
            all_key_creds = sp_key_creds + app_key_creds
            credential_insights = analyze_credentials(all_password_creds, all_key_creds, app_federated_creds)
            
            # Analyze reply URLs (before risk calculation)
            reply_urls_value = sp.get("replyUrls")
            reply_urls = reply_urls_value if isinstance(reply_urls_value, list) else []
            reply_url_analysis = analyze_reply_urls(reply_urls)
            
            # Use cached enrichment results if available
            reply_url_enrichment = None
            if enrichment_cache:
                # Filter cached results for this SP's reply URLs
                reply_url_enrichment = {
                    "dns_lookups": {},
                    "rdap_queries": {},
                    "ipwhois_queries": {},
                    "enrichment_enabled": enrichment_cache.get("enrichment_enabled", {}),
                    "enrichment_errors": []
                }
                
                # Extract eTLD+1 domains from this SP's reply URLs and fetch from cache
                for url in reply_urls:
                    etld = extract_etldplus1(url)
                    if etld and etld in enrichment_cache.get("dns_lookups", {}):
                        reply_url_enrichment["dns_lookups"][etld] = enrichment_cache["dns_lookups"][etld]
                    if etld and etld in enrichment_cache.get("rdap_queries", {}):
                        reply_url_enrichment["rdap_queries"][etld] = enrichment_cache["rdap_queries"][etld]
                    
                    # Check for IP literals in WHOIS cache
                    try:
                        from urllib.parse import urlparse
                        parsed = urlparse(url)
                        hostname = parsed.hostname
                        if hostname and hostname in enrichment_cache.get("ipwhois_queries", {}):
                            reply_url_enrichment["ipwhois_queries"][hostname] = enrichment_cache["ipwhois_queries"][hostname]
                    except Exception:
                        pass
            
            # Analyze public client indicators from Application object
            public_client_indicators = analyze_public_client_indicators(app_obj)
            
            # Analyze platform signals for well-known Microsoft appIds
            platform_signals = analyze_platform_signals(sp.get("appId"))
            
            # Create a friendly enrichment summary (without raw RDAP/WHOIS data)
            enrichment_summary = None
            if reply_url_enrichment:
                # Extract domains from reply URLs for summary
                domains_for_summary = []
                for url in reply_urls:
                    etld = extract_etldplus1(url)
                    if etld:
                        domains_for_summary.append(etld)
                enrichment_summary = _create_enrichment_summary(reply_url_enrichment, domains_for_summary)
            
            # Classify app ownership (1st Party, 3rd Party, or Internal)
            # Attribution: Uses Microsoft Apps list from https://github.com/merill/microsoft-info by Merill Fernando
            has_app_obj = appid and (appid in self.app_cache_by_appid)
            app_ownership = classify_app_ownership(
                sp.get("appId") or "",
                sp.get("appOwnerOrganizationId"),
                has_app_obj
            )

            # service principal node - compute risk with enhanced insights
            risk = compute_risk_for_sp(
                sp,
                has_impersonation,
                has_offline_access,
                app_role_max_weight,
                sp_delegated_scopes.get(sp_id, {}),
                assigned_to_by_sp.get(sp_id, []),
                owners,
                requires_assignment,
                dir_roles_by_sp.get(sp_id, []),
                sp_display,
                self.dir_cache,
                credential_insights,
                reply_url_analysis,
                public_client_indicators,
                platform_signals,
                reply_url_enrichment,
                app_ownership,
                self._role_defs,
                external_identity_posture,
            )
            
            # Check for identity laundering signals
            info_value_check = sp.get("info")
            info_safe = info_value_check if isinstance(info_value_check, dict) else {}
            mixed_domains_result = check_mixed_replyurl_domains(reply_urls, sp.get("homepage"), info_safe)
            identity_laundering_suspected = (
                mixed_domains_result.get("signal_type") == "identity_laundering"
            )
            
            # Build trust signals
            trust_signals = {
                "identityLaunderingSuspected": identity_laundering_suspected,
                "mixedReplyUrlDomains": mixed_domains_result.get("has_mixed_domains", False),
                "nonAlignedDomains": mixed_domains_result.get("non_aligned_domains", []),
            }
            
            # Type-check list fields for properties dict
            tags_value = sp.get("tags")
            tags_safe = tags_value if isinstance(tags_value, list) else []
            key_creds_value = sp.get("keyCredentials")
            key_creds_safe = key_creds_value if isinstance(key_creds_value, list) else []
            password_creds_value = sp.get("passwordCredentials")
            password_creds_safe = password_creds_value if isinstance(password_creds_value, list) else []
            
            props = {
                "servicePrincipalId": sp_id,
                "appId": sp.get("appId"),
                "appDisplayName": sp.get("appDisplayName"),
                "publisherName": sp.get("publisherName"),
                "signInAudience": sp.get("signInAudience"),
                "appOwnerOrganizationId": sp.get("appOwnerOrganizationId"),
                "appOwnership": app_ownership,  # 1st Party, 3rd Party, or Internal
                "createdDateTime": sp.get("createdDateTime"),
                "replyUrls": reply_urls,  # Use the type-checked value
                "homepage": sp.get("homepage"),
                "logoutUrl": sp.get("logoutUrl"),
                "requiresAssignment": sp.get("appRoleAssignmentRequired"),
                "verifiedPublisher": sp.get("verifiedPublisher"),
                "tags": tags_safe,
                "info": info_safe,
                "keyCredentials": key_creds_safe,
                "passwordCredentials": password_creds_safe,
                # Enhanced fields
                "credentialInsights": credential_insights,
                "replyUrlAnalysis": reply_url_analysis,
                "replyUrlEnrichment": enrichment_summary,  # Friendly summary without raw data
                "replyUrlProvenance": {
                    "source": "microsoft_graph",
                    "collection_timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
                    "enrichment_enabled": any([self.opts.enable_dns_enrichment, self.opts.enable_rdap_enrichment, self.opts.enable_ipwhois_enrichment]),
                    "enrichment_success": enrichment_summary is not None
                } if any([self.opts.enable_dns_enrichment, self.opts.enable_rdap_enrichment, self.opts.enable_ipwhois_enrichment]) else None,
                "publicClientIndicators": public_client_indicators,
                "platformSignals": platform_signals,
                "trustSignals": trust_signals,
                # Non-Graph data placeholders (WHOIS/DNS - not populated by Graph-only scanner)
                "domainWhois": None,
                "dnsRecords": None,
            }
            node = self.add_node(sp_nid, "ServicePrincipal", sp_display, props)
            # Add risk at top level if present
            if risk and risk.get("score", 0) > 0:
                self.nodes[sp_nid]["risk"] = risk

            # Application node (only if Application object exists in tenant)
            if appid:
                app_obj = self.app_cache_by_appid.get(appid)
                # Only create Application node if we actually have the Application object
                if app_obj:
                    app_display = app_obj.get("displayName") or sp.get("appDisplayName")
                    app_nid = node_id("app", appid, app_display)
                    self.add_node(app_nid, "Application", app_display, {
                        "appId": appid,
                        "isMultiTenant": app_obj.get("signInAudience") not in (None, "AzureADMyOrg"),
                        "createdDateTime": app_obj.get("createdDateTime"),
                        "signInAudience": app_obj.get("signInAudience"),
                        "replyUrls": sp.get("replyUrls") or [],
                        "web": app_obj.get("web"),
                        "spa": app_obj.get("spa"),
                        "publicClient": app_obj.get("publicClient"),
                        "requiredResourceAccess": app_obj.get("requiredResourceAccess"),
                        "passwordCredentials": app_obj.get("passwordCredentials") or [],
                        "keyCredentials": app_obj.get("keyCredentials") or [],
                        "federatedIdentityCredentials": app_obj.get("federatedIdentityCredentials") or [],
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
                    role_template_id = od.get("roleTemplateId")
                    
                    # Get tier information for the role
                    tier = get_role_tier(role_template_id) if role_template_id else None
                    tier_config = get_tier_config(tier) if tier else {}
                    tier_label = tier_config.get("label", "Unknown Tier") if tier else None
                    
                    role_props = {
                        "roleTemplateId": role_template_id,
                    }
                    
                    if tier:
                        role_props["tier"] = tier
                        role_props["tierLabel"] = tier_label
                    
                    self.add_node(onid, "Role", o_display, role_props)
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
                
                # Classify scopes and emit HAS_SCOPES edge with metadata
                classification = classify_scopes(scopes)
                edge_props = {
                    "scopes": sorted(scopes),
                    "permissionType": "delegated",
                    "scopeRiskClass": classification["classification"],
                    "scopeRiskWeight": classification["risk_weight"],
                    "resourceAppId": permission_details.get("resource_app_id"),
                    "resourceDisplayName": permission_details.get("resource_display_name"),
                }
                # Add detailed scope breakdowns for analysis
                if classification.get("readwrite_all"):
                    edge_props["readwriteAllScopes"] = sorted(classification["readwrite_all"])
                    edge_props["isAllWildcard"] = True
                if classification.get("action_privileged"):
                    edge_props["actionPrivilegedScopes"] = sorted(classification["action_privileged"])
                if classification.get("too_broad"):
                    edge_props["tooBroadScopes"] = sorted(classification["too_broad"])
                    edge_props["isAllWildcard"] = True
                if classification.get("write_privileged"):
                    edge_props["writePrivilegedScopes"] = sorted(classification["write_privileged"])
                
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
                
                # Get tier information for the role
                tier = get_role_tier(rd_id)
                tier_config = get_tier_config(tier) if tier else {}
                tier_label = tier_config.get("label", "Unknown Tier") if tier else None
                
                role_props = {
                    "roleTemplateId": rd_id,
                    "description": rd.get("description"),
                    "isBuiltIn": rd.get("isBuiltIn"),
                }
                
                if tier:
                    role_props["tier"] = tier
                    role_props["tierLabel"] = tier_label
                
                self.add_node(rnid, "Role", rd_display, role_props)
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

        # Add TenantPolicy node for external identity posture if collected
        if external_identity_posture.get('collectionAttempted'):
            tenant_policy_nid = "tenantpolicy:externalIdentityPosture"
            self.add_node(
                tenant_policy_nid,
                "TenantPolicy",
                "External Identity & Guest Posture",
                {
                    "policyType": "externalIdentityPosture",
                    "collectionAttempted": external_identity_posture.get('collectionAttempted'),
                    "skippedReason": external_identity_posture.get('skippedReason'),
                    "guestAccess": external_identity_posture.get('guestAccess'),
                    "crossTenantDefaultStance": external_identity_posture.get('crossTenantDefaultStance'),
                    "postureRating": external_identity_posture.get('postureRating'),
                    "error": external_identity_posture.get('error'),
                    # Store raw policies for transparency (but could be large)
                    "rawPolicies": external_identity_posture.get('rawPolicies', {}),
                }
            )
            print(f"  ✓ Added TenantPolicy node for external identity posture", file=sys.stderr)

        print(f"  ✓ Emitted {len(self.nodes)} nodes and {len(self.edges)} edges in {time.time() - stage_start:.2f}s", file=sys.stderr)

        export = {
            "format": {
                "name": "oidsee-graph",
                "version": "1.1"
            },
            "scanner": {
                "version": "1.0.0"
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
        
        overall_time = time.time() - overall_start
        print(f"\n✓ Collection completed in {overall_time:.2f}s total", file=sys.stderr)
        
        return export


# -----------------------------
# CLI
# -----------------------------

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="OID-See Graph Scanner (Graph-only)")
    p.add_argument("--tenant-id", required=True, help="Tenant ID (GUID) to authenticate against")
    p.add_argument("--auth-method", help="Authentication method to use", choices=["device-code", "interactive-browser", "azure-cli", "default", "client-secret"])
    p.add_argument("--device-code-client-id", help="Public client app id for device code auth (delegated)", default=AZURE_CLI_CLIENT_ID)
    p.add_argument("--interactive-browser-client-id", help="Public client app id for interactive browser auth (delegated)", default=AZURE_CLI_CLIENT_ID)
    p.add_argument("--client-id", help="Client id for client secret auth (defaults to Azure CLI client id)")
    p.add_argument("--client-secret", help="Client secret for client secret auth")
    p.add_argument("--out", default="oidsee-export.json", help="Output JSON file path")
    p.add_argument(
        "--output-format",
        default=OUTPUT_FORMAT_OIDSEE,
        choices=[OUTPUT_FORMAT_OIDSEE, OUTPUT_FORMAT_BLOODHOUND_OPENGRAPH],
        help="Output format (default: oidsee-graph)",
    )
    p.add_argument("--include-first-party", action="store_true", help="Include Microsoft-first-party apps (heuristic)")
    p.add_argument("--include-single-tenant", action="store_true", help="Include AzureADMyOrg signInAudience apps")
    p.add_argument("--include-all-sps", action="store_true", help="Include all service principals (overrides filters)")
    p.add_argument("--max-retries", type=int, default=6, help="Max HTTP retries for Graph requests (throttling/transient)")
    p.add_argument("--retry-base-delay", type=float, default=0.8, help="Base delay (seconds) for exponential backoff")
    
    # Enrichment options (enabled by default for performance)
    p.add_argument("--disable-all-enrichment", action="store_true", help="Disable all enrichment lookups (DNS, RDAP, IP WHOIS)")
    p.add_argument("--disable-dns-enrichment", action="store_true", help="Disable DNS lookups for reply URL domains")
    p.add_argument("--disable-rdap-enrichment", action="store_true", help="Disable RDAP lookups for reply URL domains")
    p.add_argument("--disable-ipwhois-enrichment", action="store_true", help="Disable IP WHOIS lookups for IP literals in reply URLs")
    
    # Report generation options
    p.add_argument("--generate-report", action="store_true", help="Generate an HTML report alongside the JSON export")
    
    return p.parse_args()


def main() -> int:
    args = parse_args()

    graph = GraphClient(args.tenant_id)
    # Configure HTTP retry/backoff behavior
    graph.max_retries = max(1, int(args.max_retries))
    graph.base_delay = max(0.1, float(args.retry_base_delay))
    # Determine authentication method
    if args.auth_method:
        if args.auth_method == "client-secret":
            if not args.client_secret:
                print("Error: --client-secret is required for client-secret authentication", file=sys.stderr)
                return 1
            cid = args.client_id or AZURE_CLI_CLIENT_ID
            graph.authenticate_client_secret(cid, args.client_secret)
        elif args.auth_method == "device-code":
            cid = args.device_code_client_id or AZURE_CLI_CLIENT_ID
            graph.authenticate_device_code(cid)
        elif args.auth_method == "interactive-browser":
            cid = args.interactive_browser_client_id or AZURE_CLI_CLIENT_ID
            graph.authenticate_interactive_browser(cid)
        elif args.auth_method == "azure-cli":
            graph.authenticate_azure_cli()
        elif args.auth_method == "default":
            cid = args.client_id or AZURE_CLI_CLIENT_ID
            graph.authenticate_default(cid)
    else:
        # Legacy behavior: client secret if available, else device code
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
        enable_dns_enrichment=not (args.disable_all_enrichment or args.disable_dns_enrichment),
        enable_rdap_enrichment=not (args.disable_all_enrichment or args.disable_rdap_enrichment),
        enable_ipwhois_enrichment=not (args.disable_all_enrichment or args.disable_ipwhois_enrichment),
    )

    try:
        collector = OidSeeCollector(graph, opts)
        export = collector.build()
    except Exception as e:
        print(f"\n✗ Error during collection: {type(e).__name__}: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1

    if args.output_format == OUTPUT_FORMAT_BLOODHOUND_OPENGRAPH:
        output_payload = convert_oidsee_export_to_bloodhound_opengraph(export)
    else:
        output_payload = export

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(output_payload, f, indent=2, sort_keys=False)

    print(
        f"✓ Wrote {args.out} ({len(export['nodes'])} nodes, {len(export['edges'])} edges, format={args.output_format})",
        file=sys.stderr,
    )
    
    # Generate HTML report if requested
    if args.generate_report:
        try:
            from report_generator import generate_html_report
            report_path = args.out.replace('.json', '-report.html')
            if report_path == args.out:
                report_path = args.out + '-report.html'
            generate_html_report(export, report_path)
            print(f"✓ Wrote HTML report: {report_path}", file=sys.stderr)
        except ImportError as e:
            print(f"✗ Cannot generate report: report_generator module not found. Error: {e}", file=sys.stderr)
            print("  Make sure report_generator.py is in the same directory as the scanner.", file=sys.stderr)
        except Exception as e:
            print(f"✗ Error generating report: {type(e).__name__}: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            # Don't fail the entire scanner if report generation fails
    
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

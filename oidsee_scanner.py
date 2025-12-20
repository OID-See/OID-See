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
import sys
import time
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

import requests
from azure.identity import ClientSecretCredential, DeviceCodeCredential


GRAPH_BETA = "https://graph.microsoft.com/beta"
GRAPH_V1 = "https://graph.microsoft.com/v1.0"
AZURE_CLI_CLIENT_ID = "04b07795-8ddb-461a-bbee-02f9e1bf7b46"


# -----------------------------
# Graph client
# -----------------------------

class GraphClient:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.credential = None
        self._token: Optional[str] = None
        self._token_expires: float = 0.0

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

    def get(self, url: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        r = requests.get(url, headers=self._headers(), params=params, timeout=60)
        if r.status_code >= 400:
            raise RuntimeError(f"Graph GET failed {r.status_code}: {r.text[:500]}")
        return r.json()

    def get_paged(self, url: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Follow @odata.nextLink and return aggregated 'value'."""
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


def node_id(kind: str, object_id: str) -> str:
    return f"{kind}:{object_id}"


def make_node(nid: str, ntype: str, props: Dict[str, Any]) -> Dict[str, Any]:
    return {"id": nid, "type": ntype, "properties": props}


def make_edge(src: str, dst: str, etype: str, props: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return {"source": src, "target": dst, "type": etype, "properties": props or {}}


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
            data = requests.post(
                f"{GRAPH_V1}/directoryObjects/getByIds",
                headers=self.graph._headers(),
                json=body,
                timeout=60,
            )
            if data.status_code >= 400:
                raise RuntimeError(f"Graph POST getByIds failed {data.status_code}: {data.text[:500]}")
            for obj in data.json().get("value", []):
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


def compute_risk_for_sp(
    sp: Dict[str, Any],
    delegated_scopes_by_resource: Dict[str, Set[str]],
    has_app_perms: bool,
) -> Dict[str, Any]:
    score = 0
    reasons: List[Dict[str, Any]] = []

    # Unverified publisher
    if not is_verified_publisher(sp.get("verifiedPublisher")):
        score += 25
        reasons.append({"code": "UNVERIFIED_PUBLISHER", "title": "Unverified publisher", "details": "Service principal has no verifiedPublisherId."})

    # Multi-tenant / MSA audiences
    aud = sp.get("signInAudience")
    if aud and aud != "AzureADMyOrg":
        score += 10
        reasons.append({"code": "MULTITENANT_AUDIENCE", "title": "Multi-tenant sign-in audience", "details": f"signInAudience={aud}"})

    # Secrets present (hidden SP secrets risk)
    if sp.get("passwordCredentials"):
        score += 20
        reasons.append({"code": "HAS_CLIENT_SECRETS", "title": "Client secrets present", "details": "passwordCredentials contains one or more entries."})
    if sp.get("keyCredentials"):
        score += 10
        reasons.append({"code": "HAS_CERT_CREDENTIALS", "title": "Certificate credentials present", "details": "keyCredentials contains one or more entries."})

    # Offline access -> persistence
    if any("offline_access" in scopes for scopes in delegated_scopes_by_resource.values()):
        score += 10
        reasons.append({"code": "OFFLINE_ACCESS", "title": "Refresh-token persistence", "details": "Delegated grants include offline_access."})

    # High risk scopes (delegated)
    risky = []
    for scopes in delegated_scopes_by_resource.values():
        for s in scopes:
            if s in HIGH_RISK_DELEGATED and s != "offline_access":
                risky.append(s)
    if risky:
        score += min(30, 5 * len(set(risky)))
        reasons.append({"code": "HIGH_RISK_SCOPES", "title": "High-risk delegated scopes", "details": ", ".join(sorted(set(risky)))})

    # App permissions present
    if has_app_perms:
        score += 15
        reasons.append({"code": "HAS_APP_PERMISSIONS", "title": "Application permissions granted", "details": "App role assignments exist (application permissions)."})

    # Cap 0..100
    score = max(0, min(100, score))
    level = "low"
    if score >= 70:
        level = "high"
    elif score >= 40:
        level = "medium"

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

    def add_node(self, nid: str, ntype: str, props: Dict[str, Any]) -> None:
        if nid not in self.nodes:
            self.nodes[nid] = make_node(nid, ntype, props)

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
                apps = self.graph.get_paged(f"{GRAPH_BETA}/applications?$filter=appId eq '{appid}'&$select=id,appId,displayName,createdDateTime,signInAudience,web,spa,publicClient,requiredResourceAccess")
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
        tenant = self.fetch_tenant()
        tenant_id = tenant.get("tenantId")
        if not tenant_id:
            raise RuntimeError("Could not determine tenantId from /organization")

        sps = self.list_service_principals()
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

        # best-effort application objects
        self.fetch_applications_for_sps(target_sps)

        # First pass: gather grants, assignments, owners, role assignments and collect referenced IDs
        sp_delegated_scopes: Dict[str, Dict[str, Set[str]]] = {}  # spId -> resourceId -> scopes set
        sp_has_app_perms: Dict[str, bool] = {}

        grants_by_sp: Dict[str, List[Dict[str, Any]]] = {}
        app_perms_by_sp: Dict[str, List[Dict[str, Any]]] = {}
        assigned_to_by_sp: Dict[str, List[Dict[str, Any]]] = {}
        owners_by_sp: Dict[str, List[Dict[str, Any]]] = {}
        dir_roles_by_sp: Dict[str, List[Dict[str, Any]]] = {}

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
            sp_has_app_perms[sp_id] = bool(app_perms)

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

        # Resolve referenced directory objects and resource SPs
        self.dir_cache.get_many(self._principal_ids_needed)
        self.ensure_resource_sps_loaded()
        self.fetch_role_definitions(self._role_def_ids_needed)

        # Second pass: emit nodes and edges
        for sp in target_sps:
            sp_id = sp["id"]
            sp_nid = node_id("sp", sp_id)

            # service principal node
            risk = compute_risk_for_sp(sp, sp_delegated_scopes.get(sp_id, {}), sp_has_app_perms.get(sp_id, False))
            props = {
                "objectId": sp_id,
                "appId": sp.get("appId"),
                "displayName": sp.get("displayName") or sp.get("appDisplayName"),
                "appDisplayName": sp.get("appDisplayName"),
                "publisherName": sp.get("publisherName"),
                "signInAudience": sp.get("signInAudience"),
                "appOwnerOrganizationId": sp.get("appOwnerOrganizationId"),
                "createdDateTime": sp.get("createdDateTime"),
                "replyUrls": sp.get("replyUrls") or [],
                "homepage": sp.get("homepage"),
                "logoutUrl": sp.get("logoutUrl"),
                "tags": sp.get("tags") or [],
                "appRoleAssignmentRequired": sp.get("appRoleAssignmentRequired"),
                "verifiedPublisher": sp.get("verifiedPublisher") or {"displayName": None, "verifiedPublisherId": None, "addedDateTime": None},
                "info": sp.get("info") or {},
                "keyCredentials": sp.get("keyCredentials") or [],
                "passwordCredentials": sp.get("passwordCredentials") or [],
                "risk": risk,
                "externalSignals": {
                    # Graph-only run: placeholders
                    "whois": None,
                    "etldPlusOne": None,
                    "dns": None,
                }
            }
            self.add_node(sp_nid, "SERVICE_PRINCIPAL", props)

            # Application node (best-effort)
            appid = sp.get("appId")
            if appid:
                app_obj = self.app_cache_by_appid.get(appid)
                app_nid = node_id("app", appid)
                self.add_node(app_nid, "APPLICATION", {
                    "appId": appid,
                    "displayName": (app_obj or {}).get("displayName") or sp.get("appDisplayName"),
                    "createdDateTime": (app_obj or {}).get("createdDateTime"),
                    "signInAudience": (app_obj or {}).get("signInAudience") or sp.get("signInAudience"),
                    "replyUrls": sp.get("replyUrls") or [],
                    "placeholders": {
                        "createdBy": None,
                        "lastModifiedDateTime": None,
                    }
                })
                self.add_edge(sp_nid, app_nid, "INSTANCE_OF", {})

            # Owners
            for o in owners_by_sp.get(sp_id, []):
                oid = o.get("id")
                if not oid:
                    continue
                od = self.dir_cache.get(oid) or {"id": oid, "displayName": o.get("displayName")}
                # node type based on @odata.type
                otype = (od.get("@odata.type") or "").lower()
                if "user" in otype:
                    onid = node_id("user", oid)
                    self.add_node(onid, "USER", {"objectId": oid, "displayName": od.get("displayName"), "userPrincipalName": od.get("userPrincipalName")})
                elif "group" in otype:
                    onid = node_id("group", oid)
                    self.add_node(onid, "GROUP", {"objectId": oid, "displayName": od.get("displayName")})
                elif "directoryrole" in otype:
                    onid = node_id("role", oid)
                    self.add_node(onid, "ROLE", {"objectId": oid, "displayName": od.get("displayName")})
                else:
                    onid = node_id("dir", oid)
                    self.add_node(onid, "RISK_SIGNAL", {"objectId": oid, "displayName": od.get("displayName"), "kind": "UNKNOWN_OWNER"})
                self.add_edge(onid, sp_nid, "OWNS", {})

            # Delegated scopes -> HAS_SCOPE edges to resource SP nodes
            for rid, scopes in sp_delegated_scopes.get(sp_id, {}).items():
                res_sp = self.sp_cache.get(rid, {"id": rid})
                res_nid = node_id("sp", rid)
                if res_nid not in self.nodes:
                    self.add_node(res_nid, "SERVICE_PRINCIPAL", {
                        "objectId": rid,
                        "appId": res_sp.get("appId"),
                        "displayName": res_sp.get("displayName") or res_sp.get("appDisplayName"),
                        "publisherName": res_sp.get("publisherName"),
                        "verifiedPublisher": res_sp.get("verifiedPublisher") or {"displayName": None, "verifiedPublisherId": None, "addedDateTime": None},
                        "risk": {"score": 0, "level": "low", "reasons": []},
                    })
                self.add_edge(sp_nid, res_nid, "HAS_SCOPE", {"scopes": sorted(scopes)})

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
                    res_nid = node_id("sp", rid)
                    if res_nid not in self.nodes:
                        self.add_node(res_nid, "SERVICE_PRINCIPAL", {
                            "objectId": rid,
                            "appId": res_sp.get("appId"),
                            "displayName": res_sp.get("displayName") or res_sp.get("appDisplayName"),
                            "publisherName": res_sp.get("publisherName"),
                            "verifiedPublisher": res_sp.get("verifiedPublisher") or {"displayName": None, "verifiedPublisherId": None, "addedDateTime": None},
                            "risk": {"score": 0, "level": "low", "reasons": []},
                        })
                    self.add_edge(sp_nid, res_nid, "HAS_APP_ROLE", {"appRoleIds": sorted(role_ids)})

                    # Create APP_ROLE nodes (optional, but helps visualisation)
                    # Attempt to resolve role displayName/value from resource SP appRoles list
                    app_roles = res_sp.get("appRoles") or []
                    roles_by_id = {r.get("id"): r for r in app_roles if r.get("id")}
                    for arid in role_ids:
                        r = roles_by_id.get(arid, {})
                        rnid = node_id("approle", arid)
                        self.add_node(rnid, "APP_ROLE", {
                            "objectId": arid,
                            "displayName": r.get("displayName"),
                            "value": r.get("value"),
                            "description": r.get("description"),
                            "resourceServicePrincipalId": rid,
                        })
                        self.add_edge(sp_nid, rnid, "HAS_APP_ROLE", {"resourceId": rid})

            # Assigned-to edges (who is assigned to this app)
            for a in assigned_to_by_sp.get(sp_id, []):
                pid = a.get("principalId")
                if not pid:
                    continue
                pobj = self.dir_cache.get(pid) or {"id": pid}
                otype = (pobj.get("@odata.type") or "").lower()
                if "user" in otype:
                    pnid = node_id("user", pid)
                    self.add_node(pnid, "USER", {"objectId": pid, "displayName": pobj.get("displayName"), "userPrincipalName": pobj.get("userPrincipalName")})
                elif "group" in otype:
                    pnid = node_id("group", pid)
                    self.add_node(pnid, "GROUP", {"objectId": pid, "displayName": pobj.get("displayName")})
                elif "serviceprincipal" in otype:
                    pnid = node_id("sp", pid)
                    # include minimal props; it might already exist
                    self.add_node(pnid, "SERVICE_PRINCIPAL", {"objectId": pid, "displayName": pobj.get("displayName"), "appId": pobj.get("appId"), "risk": {"score": 0, "level": "low", "reasons": []}})
                else:
                    pnid = node_id("dir", pid)
                    self.add_node(pnid, "RISK_SIGNAL", {"objectId": pid, "displayName": pobj.get("displayName"), "kind": "UNKNOWN_PRINCIPAL"})

                # ASSIGNED_TO edge direction: principal -> app
                self.add_edge(pnid, sp_nid, "ASSIGNED_TO", {"appRoleId": a.get("appRoleId")})

            # Directory roles assigned to the SP
            for ra in dir_roles_by_sp.get(sp_id, []):
                rd_id = ra.get("roleDefinitionId")
                if not rd_id:
                    continue
                rd = self._role_defs.get(rd_id, {"id": rd_id})
                rnid = node_id("roledef", rd_id)
                self.add_node(rnid, "ROLE", {
                    "objectId": rd_id,
                    "displayName": rd.get("displayName"),
                    "description": rd.get("description"),
                    "isBuiltIn": rd.get("isBuiltIn"),
                })
                self.add_edge(sp_nid, rnid, "HAS_ROLE", {"directoryScopeId": ra.get("directoryScopeId")})

        export = {
            "format": "oidsee-graph-export@1",
            "generatedAt": utc_now_iso(),
            "tenant": tenant,
            "collection": {
                "graphOnly": True,
                "placeholders": {
                    "whois": True,
                    "dns": True,
                    "etlDPlusOne": True,
                    "signInLogsCorrelation": True,
                }
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
    return p.parse_args()


def main() -> int:
    args = parse_args()

    graph = GraphClient(args.tenant_id)
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

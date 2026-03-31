# Release Notes - OID-See v1.1.1

## 🔐 Scanner Intelligence Release — April 14, 2026

OID-See v1.1.1 brings two scanner improvements that make permission risk classification more accurate and first-party app detection more reliable. Both changes are backward-compatible: existing scans require no changes, and the scanner gracefully falls back to pattern-matching or cached data when network resources are unavailable.

## What's Changed

### 📊 Microsoft Permissions Tiering (Issue [#56](https://github.com/OID-See/OID-See/issues/56))

> **Raised by [@Mynster9361](https://github.com/Mynster9361)**

**Problem**: Permission risk was previously assessed using name-pattern matching alone (e.g., does the scope contain `write`?). This missed cases where Microsoft's own privilege assessment differs from what the name implies, and didn't distinguish between levels of privilege within the same broad class.

**Solution**: The scanner now fetches Microsoft Graph's official [`permissions.json`](https://raw.githubusercontent.com/microsoftgraph/microsoft-graph-devx-content/refs/heads/master/permissions/new/permissions.json) at scan time. This file, maintained by the Microsoft Graph team and updated weekly, assigns a **privilege level (1–5)** to every Graph permission:

| Level | Meaning | Example permissions |
|-------|---------|-------------------|
| 5 | Near-admin (highest) | `RoleManagement.ReadWrite.Directory`, `Directory.ReadWrite.All` |
| 4 | Elevated write/read | `User.ReadWrite.All`, `Group.ReadWrite.All` |
| 3 | Moderate scope | `Mail.ReadWrite`, `Calendars.ReadWrite` |
| 2 | Standard read | `User.Read.All`, `Mail.Read` |
| 1 | Minimal (lowest) | `User.Read`, `openid`, `profile` |

**How it integrates**:

- **Scope classification** (`classify_scopes`): For each delegated scope, the MS privilege level is mapped to a risk class. The MS class is used when it represents a *higher* risk than pattern matching — pattern matching is never downgraded by MS data, only upgraded.
- **App role classification** (`classify_app_role_value`): For application permissions (app roles), the MS Application scheme privilege level is used to refine the weight when it would result in a higher weight than the pattern-based assessment.
- **New `HAS_HIGH_PRIVILEGE_PERMISSION` scoring contributor**: When any granted scope has MS privilege level ≥ 4, an additional contributor fires — weight 15 for level 4, weight 25 for level 5. This is additive to `HAS_PRIVILEGED_SCOPES` and represents official MS confirmation of elevated risk.
- **Metadata fields**: `classify_scopes()` now returns `max_privilege_level` (highest MS level seen) and `high_privilege_scopes` (list of scope names at that level) for use in export metadata.

**Graceful degradation**: If the remote fetch fails (network unavailable, rate limited, etc.), the scanner logs a warning and falls back entirely to pattern-matching. The original `HIGH_RISK_DELEGATED` static permission set has been repurposed as `HIGH_RISK_DELEGATED_FALLBACK` and is preserved as documented offline context.

**Performance**: Permissions data is fetched once per scan, indexed case-insensitively at fetch time, and cached in memory. Individual lookups are O(1).

**New `HAS_HIGH_PRIVILEGE_PERMISSION` contributor**:

```json
{
  "code": "HAS_HIGH_PRIVILEGE_PERMISSION",
  "weight": 15,
  "message": "Delegated scope confirmed at MS privilege level 4 (elevated)"
}
```

or

```json
{
  "code": "HAS_HIGH_PRIVILEGE_PERMISSION",
  "weight": 25,
  "message": "Delegated scope confirmed at MS privilege level 5 (near-admin)"
}
```

### 🏢 Expanded First-Party App Coverage (Issue [#57](https://github.com/OID-See/OID-See/issues/57))

> **Raised by [@Mynster9361](https://github.com/Mynster9361)**

**Problem**: First-party app detection relied solely on Merill Fernando's `microsoft-service-principals.json` list fetched at scan time. When the network was unavailable, any well-known Microsoft app not already identified via publisher/tenant checks could be misclassified as third-party.

**Solution**: `data/microsoft_first_party_apps_fallback.json` is now bundled with the scanner. It contains ~90 well-known Microsoft first-party app IDs sourced from Microsoft documentation, covering:

- Azure Portal, Azure CLI, Azure PowerShell
- Microsoft Graph, Graph Explorer
- Exchange Online, SharePoint Online, OneDrive
- Microsoft Teams, Microsoft Authenticator
- Microsoft Intune, Intune Company Portal
- Power BI, Power Apps, Power Automate (Flow)
- Azure DevOps (VSTS)
- Microsoft Defender, Defender for Cloud Apps
- Azure Key Vault, Azure Storage
- Dynamics 365
- Microsoft Whiteboard, Planner, Edge
- Office 365 Portal, Office Online
- Windows Azure Active Directory (legacy)

**How it integrates**:

- `_load_static_fallback_apps()` reads the bundled JSON using the scanner script's own path (no dependency on cwd).
- `_fetch_microsoft_apps_list()` seeds the lookup table with the fallback list before merging Merill's live data. **Merill data takes precedence** on AppId collision — Merill is actively maintained with richer metadata; the fallback is a static snapshot.
- Result: first-party detection works offline or when Merill's endpoint is unreachable, with no change in behavior when both sources are available.

## Upgrade Guide

### For Existing v1.1.0 Users

**No changes required.** Both features are fully additive:
- `HAS_HIGH_PRIVILEGE_PERMISSION` is a new contributor — existing exports don't include it, but new scans will.
- The first-party fallback silently improves coverage; no output format changes.

### For Local Deployments

```bash
git fetch origin
git checkout v1.1.1
pip install -r requirements.txt  # No new dependencies
```

### Breaking Changes

None.

## Technical Details

### MS Permissions.json Structure

```json
{
  "permissions": {
    "User.ReadWrite.All": {
      "schemes": {
        "DelegatedWork": { "privilegeLevel": 4 },
        "Application": { "privilegeLevel": 4 }
      }
    }
  }
}
```

### Scope Class Priority Order

The scanner now uses an explicit priority ladder for scope risk classes:

```
regular → too_broad → write_privileged → action_privileged → readwrite_all
```

MS privilege levels map to these classes:

| MS Level | Scope class | Notes |
|----------|-------------|-------|
| 5 | `readwrite_all` | Near-admin |
| 4 | `write_privileged` | Elevated write |
| 3 | `too_broad` | Moderate |
| 1–2 | `regular` | Low |

The MS-derived class only *replaces* the pattern-matched class when it would be a step *up* the priority ladder.

### First-Party Fallback File

`data/microsoft_first_party_apps_fallback.json` format:

```json
[
  {
    "AppId": "00000003-0000-0000-c000-000000000000",
    "AppDisplayName": "Microsoft Graph",
    "Source": "MSFT-docs"
  }
]
```

### New Tests

- `tests/test_permission_tiering.py` — 21 tests covering fetch/cache, lookup, scope override, app role refinement, graceful degradation
- `tests/test_firstparty_apps.py` — 15 tests covering fallback load, merge behavior, Merill precedence, offline ownership classification

## Known Limitations

### Graph Permissions Only

MS privilege levels are available for **Microsoft Graph permissions** only. Permissions for other resource APIs (e.g., Azure Service Management, Exchange Online legacy scopes) fall back to pattern-matching as before.

### Static Fallback Is a Snapshot

`microsoft_first_party_apps_fallback.json` was assembled from Microsoft documentation and will not automatically update. Merill's live list remains the primary source and overwrites the fallback on any AppId collision.

## Community & Support

- **Documentation**: `docs/` directory, `README.md`
- **Issues**: [GitHub Issues](https://github.com/OID-See/OID-See/issues)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

### Acknowledgements

- [@Mynster9361](https://github.com/Mynster9361) for raising both issues that drove this release — [#56](https://github.com/OID-See/OID-See/issues/56) (MS permissions tiering) and [#57](https://github.com/OID-See/OID-See/issues/57) (first-party app coverage) — including detailed research, links to the permissions.json source, and documentation references for the app IDs.

---

**Release Date**: April 14, 2026
**Version**: 1.1.1
**License**: Apache 2.0
**Repository**: https://github.com/OID-See/OID-See

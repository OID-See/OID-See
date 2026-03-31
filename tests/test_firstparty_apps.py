"""
Tests for expanded Microsoft first-party app coverage (issue #57).

Covers:
- _load_static_fallback_apps() reads the bundled JSON
- Fallback is merged into _fetch_microsoft_apps_list() when Merill is unreachable
- Merill data takes precedence over fallback on AppId collision
- Well-known MS portal apps (Azure Portal, Graph, Teams, etc.) are identified as 1st Party
  even when only the fallback list is available
"""

import json
import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest


def _reload_scanner():
    """Reset the scanner's module-level caches so each test starts clean."""
    import oidsee_scanner
    oidsee_scanner._MICROSOFT_APPS_CACHE = None
    oidsee_scanner._MSFT_PERMISSIONS_CACHE = None
    oidsee_scanner._MSFT_PERMISSIONS_INDEX = None
    return oidsee_scanner


# ---------------------------------------------------------------------------
# _load_static_fallback_apps
# ---------------------------------------------------------------------------

class TestLoadStaticFallbackApps:
    def test_returns_list_of_dicts(self):
        scanner = _reload_scanner()
        apps = scanner._load_static_fallback_apps()
        assert isinstance(apps, list)
        assert len(apps) > 0
        assert all(isinstance(a, dict) for a in apps)

    def test_every_entry_has_required_fields(self):
        scanner = _reload_scanner()
        apps = scanner._load_static_fallback_apps()
        for app in apps:
            assert "AppId" in app, f"Missing AppId: {app}"
            assert "AppDisplayName" in app, f"Missing AppDisplayName: {app}"

    def test_azure_portal_present(self):
        scanner = _reload_scanner()
        app_ids = {a["AppId"].lower() for a in scanner._load_static_fallback_apps()}
        # Azure Portal
        assert "c44b4083-3bb0-49c1-b47d-974e53cbdf3c" in app_ids

    def test_microsoft_graph_present(self):
        scanner = _reload_scanner()
        app_ids = {a["AppId"].lower() for a in scanner._load_static_fallback_apps()}
        assert "00000003-0000-0000-c000-000000000000" in app_ids

    def test_microsoft_teams_present(self):
        scanner = _reload_scanner()
        app_ids = {a["AppId"].lower() for a in scanner._load_static_fallback_apps()}
        assert "1fec8e78-bce4-4aaf-ab1b-5451cc387264" in app_ids

    def test_returns_empty_list_when_file_missing(self):
        scanner = _reload_scanner()
        with patch("oidsee_scanner.open", side_effect=FileNotFoundError("no file")):
            result = scanner._load_static_fallback_apps()
        assert result == []


# ---------------------------------------------------------------------------
# _fetch_microsoft_apps_list – fallback merge
# ---------------------------------------------------------------------------

class TestFetchMicrosoftAppsListWithFallback:
    def test_fallback_apps_present_when_merill_fetch_fails(self):
        scanner = _reload_scanner()
        with patch("oidsee_scanner.requests.get", side_effect=ConnectionError("offline")):
            apps = scanner._fetch_microsoft_apps_list()

        # Azure Portal from fallback
        assert "c44b4083-3bb0-49c1-b47d-974e53cbdf3c" in apps

    def test_fallback_apps_present_when_merill_succeeds(self):
        scanner = _reload_scanner()
        mock_resp = MagicMock()
        # Merill returns only one app
        mock_resp.json.return_value = [
            {"AppId": "aaaaaaaa-0000-0000-0000-000000000000", "AppDisplayName": "MerillApp"}
        ]
        mock_resp.raise_for_status.return_value = None

        with patch("oidsee_scanner.requests.get", return_value=mock_resp):
            apps = scanner._fetch_microsoft_apps_list()

        assert "aaaaaaaa-0000-0000-0000-000000000000" in apps
        # Fallback also merged
        assert "c44b4083-3bb0-49c1-b47d-974e53cbdf3c" in apps

    def test_merill_data_takes_precedence_on_collision(self):
        scanner = _reload_scanner()
        # Use Azure Portal AppId — present in fallback with "MSFT-docs" source
        azure_portal_id = "c44b4083-3bb0-49c1-b47d-974e53cbdf3c"
        merill_entry = {
            "AppId": azure_portal_id,
            "AppDisplayName": "Azure Portal (Merill)",
            "Source": "Merill",
        }
        mock_resp = MagicMock()
        mock_resp.json.return_value = [merill_entry]
        mock_resp.raise_for_status.return_value = None

        with patch("oidsee_scanner.requests.get", return_value=mock_resp):
            apps = scanner._fetch_microsoft_apps_list()

        # Merill wins
        assert apps[azure_portal_id]["AppDisplayName"] == "Azure Portal (Merill)"

    def test_result_is_cached_on_second_call(self):
        scanner = _reload_scanner()
        mock_resp = MagicMock()
        mock_resp.json.return_value = []
        mock_resp.raise_for_status.return_value = None

        with patch("oidsee_scanner.requests.get", return_value=mock_resp) as mock_get:
            scanner._fetch_microsoft_apps_list()
            scanner._fetch_microsoft_apps_list()

        assert mock_get.call_count == 1


# ---------------------------------------------------------------------------
# classify_app_ownership – first-party detection via fallback
# ---------------------------------------------------------------------------

class TestClassifyAppOwnershipWithFallback:
    def _offline_apps(self, scanner):
        """Return the apps dict as fetched in offline mode (fallback only)."""
        with patch("oidsee_scanner.requests.get", side_effect=ConnectionError("offline")):
            return scanner._fetch_microsoft_apps_list()

    def test_azure_portal_is_first_party_offline(self):
        scanner = _reload_scanner()
        self._offline_apps(scanner)
        ownership = scanner.classify_app_ownership(
            "c44b4083-3bb0-49c1-b47d-974e53cbdf3c",
            app_owner_org_id=None,
            has_app_object_in_tenant=False,
        )
        assert ownership == "1st Party"

    def test_unknown_app_is_third_party_offline(self):
        scanner = _reload_scanner()
        self._offline_apps(scanner)
        ownership = scanner.classify_app_ownership(
            "00000000-dead-beef-cafe-000000000000",
            app_owner_org_id=None,
            has_app_object_in_tenant=False,
        )
        assert ownership == "3rd Party"

    def test_microsoft_graph_is_first_party_offline(self):
        scanner = _reload_scanner()
        self._offline_apps(scanner)
        ownership = scanner.classify_app_ownership(
            "00000003-0000-0000-c000-000000000000",
            app_owner_org_id=None,
            has_app_object_in_tenant=False,
        )
        assert ownership == "1st Party"

    def test_microsoft_teams_is_first_party_offline(self):
        scanner = _reload_scanner()
        self._offline_apps(scanner)
        ownership = scanner.classify_app_ownership(
            "1fec8e78-bce4-4aaf-ab1b-5451cc387264",
            app_owner_org_id=None,
            has_app_object_in_tenant=False,
        )
        assert ownership == "1st Party"

    def test_internal_app_identified_correctly(self):
        scanner = _reload_scanner()
        self._offline_apps(scanner)
        ownership = scanner.classify_app_ownership(
            "bbbbbbbb-0000-0000-0000-000000000000",
            app_owner_org_id=None,
            has_app_object_in_tenant=True,
        )
        assert ownership == "Internal"

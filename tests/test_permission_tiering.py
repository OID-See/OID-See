"""
Tests for Microsoft permissions tiering integration (issue #56).

Covers:
- _fetch_microsoft_permissions() with mocked HTTP
- get_permission_privilege_level() for known permissions
- classify_scopes() privilege level override behaviour
- classify_app_role_value() MS-level refinement
- Graceful degradation when the remote fetch fails
"""

import types
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Helpers to reset scanner with a clean module-level cache
# ---------------------------------------------------------------------------

def _reload_scanner():
    """Reset the scanner's module-level caches so each test starts clean."""
    import oidsee_scanner
    oidsee_scanner._MICROSOFT_APPS_CACHE = None
    oidsee_scanner._MSFT_PERMISSIONS_CACHE = None
    oidsee_scanner._MSFT_PERMISSIONS_INDEX = None
    return oidsee_scanner


# ---------------------------------------------------------------------------
# Minimal mock permissions payload (structure mirrors the real file)
# ---------------------------------------------------------------------------

MOCK_PERMISSIONS = {
    "permissions": {
        "Directory.ReadWrite.All": {
            "authorizationType": "oAuth2",
            "schemes": {
                "DelegatedWork": {"privilegeLevel": 5, "requiresAdminConsent": True},
                "Application": {"privilegeLevel": 5, "requiresAdminConsent": True},
            },
        },
        "Mail.ReadWrite": {
            "authorizationType": "oAuth2",
            "schemes": {
                "DelegatedWork": {"privilegeLevel": 4, "requiresAdminConsent": False},
                "Application": {"privilegeLevel": 4, "requiresAdminConsent": True},
            },
        },
        "User.Read": {
            "authorizationType": "oAuth2",
            "schemes": {
                "DelegatedWork": {"privilegeLevel": 1, "requiresAdminConsent": False},
                "DelegatedPersonal": {"privilegeLevel": 1, "requiresAdminConsent": False},
            },
        },
        "Sites.ReadWrite.All": {
            "authorizationType": "oAuth2",
            "schemes": {
                "DelegatedWork": {"privilegeLevel": 3, "requiresAdminConsent": False},
                "Application": {"privilegeLevel": 5, "requiresAdminConsent": True},
            },
        },
    }
}


# ---------------------------------------------------------------------------
# _fetch_microsoft_permissions
# ---------------------------------------------------------------------------

class TestFetchMicrosoftPermissions:
    def test_returns_permissions_dict_on_success(self):
        scanner = _reload_scanner()
        mock_resp = MagicMock()
        mock_resp.json.return_value = MOCK_PERMISSIONS
        mock_resp.raise_for_status.return_value = None

        with patch("oidsee_scanner.requests.get", return_value=mock_resp):
            result = scanner._fetch_microsoft_permissions()

        assert "Directory.ReadWrite.All" in result
        assert "Mail.ReadWrite" in result

    def test_caches_result_on_second_call(self):
        scanner = _reload_scanner()
        mock_resp = MagicMock()
        mock_resp.json.return_value = MOCK_PERMISSIONS
        mock_resp.raise_for_status.return_value = None

        with patch("oidsee_scanner.requests.get", return_value=mock_resp) as mock_get:
            scanner._fetch_microsoft_permissions()
            scanner._fetch_microsoft_permissions()

        assert mock_get.call_count == 1, "Second call should use the cache"

    def test_returns_empty_dict_on_network_failure(self):
        scanner = _reload_scanner()

        with patch("oidsee_scanner.requests.get", side_effect=Exception("timeout")):
            result = scanner._fetch_microsoft_permissions()

        assert result == {}

    def test_returns_empty_dict_on_bad_json(self):
        scanner = _reload_scanner()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"not_permissions": {}}
        mock_resp.raise_for_status.return_value = None

        with patch("oidsee_scanner.requests.get", return_value=mock_resp):
            result = scanner._fetch_microsoft_permissions()

        assert result == {}


# ---------------------------------------------------------------------------
# get_permission_privilege_level
# ---------------------------------------------------------------------------

class TestGetPermissionPrivilegeLevel:
    def _setup(self, scanner):
        """Inject mock data directly into the module cache."""
        scanner._MSFT_PERMISSIONS_CACHE = MOCK_PERMISSIONS["permissions"]
        scanner._MSFT_PERMISSIONS_INDEX = {
            k.lower(): k for k in MOCK_PERMISSIONS["permissions"]
        }

    def test_returns_level_for_known_permission(self):
        scanner = _reload_scanner()
        self._setup(scanner)
        level = scanner.get_permission_privilege_level("Directory.ReadWrite.All", "DelegatedWork")
        assert level == 5

    def test_returns_level_for_application_scheme(self):
        scanner = _reload_scanner()
        self._setup(scanner)
        level = scanner.get_permission_privilege_level("Directory.ReadWrite.All", "Application")
        assert level == 5

    def test_returns_none_for_unknown_permission(self):
        scanner = _reload_scanner()
        self._setup(scanner)
        level = scanner.get_permission_privilege_level("NotExist.Permission", "DelegatedWork")
        assert level is None

    def test_returns_none_when_scheme_absent(self):
        scanner = _reload_scanner()
        self._setup(scanner)
        # User.Read has no Application scheme
        level = scanner.get_permission_privilege_level("User.Read", "Application")
        assert level is None

    def test_case_insensitive_lookup(self):
        scanner = _reload_scanner()
        self._setup(scanner)
        level = scanner.get_permission_privilege_level("mail.readwrite", "DelegatedWork")
        assert level == 4

    def test_returns_none_when_cache_empty(self):
        scanner = _reload_scanner()
        scanner._MSFT_PERMISSIONS_CACHE = {}
        scanner._MSFT_PERMISSIONS_INDEX = {}
        level = scanner.get_permission_privilege_level("Directory.ReadWrite.All", "DelegatedWork")
        assert level is None


# ---------------------------------------------------------------------------
# classify_scopes – MS privilege level override
# ---------------------------------------------------------------------------

class TestClassifyScopesWithPrivilegeLevels:
    def _patch_and_run(self, scanner, scopes, privilege_map):
        """
        Run classify_scopes with get_permission_privilege_level mocked according to
        privilege_map: { (scope, scheme) -> level }.
        """
        def mock_level(name, scheme="DelegatedWork"):
            return privilege_map.get((name, scheme))

        with patch.object(scanner, "get_permission_privilege_level", side_effect=mock_level):
            return scanner.classify_scopes(set(scopes))

    def test_level5_scope_promoted_to_readwrite_all(self):
        scanner = _reload_scanner()
        # "ObscureScope" wouldn't match any pattern but MS rates it level 5
        result = self._patch_and_run(
            scanner,
            ["ObscureScope"],
            {("ObscureScope", "DelegatedWork"): 5},
        )
        assert result["classification"] == "readwrite_all"
        assert result["max_privilege_level"] == 5

    def test_level4_scope_promoted_to_write_privileged(self):
        scanner = _reload_scanner()
        result = self._patch_and_run(
            scanner,
            ["SomeRead.All"],   # pattern → too_broad, but MS says level 4
            {("SomeRead.All", "DelegatedWork"): 4},
        )
        assert result["classification"] == "write_privileged"

    def test_pattern_takes_precedence_when_higher(self):
        scanner = _reload_scanner()
        # "Something.ReadWrite.All" is already readwrite_all by pattern; MS says level 3
        result = self._patch_and_run(
            scanner,
            ["Something.ReadWrite.All"],
            {("Something.ReadWrite.All", "DelegatedWork"): 3},
        )
        assert result["classification"] == "readwrite_all"

    def test_high_privilege_scopes_populated(self):
        scanner = _reload_scanner()
        result = self._patch_and_run(
            scanner,
            ["ScopeA", "ScopeB"],
            {
                ("ScopeA", "DelegatedWork"): 5,
                ("ScopeB", "DelegatedWork"): 2,
            },
        )
        high = result["high_privilege_scopes"]
        assert len(high) == 1
        assert high[0]["scope"] == "ScopeA"
        assert high[0]["privilegeLevel"] == 5

    def test_no_ms_data_falls_back_to_patterns(self):
        scanner = _reload_scanner()
        # No MS data available
        with patch.object(scanner, "get_permission_privilege_level", return_value=None):
            result = scanner.classify_scopes({"Mail.ReadWrite", "User.Read"})
        assert result["classification"] == "write_privileged"
        assert result["max_privilege_level"] is None

    def test_max_privilege_level_tracks_highest_across_scopes(self):
        scanner = _reload_scanner()
        result = self._patch_and_run(
            scanner,
            ["ScopeA", "ScopeB", "ScopeC"],
            {
                ("ScopeA", "DelegatedWork"): 2,
                ("ScopeB", "DelegatedWork"): 5,
                ("ScopeC", "DelegatedWork"): 3,
            },
        )
        assert result["max_privilege_level"] == 5


# ---------------------------------------------------------------------------
# classify_app_role_value – MS Application level refinement
# ---------------------------------------------------------------------------

class TestClassifyAppRoleValueWithPrivilegeLevels:
    def test_ms_level5_yields_readwrite_all_weight(self):
        scanner = _reload_scanner()
        with patch.object(scanner, "get_permission_privilege_level", return_value=5):
            weight = scanner.classify_app_role_value("SomeObscureRole")
        # readwrite_all weight from config is 60
        assert weight == 60

    def test_ms_level1_does_not_lower_high_pattern_weight(self):
        scanner = _reload_scanner()
        # Pattern matches readwrite.all → weight 60; MS says level 1 → weight 35
        # Should keep the higher pattern weight
        with patch.object(scanner, "get_permission_privilege_level", return_value=1):
            weight = scanner.classify_app_role_value("Something.ReadWrite.All")
        assert weight == 60

    def test_no_ms_data_uses_pattern_weight(self):
        scanner = _reload_scanner()
        with patch.object(scanner, "get_permission_privilege_level", return_value=None):
            weight = scanner.classify_app_role_value("Something.ReadWrite.All")
        assert weight == 60


# ---------------------------------------------------------------------------
# Graceful degradation (remote fetch fails, scoring still works)
# ---------------------------------------------------------------------------

class TestGracefulDegradation:
    def test_classify_scopes_works_without_ms_data(self):
        scanner = _reload_scanner()
        with patch("oidsee_scanner.requests.get", side_effect=ConnectionError("offline")):
            result = scanner.classify_scopes({"Directory.ReadWrite.All", "User.Read"})
        # Pattern matching still fires
        assert result["classification"] == "readwrite_all"
        assert result["max_privilege_level"] is None

    def test_classify_app_role_works_without_ms_data(self):
        scanner = _reload_scanner()
        with patch("oidsee_scanner.requests.get", side_effect=ConnectionError("offline")):
            weight = scanner.classify_app_role_value("Something.ReadWrite.All")
        assert weight == 60  # pattern-matched readwrite_all weight

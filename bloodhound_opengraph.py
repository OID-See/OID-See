#!/usr/bin/env python3
"""Helpers to convert OID-See exports to BloodHound OpenGraph format."""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

BLOODHOUND_OPEN_GRAPH_SCHEMA_URL = "https://bloodhound.specterops.io/schema/v8"


def _is_primitive(value: Any) -> bool:
    return isinstance(value, (str, int, float, bool))


def _homogeneous_primitive_array(values: List[Any]) -> bool:
    if not values:
        return True
    if not all(_is_primitive(v) for v in values):
        return False
    first = values[0]
    if isinstance(first, bool):
        return all(isinstance(v, bool) for v in values)
    if isinstance(first, (int, float)) and not isinstance(first, bool):
        return all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in values)
    return all(isinstance(v, type(first)) for v in values)


def _sanitize_property_value(value: Any) -> Optional[Any]:
    if value is None:
        return None
    if _is_primitive(value):
        return value
    if isinstance(value, list):
        if _homogeneous_primitive_array(value):
            return value
        return json.dumps(value, sort_keys=True, default=str)
    if isinstance(value, dict):
        return json.dumps(value, sort_keys=True, default=str)
    return str(value)


def sanitize_properties(properties: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    cleaned: Dict[str, Any] = {}
    for raw_key, raw_value in properties.items():
        if raw_value is None:
            continue
        key = str(raw_key).strip().lower() or "property"
        value = _sanitize_property_value(raw_value)
        if value is None:
            continue

        final_key = key
        idx = 2
        while final_key in cleaned:
            final_key = f"{key}_{idx}"
            idx += 1
        cleaned[final_key] = value
    return cleaned or None


def _sanitize_kind(value: str, default: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_]", "_", value or "")
    return cleaned or default


def convert_oidsee_to_bloodhound_opengraph(
    oidsee_export: Dict[str, Any], source_kind: str = "OIDSee"
) -> Dict[str, Any]:
    nodes = oidsee_export.get("nodes", []) if isinstance(oidsee_export, dict) else []
    edges = oidsee_export.get("edges", []) if isinstance(oidsee_export, dict) else []

    opengraph_nodes: List[Dict[str, Any]] = []
    for node in nodes:
        if not isinstance(node, dict):
            continue
        node_id = str(node.get("id") or "").strip()
        if not node_id:
            continue

        node_type = str(node.get("type") or "OIDSeeNode")
        display_name = str(node.get("displayName") or node_id)
        raw_props = node.get("properties")
        props: Dict[str, Any] = raw_props.copy() if isinstance(raw_props, dict) else {}
        if raw_props is not None and not isinstance(raw_props, dict):
            props["oidsee_properties_raw"] = raw_props

        props.setdefault("displayname", display_name)
        props.setdefault("oidsee_node_id", node_id)
        props.setdefault("oidsee_node_type", node_type)

        risk = node.get("risk")
        if isinstance(risk, dict):
            if "score" in risk:
                props.setdefault("risk_score", risk.get("score"))
            if "level" in risk:
                props.setdefault("risk_level", risk.get("level"))
            props.setdefault("risk", risk)
        elif risk is not None:
            props.setdefault("risk", risk)

        cleaned_props = sanitize_properties(props)
        out_node = {"id": node_id, "kinds": [_sanitize_kind(node_type, "OIDSeeNode")]}
        if cleaned_props is not None:
            out_node["properties"] = cleaned_props
        opengraph_nodes.append(out_node)

    opengraph_edges: List[Dict[str, Any]] = []
    for edge in edges:
        if not isinstance(edge, dict):
            continue
        src = str(edge.get("from") or "").strip()
        dst = str(edge.get("to") or "").strip()
        if not src or not dst:
            continue

        edge_type = str(edge.get("type") or "RelatesTo")
        raw_props = edge.get("properties")
        props: Dict[str, Any] = raw_props.copy() if isinstance(raw_props, dict) else {}
        if raw_props is not None and not isinstance(raw_props, dict):
            props["oidsee_properties_raw"] = raw_props

        props.setdefault("oidsee_edge_id", edge.get("id"))
        props.setdefault("oidsee_edge_type", edge_type)
        cleaned_props = sanitize_properties(props)

        out_edge = {
            "start": {"match_by": "id", "value": src},
            "end": {"match_by": "id", "value": dst},
            "kind": _sanitize_kind(edge_type, "RelatesTo"),
        }
        if cleaned_props is not None:
            out_edge["properties"] = cleaned_props
        opengraph_edges.append(out_edge)

    return {
        "$schema": BLOODHOUND_OPEN_GRAPH_SCHEMA_URL,
        "metadata": {"source_kind": source_kind},
        "graph": {"nodes": opengraph_nodes, "edges": opengraph_edges},
    }

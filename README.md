
# OID-See

A public, static web app that renders an interactive graph (via `vis-network`) from a JSON export — processed **entirely in your browser**.

## Primary schema: OID-See Graph Export v1.x
This repo includes the full JSON Schema at:

- `schemas/oidsee-graph-export.schema.json`

### Features
- **Interactive Graph Visualization**: Explore relationships between service principals, applications, users, and permissions
- **Risk Scoring**: Automatic risk assessment based on permissions, exposure, and governance
- **Security Heuristics**: Including the new `MIXED_REPLYURL_DOMAINS` heuristic for detecting attribution ambiguities and identity laundering signals
- **Advanced Filtering**: Filter nodes and edges using a powerful query syntax
- **Multiple Lenses**: View full graph, risk-focused, or structural relationships

### Minimal example
```json
{
  "format": { "name": "oidsee-graph", "version": "1.0" },
  "generatedAt": "2025-01-01T00:00:00Z",
  "tenant": { "tenantId": "00000000-0000-0000-0000-000000000000" },
  "nodes": [{ "id": "n1", "type": "User", "displayName": "Alice", "properties": {} }],
  "edges": []
}
```

## Development
```bash
npm install
npm run dev
```

## Deploy to Netlify
1. Push to GitHub
2. Netlify → **New site from Git**
3. `netlify.toml` handles build + publish


## Filtering (property query)

Use the filter box above the graph. Clauses are space-separated.

Prefix clauses with:
- `n.` for node
- `e.` for edge

Operators:
- `=` equals, `!=` not equals
- `~` contains, `!~` not contains
- `> >= < <=` numeric comparisons
- `?` exists (or just a bare path)

Examples:
- `n.type=User`
- `e.type!=INSTANCE_OF`
- `e.properties.scopes~offline_access`
- `n.risk.score>=70`
- `n.properties.appId?`
- `n.displayName~"Contoso Portal"`

Clauses evaluate against your raw export objects (node/edge), so you can filter on any property you emit.


## Lenses

Use the lens switch above the graph:

- **Full**: show everything
- **Risk**: privilege/abuse edges only (e.g. HAS_SCOPE, HAS_ROLE, derived paths)
- **Structure**: structural edges only (e.g. INSTANCE_OF, MEMBER_OF, OWNS)

## Path-aware filtering

When enabled, if a *derived* edge matches your filter (e.g. EFFECTIVE_IMPERSONATION_PATH),
OID-See will also include the underlying `derived.inputs` edges so the path remains explainable.

## Saved queries

Save/load/delete filter queries locally (stored in `localStorage`).

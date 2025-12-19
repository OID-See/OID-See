
# OID-See

A public, static web app that renders an interactive graph (via `vis-network`) from a JSON export — processed **entirely in your browser**.

## Primary schema: OID-See Graph Export v1.x
This repo includes the full JSON Schema at:

- `schemas/oidsee-graph-export.schema.json`

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

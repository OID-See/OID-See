# Microsoft Graph API Query Tool

A Python script for querying the Microsoft Graph beta endpoint to retrieve and filter service principals.

## Features

- **Dual Authentication Support**:
  - Client Secret (Service Principal/Application authentication)
  - Device Code Flow (Delegated/User authentication)

- **Service Principal Filtering**:
  - Excludes Microsoft first-party service principals
  - Excludes service principals owned by the connected tenant
  - Returns third-party applications

- **Output**:
  - Detailed JSON export with filtering metadata
  - Console summary statistics
  - Optional detailed listing of third-party apps

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Client Secret Authentication

```bash
python query_graph_api.py \
  --tenant-id <TENANT_ID> \
  --auth-method client-secret \
  --client-id <CLIENT_ID> \
  --client-secret <CLIENT_SECRET> \
  --output results.json
```

### Device Code Flow Authentication

```bash
python query_graph_api.py \
  --tenant-id <TENANT_ID> \
  --auth-method device-code \
  --output results.json
```

The script will prompt you to visit a URL and enter a device code.

## Options

- `--tenant-id` (required): Azure AD tenant ID
- `--auth-method` (required): `client-secret` or `device-code`
- `--client-id`: Required for client-secret auth
- `--client-secret`: Required for client-secret auth
- `--output`: Output JSON file path (default: `graph_query_results.json`)
- `--show-details`: Print detailed third-party service principal list to console

## Output Format

The JSON output includes:

```json
{
  "third_party": [
    {
      "id": "...",
      "displayName": "...",
      "appId": "...",
      "appOwnerOrganizationId": "...",
      "createdDateTime": "...",
      "publisherName": "...",
      "verifiedPublisher": true/false
    }
  ],
  "microsoft_first_party": [...],
  "tenant_owned": [...],
  "summary": {
    "total": 0,
    "third_party_count": 0,
    "microsoft_first_party_count": 0,
    "tenant_owned_count": 0
  },
  "metadata": {
    "generatedAt": "...",
    "tenantId": "...",
    "filterCriteria": {...}
  }
}
```

## Required Permissions

### For Client Secret Auth:
- Application permission: `Application.Read.All`

### For Device Code Flow:
- Delegated permission: `Application.Read.All` or `Directory.Read.All`

## Example

```bash
python query_graph_api.py \
  --tenant-id 00000000-0000-0000-0000-000000000000 \
  --auth-method device-code \
  --show-details \
  --output /tmp/service_principals.json
```

This will:
1. Prompt you to authenticate via device code
2. Retrieve all service principals
3. Filter out Microsoft first-party and tenant-owned apps
4. Print third-party apps to console
5. Export full results to `/tmp/service_principals.json`

## Notes

- The script uses the Microsoft Graph beta endpoint
- Pagination is handled automatically
- Microsoft first-party app IDs are predefined
- Results are filtered based on `appOwnerOrganizationId` matching tenant ID

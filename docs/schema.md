# OID-See Export Schema Documentation

## Overview

The OID-See export schema defines the structure of JSON files that contain Microsoft Entra ID (Azure AD) tenant data for visualization in the OID-See web application. This schema provides a standardized format for representing applications, service principals, users, groups, permissions, and their relationships as a graph.

**Schema Location**: `schemas/oidsee-graph-export.schema.json`

**Current Version**: 1.x (vNext)

## Schema Structure

```mermaid
graph TD
    A[OID-See Export] --> B[Format Metadata]
    A --> C[Tenant Information]
    A --> D[Collection Details]
    A --> E[Nodes Array]
    A --> F[Edges Array]
    
    B --> B1[name: oidsee-graph]
    B --> B2[version: 1.x]
    
    C --> C1[tenantId]
    C --> C2[displayName]
    C --> C3[region/cloud]
    
    D --> D1[Tool Info]
    D --> D2[Run ID]
    D --> D3[Graph API Details]
    
    E --> E1[ServicePrincipal]
    E --> E2[Application]
    E --> E3[User]
    E --> E4[Group]
    E --> E5[Role]
    E --> E6[ResourceApi]
    
    F --> F1[Structural Edges]
    F --> F2[Permission Edges]
    F --> F3[Assignment Edges]
```

## Top-Level Structure

```json
{
  "format": {
    "name": "oidsee-graph",
    "version": "1.0"
  },
  "generatedAt": "2024-12-26T00:00:00Z",
  "tenant": {
    "tenantId": "00000000-0000-0000-0000-000000000000",
    "displayName": "Contoso Corporation",
    "region": "US",
    "cloud": "Public"
  },
  "collection": {
    "tool": {
      "name": "oidsee_scanner.py",
      "version": "1.0.0",
      "build": "20241226"
    },
    "runId": "scan-20241226-123456",
    "graphApi": {
      "baseUrl": "https://graph.microsoft.com",
      "apiVersion": "v1.0"
    }
  },
  "nodes": [...],
  "edges": [...]
}
```

### Required Fields

- **format**: Schema identifier
  - `name`: Must be `"oidsee-graph"`
  - `version`: Version string matching pattern `^1\.(0|[1-9]\d*)(\.[0-9]+)?$`

- **generatedAt**: ISO 8601 timestamp of export generation

- **tenant**: Tenant identification
  - `tenantId`: GUID in format `^[0-9a-fA-F-]{36}$`

- **nodes**: Array of node objects

- **edges**: Array of edge objects

### Optional Fields

- **tenant.displayName**: Human-readable tenant name
- **tenant.region**: Tenant region (e.g., "US", "EU", "APAC")
- **tenant.cloud**: Cloud environment (Public, GCC, GCCHigh, DoD, China, Germany)
- **collection**: Metadata about the data collection process

## Node Types

```mermaid
classDiagram
    class Node {
        +string id
        +string type
        +string displayName
        +object properties
        +object risk
    }
    
    class ServicePrincipal {
        +string appId
        +string publisherName
        +array replyUrls
        +object credentialInsights
        +object replyUrlAnalysis
        +object trustSignals
    }
    
    class Application {
        +string appId
        +array passwordCredentials
        +array keyCredentials
    }
    
    class User {
        +string userPrincipalName
        +string mail
    }
    
    class Group {
        +string mailEnabled
        +string securityEnabled
    }
    
    class Role {
        +string roleTemplateId
        +string description
    }
    
    class ResourceApi {
        +string appId
        +array oauth2Permissions
        +array appRoles
    }
    
    Node <|-- ServicePrincipal
    Node <|-- Application
    Node <|-- User
    Node <|-- Group
    Node <|-- Role
    Node <|-- ResourceApi
```

### Base Node Structure

All nodes share common properties:

```json
{
  "id": "unique-node-identifier",
  "type": "ServicePrincipal",
  "displayName": "Human-readable name",
  "properties": {
    // Type-specific properties
  },
  "risk": {
    "score": 75,
    "level": "high",
    "reasons": [...]
  }
}
```

### ServicePrincipal Node

Represents enterprise applications and service principals.

```json
{
  "id": "sp-12345",
  "type": "ServicePrincipal",
  "displayName": "Contoso HR Portal",
  "properties": {
    "appId": "00000000-0000-0000-0000-000000000000",
    "servicePrincipalId": "11111111-1111-1111-1111-111111111111",
    "publisherName": "Contoso Ltd",
    "verifiedPublisher": {
      "displayName": "Contoso Ltd",
      "verifiedPublisherId": "12345",
      "addedDateTime": "2023-01-01T00:00:00Z"
    },
    "signInAudience": "AzureADMultipleOrgs",
    "homepage": "https://hr.contoso.com",
    "replyUrls": [
      "https://hr.contoso.com/callback"
    ],
    "appOwnerOrganizationId": "22222222-2222-2222-2222-222222222222",
    "appRoleAssignmentRequired": true,
    "preferredSingleSignOnMode": "saml",
    "tags": ["WindowsAzureActiveDirectoryIntegratedApp"],
    "info": {
      "marketingUrl": "https://contoso.com",
      "privacyStatementUrl": "https://contoso.com/privacy",
      "termsOfServiceUrl": "https://contoso.com/terms"
    },
    "createdDateTime": "2023-01-01T00:00:00Z",
    
    // Enhanced analysis results
    "credentialInsights": {
      "total_password_credentials": 1,
      "active_password_credentials": 1,
      "expired_password_credentials": 0,
      "total_key_credentials": 1,
      "active_key_credentials": 1,
      "expired_key_credentials": 0,
      "long_lived_secrets": [],
      "expired_but_present": [],
      "certificate_rollover_issues": [],
      "multiple_active_secrets": false
    },
    "replyUrlAnalysis": {
      "total_urls": 1,
      "normalized_domains": ["contoso.com"],
      "non_https_urls": [],
      "ip_literal_urls": [],
      "localhost_urls": [],
      "punycode_urls": [],
      "wildcard_urls": [],
      "schemes": ["https"]
    },
    "trustSignals": {
      "identityLaunderingSuspected": false,
      "mixedReplyUrlDomains": false,
      "nonAlignedDomains": []
    },
    "publicClientIndicators": {
      "hasPublicClientFlows": false,
      "hasImplicitFlow": false,
      "hasImplicitAccessTokenIssuance": false,
      "hasImplicitIdTokenIssuance": false,
      "hasSpaRedirectUris": false
    },
    "replyUrlEnrichment": null,
    "replyUrlProvenance": null,
    "domainWhois": null,
    "dnsRecords": null
  },
  "risk": {
    "score": 35,
    "level": "low",
    "reasons": [
      {
        "code": "HAS_SCOPES",
        "weight": 0,
        "message": "Regular delegated scopes granted"
      },
      {
        "code": "ASSIGNED_TO",
        "weight": 15,
        "message": "Assigned to 25 users"
      }
    ]
  }
}
```

**Key Properties**:

**Microsoft Graph Fields** (always present):
- **appId**: Application ID (globally unique across Azure AD) - from Microsoft Graph
- **servicePrincipalId**: Service principal object ID (tenant-specific) - from Microsoft Graph
- **publisherName**: Self-declared publisher name - from Microsoft Graph
- **verifiedPublisher**: Microsoft-verified publisher information (if verified) - from Microsoft Graph
- **signInAudience**: Audience type - from Microsoft Graph
  - `AzureADMyOrg`: Single-tenant
  - `AzureADMultipleOrgs`: Multi-tenant
  - `AzureADandPersonalMicrosoftAccount`: Multi-tenant + personal accounts
- **replyUrls**: OAuth2 redirect URIs - from Microsoft Graph

**Scanner Analysis Fields** (computed from Graph data):
- **credentialInsights**: Analysis of credentials (secrets, certificates) - computed by scanner
- **replyUrlAnalysis**: Security analysis of redirect URIs - computed by scanner
- **trustSignals**: Identity laundering and attribution signals - computed by scanner
- **publicClientIndicators**: Public client and implicit flow detection - computed by scanner

**Enrichment Fields** (enabled by default, can be disabled):
- **replyUrlEnrichment**: Summary of DNS/RDAP/IP WHOIS lookups (null when enrichment disabled via `--disable-all-enrichment` or when no enrichable URLs exist)
  - When present, includes:
    - `domains_analyzed`: List of eTLD+1 domains queried
    - `same_organization_likely`: Boolean indicating if domains appear to belong to same org
    - `enrichment_timestamp`: ISO 8601 timestamp of enrichment
    - `enrichment_enabled`: Object showing which enrichment methods were enabled
- **replyUrlProvenance**: Enrichment metadata (currently always includes source: "microsoft_graph")
- **domainWhois**: Reserved for future use (currently null)
- **dnsRecords**: Reserved for future use (currently null)

**Field Nullability**:
- Fields from Microsoft Graph may be null if not provided by the API
- `credentialInsights`, `replyUrlAnalysis`, `trustSignals`, `publicClientIndicators` are always present (never null)
- `replyUrlEnrichment` is null when enrichment is disabled or when there are no enrichable reply URLs
- `verifiedPublisher` is null when the publisher is not verified

### Application Node

Represents app registrations in the tenant.

```json
{
  "id": "app-67890",
  "type": "Application",
  "displayName": "Contoso HR Portal Registration",
  "properties": {
    "appId": "00000000-0000-0000-0000-000000000000",
    "applicationId": "33333333-3333-3333-3333-333333333333",
    "passwordCredentials": [
      {
        "keyId": "44444444-4444-4444-4444-444444444444",
        "displayName": "Production Secret",
        "startDateTime": "2024-01-01T00:00:00Z",
        "endDateTime": "2024-12-31T23:59:59Z"
      }
    ],
    "keyCredentials": [
      {
        "keyId": "55555555-5555-5555-5555-555555555555",
        "type": "AsymmetricX509Cert",
        "usage": "Verify",
        "displayName": "Production Certificate",
        "startDateTime": "2024-01-01T00:00:00Z",
        "endDateTime": "2025-12-31T23:59:59Z"
      }
    ],
    "federatedIdentityCredentials": []
  }
}
```

**Key Properties**:
- **appId**: Application ID (matches ServicePrincipal appId) - from Microsoft Graph
- **applicationId**: Application object ID - from Microsoft Graph
- **passwordCredentials**: Client secrets with validity periods - from Microsoft Graph
- **keyCredentials**: X.509 certificates for authentication - from Microsoft Graph
- **federatedIdentityCredentials**: Workload identity federation configurations - from Microsoft Graph

## Analysis Field Details

### credentialInsights Structure

Computed analysis of application credentials (from Microsoft Graph data):

```json
{
  "total_password_credentials": 2,
  "active_password_credentials": 1,
  "expired_password_credentials": 1,
  "total_key_credentials": 1,
  "active_key_credentials": 1,
  "expired_key_credentials": 0,
  "long_lived_secrets": ["keyId-of-secret-1"],
  "expired_but_present": ["keyId-of-expired-secret"],
  "certificate_rollover_issues": [],
  "multiple_active_secrets": false
}
```

**Fields**:
- `total_password_credentials`, `active_password_credentials`, `expired_password_credentials`: Counts of client secrets
- `total_key_credentials`, `active_key_credentials`, `expired_key_credentials`: Counts of certificates
- `long_lived_secrets`: Array of keyIds for secrets with lifetime > 180 days
- `expired_but_present`: Array of keyIds for expired credentials still configured
- `certificate_rollover_issues`: Array of certificate keyIds with rollover concerns
- `multiple_active_secrets`: Boolean true if more than 3 active secrets

### replyUrlAnalysis Structure

Security analysis of OAuth2 redirect URIs (computed from Microsoft Graph replyUrls):

```json
{
  "total_urls": 3,
  "normalized_domains": ["contoso.com", "fabrikam.com"],
  "non_https_urls": ["http://localhost:8080/callback"],
  "ip_literal_urls": ["https://192.168.1.100/callback"],
  "localhost_urls": ["http://localhost:8080/callback"],
  "punycode_urls": [],
  "wildcard_urls": ["https://*.contoso.com/callback"],
  "schemes": ["https", "http", "msauth"]
}
```

**Fields**:
- `total_urls`: Count of reply URLs
- `normalized_domains`: eTLD+1 domains extracted from URLs (e.g., "app.contoso.com" → "contoso.com")
- `non_https_urls`: URLs not using HTTPS scheme (security risk)
- `ip_literal_urls`: URLs using IP addresses instead of domains (security risk)
- `localhost_urls`: URLs pointing to localhost (dev/test pattern)
- `punycode_urls`: URLs with internationalized domains (potential homograph attacks)
- `wildcard_urls`: URLs with wildcard domains (broad attack surface)
- `schemes`: Unique schemes found (https, http, msauth, ms-app, brk-*, etc.)

**Broker Schemes**: Mobile broker schemes (msauth://, ms-app://, brk-*://) are tracked in `schemes` but don't contribute to risk scores.

### trustSignals Structure

Identity laundering and publisher trust indicators (computed from Graph data and replyUrlAnalysis):

```json
{
  "identityLaunderingSuspected": false,
  "mixedReplyUrlDomains": true,
  "nonAlignedDomains": ["suspicious-domain.com"]
}
```

**Fields**:
- `identityLaunderingSuspected`: Boolean true if reply URLs use domains not aligned with homepage/branding/privacyStatementUrl/termsOfServiceUrl
- `mixedReplyUrlDomains`: Boolean true if multiple distinct eTLD+1 domains are used
- `nonAlignedDomains`: Array of domains that don't align with expected vendor domains

### ownershipInsights Structure

Application ownership breakdown by principal type (computed from Microsoft Graph owners collection):

```json
{
  "totalOwners": 3,
  "userOwners": 2,
  "spOwners": 1,
  "unknownOwners": 0
}
```

**Fields**:
- `totalOwners`: Total count of owner principals
- `userOwners`: Count of user principal owners (highest mutation risk)
- `spOwners`: Count of service principal owners (moderate mutation risk)
- `unknownOwners`: Count of group, directory role, or unresolved owners

**Note**: Ownership represents change authority over application/service principal objects. Per Glenn Van Rymenant's analysis ([Entra ID Application Ownership Risks](https://www.appgovscore.com/blog/entra-id-application-ownership-risks-problems)), ownership is a risk factor rather than a security control. Applications with user owners present higher risk than those with service principal owners or no owners.

### replyUrlEnrichment Structure

Optional enrichment data from DNS/RDAP/IP WHOIS lookups (null when enrichment disabled):

```json
{
  "domains_analyzed": ["contoso.com", "fabrikam.com"],
  "same_organization_likely": true,
  "asn_summary": {
    "contoso.com": "AS8075 - Microsoft Corporation",
    "fabrikam.com": "AS8075 - Microsoft Corporation"
  },
  "enrichment_timestamp": "2024-12-26T12:00:00Z",
  "enrichment_enabled": {
    "dns": true,
    "rdap": true,
    "ipwhois": true
  }
}
```

**Fields** (when enrichment enabled):
- `domains_analyzed`: List of eTLD+1 domains that were enriched
- `same_organization_likely`: Boolean indicating if ASN/network analysis suggests same organization
- `asn_summary`: Map of domain to ASN description (from RDAP lookups)
- `enrichment_timestamp`: ISO 8601 timestamp when enrichment was performed
- `enrichment_enabled`: Object indicating which enrichment methods were enabled

**When null**: Enrichment was disabled (`--disable-all-enrichment`), enrichment dependencies not installed (dnspython/ipwhois), or there were no enrichable URLs (e.g., all wildcards or IP literals).

### publicClientIndicators Structure

Public client flow detection (from Microsoft Graph application object):

```json
{
  "hasPublicClientFlows": false,
  "hasImplicitFlow": false,
  "hasImplicitAccessTokenIssuance": false,
  "hasImplicitIdTokenIssuance": false,
  "hasSpaRedirectUris": false
}
```

**Fields**:
- `hasPublicClientFlows`: Boolean from application's `isFallbackPublicClient` or `allowPublicClient`
- `hasImplicitFlow`: Boolean if implicit flow is enabled
- `hasImplicitAccessTokenIssuance`: Boolean if implicit access token issuance is enabled
- `hasImplicitIdTokenIssuance`: Boolean if implicit ID token issuance is enabled
- `hasSpaRedirectUris`: Boolean if reply URLs contain "spa" keyword

### User Node

Represents users in the tenant.

```json
{
  "id": "user-11111",
  "type": "User",
  "displayName": "John Doe",
  "properties": {
    "userPrincipalName": "john.doe@contoso.com",
    "mail": "john.doe@contoso.com",
    "objectId": "66666666-6666-6666-6666-666666666666",
    "userType": "Member",
    "accountEnabled": true
  }
}
```

### Group Node

Represents security and Microsoft 365 groups.

```json
{
  "id": "group-22222",
  "type": "Group",
  "displayName": "HR Administrators",
  "properties": {
    "objectId": "77777777-7777-7777-7777-777777777777",
    "mailEnabled": false,
    "securityEnabled": true,
    "groupTypes": [],
    "membershipRule": null
  }
}
```

### Role Node

Represents directory roles (e.g., Global Administrator, Application Administrator).

```json
{
  "id": "role-33333",
  "type": "Role",
  "displayName": "Application Administrator",
  "properties": {
    "roleTemplateId": "88888888-8888-8888-8888-888888888888",
    "description": "Can manage all aspects of app registrations and enterprise apps.",
    "isBuiltIn": true,
    "isEnabled": true
  }
}
```

### ResourceApi Node

Represents resource applications that expose permissions (e.g., Microsoft Graph).

```json
{
  "id": "resource-44444",
  "type": "ResourceApi",
  "displayName": "Microsoft Graph",
  "properties": {
    "appId": "00000003-0000-0000-c000-000000000000",
    "servicePrincipalId": "99999999-9999-9999-9999-999999999999",
    "oauth2Permissions": [
      {
        "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "value": "User.Read",
        "displayName": "Read user profile",
        "description": "Allows the app to read the current user's profile.",
        "adminConsentDisplayName": "Read user profile",
        "adminConsentDescription": "...",
        "userConsentDisplayName": "Read your profile",
        "userConsentDescription": "...",
        "type": "User",
        "isEnabled": true
      }
    ],
    "appRoles": [
      {
        "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "value": "User.Read.All",
        "displayName": "Read all users' full profiles",
        "description": "Allows the app to read user profiles without a signed-in user.",
        "allowedMemberTypes": ["Application"],
        "isEnabled": true
      }
    ]
  }
}
```

**Key Properties**:
- **oauth2Permissions**: Delegated permissions (scopes)
- **appRoles**: Application permissions

## Edge Types

```mermaid
graph LR
    A[Edge Types] --> B[Structural]
    A --> C[Permissions]
    A --> D[Assignments]
    
    B --> B1[INSTANCE_OF]
    B --> B2[OWNS]
    B --> B3[MEMBER_OF]
    
    C --> C1[HAS_SCOPES]
    C --> C2[HAS_PRIVILEGED_SCOPES]
    C --> C3[HAS_TOO_MANY_SCOPES]
    C --> C4[HAS_APP_ROLE]
    C --> C5[CAN_IMPERSONATE]
    C --> C6[HAS_OFFLINE_ACCESS]
    
    D --> D1[ASSIGNED_TO]
    D --> D2[HAS_ROLE]
```

### Base Edge Structure

```json
{
  "id": "edge-unique-id",
  "type": "HAS_SCOPES",
  "source": "sp-12345",
  "target": "resource-44444",
  "properties": {
    // Edge-specific properties
  }
}
```

**Required Fields**:
- **id**: Unique edge identifier
- **type**: Edge type (see below)
- **source**: Source node ID
- **target**: Target node ID

### Structural Edges

#### INSTANCE_OF

Service principal to application relationship.

```json
{
  "id": "edge-instance-1",
  "type": "INSTANCE_OF",
  "source": "sp-12345",
  "target": "app-67890",
  "properties": {}
}
```

**Interpretation**: Service principal `sp-12345` is an instance of application `app-67890`.

#### OWNS

Ownership relationship.

```json
{
  "id": "edge-owns-1",
  "type": "OWNS",
  "source": "user-11111",
  "target": "app-67890",
  "properties": {}
}
```

**Interpretation**: User `user-11111` owns application `app-67890`.

#### MEMBER_OF

Group membership.

```json
{
  "id": "edge-member-1",
  "type": "MEMBER_OF",
  "source": "user-11111",
  "target": "group-22222",
  "properties": {
    "membershipType": "direct"
  }
}
```

**Interpretation**: User `user-11111` is a member of group `group-22222`.

### Permission Edges

#### HAS_SCOPES

Regular delegated permissions.

```json
{
  "id": "edge-scopes-1",
  "type": "HAS_SCOPES",
  "source": "sp-12345",
  "target": "resource-44444",
  "properties": {
    "scopes": ["User.Read", "Calendars.Read"],
    "permissionType": "delegated",
    "resourceAppId": "00000003-0000-0000-c000-000000000000",
    "resourceDisplayName": "Microsoft Graph",
    "consentType": "AllPrincipals",
    "principalId": null
  }
}
```

**Properties**:
- **scopes**: Array of scope values
- **permissionType**: Always "delegated" for scopes
- **resourceAppId**: Resource application ID
- **resourceDisplayName**: Human-readable resource name
- **consentType**: "AllPrincipals" or "Principal"
- **principalId**: Specific user ID if consent is user-specific

#### HAS_PRIVILEGED_SCOPES

Delegated permissions with write/modify capabilities.

```json
{
  "id": "edge-priv-scopes-1",
  "type": "HAS_PRIVILEGED_SCOPES",
  "source": "sp-12345",
  "target": "resource-44444",
  "properties": {
    "scopes": ["User.ReadWrite", "Mail.ReadWrite"],
    "permissionType": "delegated",
    "resourceAppId": "00000003-0000-0000-c000-000000000000",
    "resourceDisplayName": "Microsoft Graph"
  }
}
```

**Detection**: Scope contains "write" or "readwrite" (case-insensitive).

#### HAS_TOO_MANY_SCOPES

Overly broad delegated permissions.

```json
{
  "id": "edge-broad-scopes-1",
  "type": "HAS_TOO_MANY_SCOPES",
  "source": "sp-12345",
  "target": "resource-44444",
  "properties": {
    "scopes": ["User.Read.All", "Mail.Read.All"],
    "permissionType": "delegated",
    "resourceAppId": "00000003-0000-0000-c000-000000000000",
    "resourceDisplayName": "Microsoft Graph"
  }
}
```

**Detection**: Scope ends with ".All".

#### HAS_APP_ROLE

Application permissions (app roles).

```json
{
  "id": "edge-approle-1",
  "type": "HAS_APP_ROLE",
  "source": "sp-12345",
  "target": "resource-44444",
  "properties": {
    "appRoleId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    "appRoleValue": "User.Read.All",
    "permissionType": "application",
    "resourceAppId": "00000003-0000-0000-c000-000000000000",
    "resourceDisplayName": "Microsoft Graph",
    "displayName": "Read all users' full profiles",
    "description": "Allows the app to read user profiles without a signed-in user."
  }
}
```

**Properties**:
- **appRoleId**: App role GUID
- **appRoleValue**: App role value (e.g., "User.Read.All")
- **permissionType**: Always "application" for app roles
- **displayName**: Human-readable permission name
- **description**: Permission description

#### CAN_IMPERSONATE

Explicit impersonation capability.

```json
{
  "id": "edge-impersonate-1",
  "type": "CAN_IMPERSONATE",
  "source": "sp-12345",
  "target": "resource-44444",
  "properties": {
    "scopes": ["access_as_user"],
    "permissionType": "delegated",
    "resourceAppId": "00000003-0000-0000-c000-000000000000",
    "resourceDisplayName": "Microsoft Graph"
  }
}
```

**Detection**: Scope contains "access_as_user" or "user_impersonation".

**Note**: This is distinct from `HAS_OFFLINE_ACCESS` (persistence via refresh tokens).

#### HAS_OFFLINE_ACCESS

Persistence via refresh tokens.

```json
{
  "id": "edge-offline-1",
  "type": "HAS_OFFLINE_ACCESS",
  "source": "sp-12345",
  "target": "resource-44444",
  "properties": {
    "scopes": ["offline_access"],
    "permissionType": "delegated",
    "resourceAppId": "00000003-0000-0000-c000-000000000000",
    "resourceDisplayName": "Microsoft Graph"
  }
}
```

**Detection**: Scope includes "offline_access".

**Note**: This represents persistence (refresh tokens), NOT impersonation.

**Risk Scoring**: In risk.reasons, this appears as code `OFFLINE_ACCESS_PERSISTENCE` (see [Scoring Logic Documentation](scoring-logic.md#offline_access_persistence-8-to-15)).

### Assignment Edges

#### ASSIGNED_TO

User or group assignment to application.

```json
{
  "id": "edge-assigned-1",
  "type": "ASSIGNED_TO",
  "source": "group-22222",
  "target": "sp-12345",
  "properties": {
    "assignmentType": "group",
    "appRoleId": "00000000-0000-0000-0000-000000000000",
    "createdDateTime": "2024-01-01T00:00:00Z"
  }
}
```

**Properties**:
- **assignmentType**: "user" or "group"
- **appRoleId**: Specific app role if role-based assignment
- **createdDateTime**: When assignment was created

#### HAS_ROLE

Directory role assignment.

```json
{
  "id": "edge-hasrole-1",
  "type": "HAS_ROLE",
  "source": "sp-12345",
  "target": "role-33333",
  "properties": {
    "roleAssignmentId": "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "directoryScopeId": "/"
  }
}
```

**Properties**:
- **roleAssignmentId**: Role assignment object ID
- **directoryScopeId**: Scope of the role (usually "/" for tenant-wide)

## Risk Object Structure

All ServicePrincipal nodes include a risk assessment:

```json
{
  "risk": {
    "score": 75,
    "level": "high",
    "reasons": [
      {
        "code": "CAN_IMPERSONATE",
        "weight": 40,
        "message": "Delegated impersonation markers present"
      },
      {
        "code": "HAS_APP_ROLE",
        "weight": 25,
        "message": "Application permissions granted (Directory.Read.All)"
      },
      {
        "code": "HAS_OWNERS_USER",
        "weight": 15,
        "message": "Application has user principal owners. Ownership grants principals change authority over the app/SP object and can increase risk. (count: 2)"
      }
    ]
  }
}
```

**Risk Fields**:
- **score**: Numeric score from 0-100
- **level**: Risk level (info, low, medium, high, critical)
- **reasons**: Array of contributing factors

**Reason Object**:
- **code**: Risk contributor code (e.g., "CAN_IMPERSONATE")
- **weight**: Points contributed (can be negative for deductions)
- **message**: Human-readable explanation

## Usage Examples

### Example 1: Minimal Export

```json
{
  "format": {
    "name": "oidsee-graph",
    "version": "1.0"
  },
  "generatedAt": "2024-12-26T00:00:00Z",
  "tenant": {
    "tenantId": "00000000-0000-0000-0000-000000000000"
  },
  "nodes": [
    {
      "id": "user-1",
      "type": "User",
      "displayName": "Alice",
      "properties": {
        "userPrincipalName": "alice@contoso.com"
      }
    }
  ],
  "edges": []
}
```

### Example 2: Service Principal with Permissions

```json
{
  "format": {
    "name": "oidsee-graph",
    "version": "1.0"
  },
  "generatedAt": "2024-12-26T00:00:00Z",
  "tenant": {
    "tenantId": "00000000-0000-0000-0000-000000000000",
    "displayName": "Contoso"
  },
  "nodes": [
    {
      "id": "sp-1",
      "type": "ServicePrincipal",
      "displayName": "HR Portal",
      "properties": {
        "appId": "11111111-1111-1111-1111-111111111111",
        "publisherName": "Contoso Ltd",
        "signInAudience": "AzureADMultipleOrgs",
        "replyUrls": ["https://hr.contoso.com/callback"]
      },
      "risk": {
        "score": 35,
        "level": "low",
        "reasons": [
          {
            "code": "HAS_SCOPES",
            "weight": 0,
            "message": "Regular delegated scopes"
          },
          {
            "code": "ASSIGNED_TO",
            "weight": 15,
            "message": "Assigned to 25 users"
          }
        ]
      }
    },
    {
      "id": "resource-graph",
      "type": "ResourceApi",
      "displayName": "Microsoft Graph",
      "properties": {
        "appId": "00000003-0000-0000-c000-000000000000"
      }
    },
    {
      "id": "group-hr",
      "type": "Group",
      "displayName": "HR Staff",
      "properties": {
        "objectId": "22222222-2222-2222-2222-222222222222",
        "securityEnabled": true
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "type": "HAS_SCOPES",
      "source": "sp-1",
      "target": "resource-graph",
      "properties": {
        "scopes": ["User.Read", "Calendars.Read"],
        "permissionType": "delegated",
        "resourceAppId": "00000003-0000-0000-c000-000000000000",
        "resourceDisplayName": "Microsoft Graph"
      }
    },
    {
      "id": "edge-2",
      "type": "ASSIGNED_TO",
      "source": "group-hr",
      "target": "sp-1",
      "properties": {
        "assignmentType": "group"
      }
    }
  ]
}
```

### Example 3: High-Risk Application

```json
{
  "nodes": [
    {
      "id": "sp-risky",
      "type": "ServicePrincipal",
      "displayName": "Suspicious App",
      "properties": {
        "appId": "33333333-3333-3333-3333-333333333333",
        "publisherName": "Unknown Publisher",
        "verifiedPublisher": null,
        "signInAudience": "AzureADMultipleOrgs",
        "replyUrls": [
          "https://app.example.com/callback",
          "https://suspicious-domain.com/steal"
        ],
        "appRoleAssignmentRequired": false,
        "credentialInsights": {
          "total_password_credentials": 1,
          "active_password_credentials": 1,
          "long_lived_secrets": ["secret-1"],
          "multiple_active_secrets": false
        },
        "replyUrlAnalysis": {
          "total_urls": 2,
          "normalized_domains": ["example.com", "suspicious-domain.com"],
          "non_https_urls": [],
          "ip_literal_urls": [],
          "wildcard_urls": []
        },
        "trustSignals": {
          "identityLaunderingSuspected": true,
          "mixedReplyUrlDomains": true,
          "nonAlignedDomains": ["suspicious-domain.com"]
        }
      },
      "risk": {
        "score": 100,
        "level": "critical",
        "reasons": [
          {"code": "HAS_APP_ROLE", "weight": 50, "message": "Write app role granted"},
          {"code": "BROAD_REACHABILITY", "weight": 15, "message": "No assignment required"},
          {"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "Publisher not verified"},
          {"code": "DECEPTION", "weight": 20, "message": "Name mismatch detected"},
          {"code": "REPLYURL_OUTLIER_DOMAIN", "weight": 10, "message": "Non-aligned domains"},
          {"code": "CREDENTIALS_PRESENT", "weight": 10, "message": "Credentials present"},
          {"code": "LONG_LIVED_SECRET", "weight": 10, "message": "Secret lifetime > 180 days"},
          {"code": "HAS_OWNERS_USER", "weight": 15, "message": "Application has user principal owners (count: 1)"}
        ]
      }
    }
  ]
}
```

## Schema Validation

The export file can be validated against the JSON Schema:

```bash
# Using Python jsonschema library
python -c "
import json
import jsonschema

schema = json.load(open('schemas/oidsee-graph-export.schema.json'))
export = json.load(open('oidsee-export.json'))

try:
    jsonschema.validate(export, schema)
    print('✅ Export is valid')
except jsonschema.exceptions.ValidationError as e:
    print(f'❌ Validation error: {e.message}')
"
```

## Best Practices

### 1. Use Consistent IDs

- **Pattern**: Use prefixes like `sp-`, `app-`, `user-`, `group-` for readability
- **Uniqueness**: Ensure IDs are unique within the export
- **Stability**: Use stable identifiers (e.g., object GUIDs) when possible

### 2. Include All Relationships

- **Completeness**: Include all edges that represent meaningful relationships
- **Accuracy**: Ensure source and target IDs reference existing nodes

### 3. Populate Risk Information

- **Context**: Include detailed risk reasons for transparency
- **Accuracy**: Ensure risk scores reflect the actual risk calculation
- **Consistency**: Use consistent risk codes across exports

### 4. Handle Null Values

- **Optional Fields**: Use null for optional fields that aren't available
- **Placeholder Pattern**: Follow the pattern for future enrichment fields (domainWhois, dnsRecords, etc.)

### 5. Include Metadata

- **Collection Info**: Populate the collection object with tool and run details
- **Timestamps**: Use ISO 8601 format for all timestamps
- **Version**: Ensure format version is correct and consistent

## Schema Extensions

The schema uses `additionalProperties: false` at the top level but allows extensions within:

- **Node properties**: Can include custom fields specific to your analysis
- **Edge properties**: Can include additional metadata about relationships

**Example Extension**:
```json
{
  "id": "sp-custom",
  "type": "ServicePrincipal",
  "displayName": "Custom App",
  "properties": {
    "appId": "...",
    "customField": "custom value",
    "internalRating": 8.5
  }
}
```

## Common Pitfalls

### 1. Invalid GUIDs

**Problem**: GUIDs not matching the standard format

**Solution**: Ensure all GUIDs are properly formatted as `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (8-4-4-4-12 hexadecimal digits with hyphens)

### 2. Missing Required Fields

**Problem**: format, generatedAt, tenant, nodes, or edges missing

**Solution**: Always include all required top-level fields

### 3. Circular References

**Problem**: Edges creating circular dependencies in the graph

**Solution**: This is actually OK! Graphs can have cycles (e.g., User → Group → User via nested groups)

### 4. Orphaned Edges

**Problem**: Edge references node IDs that don't exist in the nodes array

**Solution**: Validate that all edge source and target IDs exist in nodes

### 5. Inconsistent Risk Levels

**Problem**: Risk score doesn't match risk level

**Solution**: Follow the mapping: 0-19=info, 20-39=low, 40-69=medium, 70-89=high, 90-100=critical

## Related Documentation

- **[Scanner Documentation](scanner.md)**: How to generate exports
- **[Scoring Logic Documentation](scoring-logic.md)**: Risk calculation details
- **[Web App Documentation](webapp.md)**: Visualizing exports

## Schema Version History

### Version 1.0
- Initial stable release
- Core node and edge types
- Basic risk scoring
- ServicePrincipal, Application, User, Group, Role types

### Version 1.1+ (vNext)
- Enhanced credential analysis
- Reply URL security analysis
- Trust signal detection
- Public client indicators
- Enrichment placeholders

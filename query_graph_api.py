#!/usr/bin/env python3
"""
Microsoft Graph API Query Tool

This script queries the Microsoft Graph beta endpoint to retrieve service principals
and filters out Microsoft first-party service principals and those owned by the tenant.

Supports authentication via:
- Client Secret (Application/Service Principal authentication)
- Device Code Flow (Delegated authentication)
"""

import argparse
import json
import sys
from typing import Optional, Dict, List, Any
from datetime import datetime
import webbrowser

import requests
from azure.identity import ClientSecretCredential, DeviceCodeCredential
from azure.core.exceptions import AzureError


class MicrosoftGraphClient:
    """Client for querying Microsoft Graph API"""
    
    # Known Microsoft first-party service principal app IDs
    MICROSOFT_FIRST_PARTY_APP_IDS = {
        "00000002-0000-0000-c000-000000000000",  # Office 365 Exchange Online
        "00000003-0000-0000-c000-000000000000",  # Microsoft Graph
        "00000004-0000-0000-c000-000000000000",  # Skype for Business
        "0000000a-0000-0000-c000-000000000000",  # Office 365 SharePoint
        "c44b4083-3bb0-49c1-b47d-974e53cbdf3c",  # Azure Portal
        "7f142d01-3a44-4e18-a1bd-0db5281e4a37",  # Yammer
        "00000007-0000-0000-c000-000000000000",  # Windows Azure AD
        "2d4d3d8c-34f7-46e0-be86-08b8e1219b91",  # Azure Data Lake
        "64885f5e-ab3f-4289-bde2-2b4055d02a60",  # Microsoft Teams
        "27922522-5345-4215-b3cc-1b4ed20bd47f",  # Windows Search
        "9ea1ad79-fac3-4e5a-8bc4-fc2f2f735fb9",  # Office 365 Management
        "cf36b471-5b44-428c-9ce7-313bf84528de",  # Azure Synapse
    }
    
    def __init__(self, tenant_id: str, graph_endpoint: str = "https://graph.microsoft.com/beta"):
        """
        Initialize the Graph API client
        
        Args:
            tenant_id: Azure AD tenant ID
            graph_endpoint: Graph API endpoint (default: beta)
        """
        self.tenant_id = tenant_id
        self.graph_endpoint = graph_endpoint
        self.credential = None
        self.access_token = None
        
    def authenticate_with_client_secret(
        self, 
        client_id: str, 
        client_secret: str
    ) -> bool:
        """
        Authenticate using Client Secret (Service Principal)
        
        Args:
            client_id: Application (Client) ID
            client_secret: Client secret value
            
        Returns:
            True if authentication successful
        """
        try:
            self.credential = ClientSecretCredential(
                tenant_id=self.tenant_id,
                client_id=client_id,
                client_secret=client_secret
            )
            # Get access token to verify credentials work
            self.access_token = self.credential.get_token("https://graph.microsoft.com/.default")
            print(f"✓ Successfully authenticated with client secret for {client_id}")
            return True
        except AzureError as e:
            print(f"✗ Authentication failed: {e}")
            return False
    
    def authenticate_with_device_code(self) -> bool:
        """
        Authenticate using Device Code Flow
        
        Returns:
            True if authentication successful
        """
        try:
            self.credential = DeviceCodeCredential(
                tenant_id=self.tenant_id,
                client_id="04b07795-8ddb-461a-bbee-02f9e1bf7b46"  # Azure CLI client ID
            )
            # This will prompt the user with a device code
            self.access_token = self.credential.get_token("https://graph.microsoft.com/.default")
            print("✓ Successfully authenticated with device code")
            return True
        except AzureError as e:
            print(f"✗ Authentication failed: {e}")
            return False
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for API requests"""
        if not self.credential:
            raise ValueError("Not authenticated. Call authenticate_with_client_secret or authenticate_with_device_code first.")
        
        # Refresh token if needed
        token = self.credential.get_token("https://graph.microsoft.com/.default")
        
        return {
            "Authorization": f"Bearer {token.token}",
            "Content-Type": "application/json"
        }
    
    def get_service_principals(self) -> Optional[List[Dict[str, Any]]]:
        """
        Retrieve all service principals from Microsoft Graph
        
        Returns:
            List of service principal objects or None if request fails
        """
        try:
            url = f"{self.graph_endpoint}/servicePrincipals"
            params = {
                "$select": "id,displayName,appId,appOwnerOrganizationId,createdDateTime,publisherName,verifiedPublisher",
                "$top": 999
            }
            
            service_principals = []
            has_more = True
            skip_token = None
            
            while has_more:
                if skip_token:
                    params["$skiptoken"] = skip_token
                
                response = requests.get(
                    url,
                    headers=self._get_headers(),
                    params=params,
                    timeout=30
                )
                response.raise_for_status()
                
                data = response.json()
                service_principals.extend(data.get("value", []))
                
                # Check for pagination
                skip_token = data.get("@odata.nextLink")
                has_more = skip_token is not None
            
            print(f"✓ Retrieved {len(service_principals)} service principals")
            return service_principals
            
        except requests.RequestException as e:
            print(f"✗ Failed to retrieve service principals: {e}")
            return None
    
    def filter_service_principals(
        self, 
        service_principals: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Filter service principals for "Microsoft Accounts" publisher only
        
        Args:
            service_principals: List of service principal objects
            
        Returns:
            List of filtered service principals with Microsoft Accounts publisher
        """
        filtered = []
        
        for sp in service_principals:
            publisher_name = sp.get("publisherName")
            
            # Only include service principals with "Microsoft Accounts" publisher
            if publisher_name and publisher_name.lower() == "microsoft accounts":
                filtered.append(sp)
        
        return filtered
    
    def _service_principal_to_node(self, sp: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert a service principal to OID-See node format
        
        Args:
            sp: Service principal object from Graph API
            
        Returns:
            Node object formatted per OID-See schema
        """
        node = {
            "id": sp.get("id"),
            "type": "ServicePrincipal",
            "displayName": sp.get("displayName"),
            "labels": [],
            "properties": {
                "azureObjectId": sp.get("id"),
                "appId": sp.get("appId"),
                "servicePrincipalId": sp.get("id"),
                "tenantId": self.tenant_id,
                "userPrincipalName": None,
                "groupId": None,
                "roleTemplateId": None,
                "createdDateTime": sp.get("createdDateTime"),
                "lastModifiedDateTime": None,
                "verifiedPublisher": sp.get("verifiedPublisher"),
                "publisherName": sp.get("publisherName"),
                "appOwnerOrganizationId": sp.get("appOwnerOrganizationId"),
                "isMultiTenant": None,
                "requiresAssignment": None,
                "signInAudience": None,
                "replyUrls": []
            },
            "risk": None,
            "evidence": []
        }
        
        return node
    
    def format_oidsee_export(
        self, 
        service_principals: List[Dict[str, Any]],
        tenant_display_name: Optional[str] = None,
        tenant_region: Optional[str] = None,
        cloud: str = "Public"
    ) -> Dict[str, Any]:
        """
        Format filtered service principals according to OID-See schema
        
        Args:
            service_principals: Filtered list of service principals
            tenant_display_name: Optional tenant display name
            tenant_region: Optional tenant region
            cloud: Cloud environment (default: Public)
            
        Returns:
            OID-See compliant graph export
        """
        nodes = [self._service_principal_to_node(sp) for sp in service_principals]
        
        export = {
            "format": {
                "name": "oidsee-graph",
                "version": "1.0.0"
            },
            "generatedAt": datetime.utcnow().isoformat() + "Z",
            "tenant": {
                "tenantId": self.tenant_id,
                "displayName": tenant_display_name,
                "region": tenant_region,
                "cloud": cloud
            },
            "collection": None,
            "nodes": nodes,
            "edges": [],
            "findings": None,
            "metrics": {
                "nodeCounts": {
                    "ServicePrincipal": len(nodes)
                },
                "edgeCounts": {}
            }
        }
        
        return export
    
    def export_to_json(self, data: Dict[str, Any], output_file: str) -> bool:
        """
        Export filtered results to JSON file
        
        Args:
            data: Data to export
            output_file: Output file path
            
        Returns:
            True if successful
        """
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, default=str)
            print(f"✓ Results exported to {output_file}")
            return True
        except IOError as e:
            print(f"✗ Failed to export results: {e}")
            return False


def main():
    parser = argparse.ArgumentParser(
        description="Query Microsoft Graph API for service principals with filtering"
    )
    
    parser.add_argument(
        "--tenant-id",
        required=True,
        help="Azure AD tenant ID"
    )
    
    parser.add_argument(
        "--auth-method",
        choices=["client-secret", "device-code"],
        required=True,
        help="Authentication method to use"
    )
    
    parser.add_argument(
        "--client-id",
        help="Application (Client) ID (required for client-secret auth)"
    )
    
    parser.add_argument(
        "--client-secret",
        help="Client secret (required for client-secret auth)"
    )
    
    parser.add_argument(
        "--output",
        default="graph_query_results.json",
        help="Output JSON file path (default: graph_query_results.json)"
    )
    
    parser.add_argument(
        "--tenant-display-name",
        help="Optional tenant display name"
    )
    
    parser.add_argument(
        "--tenant-region",
        help="Optional tenant region"
    )
    
    parser.add_argument(
        "--cloud",
        default="Public",
        choices=["Public", "GCC", "GCCHigh", "DoD", "China", "Germany"],
        help="Cloud environment (default: Public)"
    )
    
    parser.add_argument(
        "--show-details",
        action="store_true",
        help="Print detailed results to console"
    )
    
    args = parser.parse_args()
    
    # Validate arguments
    if args.auth_method == "client-secret":
        if not args.client_id or not args.client_secret:
            print("✗ Error: --client-id and --client-secret are required for client-secret auth")
            sys.exit(1)
    
    # Initialize client
    client = MicrosoftGraphClient(args.tenant_id)
    
    # Authenticate
    print(f"Authenticating with {args.auth_method}...")
    if args.auth_method == "client-secret":
        if not client.authenticate_with_client_secret(args.client_id, args.client_secret):
            sys.exit(1)
    else:  # device-code
        if not client.authenticate_with_device_code():
            sys.exit(1)
    
    # Get service principals
    print("\nRetrieving service principals...")
    service_principals = client.get_service_principals()
    if service_principals is None:
        sys.exit(1)
    
    # Filter for Microsoft Accounts publisher
    print("\nFiltering for 'Microsoft Accounts' publisher...")
    filtered_sps = client.filter_service_principals(service_principals)
    
    # Display summary
    print(f"\n{'='*60}")
    print("FILTERING SUMMARY")
    print(f"{'='*60}")
    print(f"Total service principals: {len(service_principals)}")
    print(f"Microsoft Accounts: {len(filtered_sps)}")
    print(f"{'='*60}\n")
    
    # Format as OID-See schema
    print("Formatting output per OID-See schema...")
    oidsee_export = client.format_oidsee_export(
        filtered_sps,
        tenant_display_name=args.tenant_display_name,
        tenant_region=args.tenant_region,
        cloud=args.cloud
    )
    
    # Export results
    if client.export_to_json(oidsee_export, args.output):
        print(f"\nResults saved to: {args.output}")
    else:
        sys.exit(1)
    
    # Show details if requested
    if args.show_details and filtered_sps:
        print("\nMICROSOFT ACCOUNTS SERVICE PRINCIPALS:")
        print("-" * 60)
        for sp in filtered_sps:
            print(f"  • {sp['displayName']} ({sp.get('appId', 'N/A')})")
            if sp.get('createdDateTime'):
                print(f"    Created: {sp['createdDateTime']}")
            if sp.get('verifiedPublisher') is not None:
                status = "✓ Verified" if sp['verifiedPublisher'] else "✗ Unverified"
                print(f"    {status}")


if __name__ == "__main__":
    main()

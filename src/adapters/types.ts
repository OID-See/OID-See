
export type RiskLevel = 'info' | 'low' | 'medium' | 'high' | 'critical'

export type RiskReason = {
  code: string
  message: string
  weight?: number
  refs?: string[]
}

export type Risk = {
  score?: number
  level?: RiskLevel
  reasons?: RiskReason[]
}

export type OidSeeNodeType =
  | 'OAuthApp'
  | 'ServicePrincipal'
  | 'Application'
  | 'User'
  | 'Group'
  | 'Role'
  | 'TenantPolicy'
  | 'Organization'
  | 'ResourceApi'

export type OidSeeNode = {
  id: string
  type: OidSeeNodeType
  displayName: string
  labels?: string[]
  properties: Record<string, any>
  risk?: Risk
  evidence?: any[]
}

export type OidSeeEdgeType =
  | 'CAN_IMPERSONATE'
  | 'ASSIGNED_TO'
  | 'HAS_SCOPES'
  | 'HAS_PRIVILEGED_SCOPES'
  | 'HAS_TOO_MANY_SCOPES'
  | 'HAS_SCOPE' // legacy, keeping for backwards compat
  | 'MEMBER_OF'
  | 'HAS_ROLE'
  | 'HAS_APP_ROLE'
  | 'HAS_OFFLINE_ACCESS'
  | 'OWNS'
  | 'GOVERNS'
  | 'EFFECTIVE_IMPERSONATION_PATH'
  | 'PERSISTENCE_PATH'
  | 'INSTANCE_OF'

export type OidSeeEdge = {
  id: string
  type: OidSeeEdgeType
  from: string
  to: string
  properties: Record<string, any>
  risk?: Risk
  evidence?: any[]
  derived?: {
    isDerived?: boolean
    algorithm?: string
    inputs?: string[]
  }
}

export type OidSeeExport = {
  format: { name: 'oidsee-graph'; version: string }
  generatedAt: string
  tenant: { tenantId: string; displayName?: string; region?: string; cloud?: string }
  collection?: any
  nodes: OidSeeNode[]
  edges: OidSeeEdge[]
  findings?: any[]
  metrics?: any
}

export function isOidSeeExport(v: any): v is OidSeeExport {
  if (!v || typeof v !== 'object') return false
  if (!v.format || typeof v.format !== 'object') return false
  if (v.format.name !== 'oidsee-graph') return false
  if (typeof v.format.version !== 'string') return false
  if (!/^1\.(0|[1-9]\d*)(\.[0-9]+)?$/.test(v.format.version)) return false
  if (!Array.isArray(v.nodes) || !Array.isArray(v.edges)) return false
  if (!v.tenant || typeof v.tenant !== 'object' || typeof v.tenant.tenantId !== 'string') return false
  return true
}

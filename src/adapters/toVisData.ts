
import { isOidSeeExport, OidSeeExport } from './types'

export type VisData = { nodes: any[]; edges: any[] }

export function toVisData(input: any): VisData {
  if (isOidSeeExport(input)) {
    const exp = input as OidSeeExport

    const visNodes = exp.nodes.map((n) => {
      const riskBoost = typeof n.risk?.score === 'number' ? Math.min(30, Math.max(0, n.risk.score)) : 0
      const value = 10 + riskBoost / 2

      const isHigh = (n.risk?.level === 'high' || n.risk?.level === 'critical') && (n.risk?.score ?? 0) >= 70

      return {
        id: n.id,
        label: n.displayName,
        group: n.type,
        value,
        __oidsee: n,
        borderWidth: isHigh ? 3 : 2,
      }
    })

    const visEdges = exp.edges.map((e) => {
      // Don't show scopes on edge labels - they're visible in details panel
      const label = e.type

      const isDerived = !!e.derived?.isDerived
      const isInstance = e.type === 'INSTANCE_OF'
      
      // Color edges based on type
      const isScopeEdge = e.type === 'HAS_SCOPES' || e.type === 'HAS_PRIVILEGED_SCOPES' || e.type === 'HAS_TOO_MANY_SCOPES' || e.type === 'HAS_SCOPE'
      const isTooManyScopes = e.type === 'HAS_TOO_MANY_SCOPES'

      const color = isDerived
        ? { color: 'rgba(66,232,224,0.90)', highlight: 'rgba(66,232,224,1.0)' }
        : isInstance
          ? { color: 'rgba(234,242,255,0.35)', highlight: 'rgba(234,242,255,0.65)' }
          : isTooManyScopes
            ? { color: 'rgba(255,100,100,0.70)', highlight: 'rgba(255,100,100,1.0)' }
            : undefined

      return {
        id: e.id,
        from: e.from,
        to: e.to,
        label,
        arrows: 'to',
        dashes: isDerived || isInstance,
        width: isDerived ? 3 : isTooManyScopes ? 2.5 : 1.5,
        color,
        __oidsee: e,
      }
    })

    return { nodes: visNodes, edges: visEdges }
  }

  if (input && typeof input === 'object' && Array.isArray((input as any).nodes) && Array.isArray((input as any).edges)) {
    return { nodes: (input as any).nodes, edges: (input as any).edges }
  }

  throw new Error('Unsupported JSON format. Expected an OID-See export (format.name="oidsee-graph") or a {nodes, edges} object.')
}

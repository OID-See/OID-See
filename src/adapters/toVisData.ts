
import { isOidSeeExport, OidSeeExport } from './types'

export type VisData = { nodes: any[]; edges: any[] }

export function toVisData(input: any): VisData {
  if (isOidSeeExport(input)) {
    const exp = input as OidSeeExport

    const visNodes = exp.nodes.map((n) => {
      const riskBoost = typeof n.risk?.score === 'number' ? Math.min(20, Math.max(0, n.risk.score)) : 0
      const value = 10 + (riskBoost / 2)

      return {
        id: n.id,
        label: n.displayName,
        group: n.type,
        value,
        __oidsee: n,
      }
    })

    const visEdges = exp.edges.map((e) => {
      const scopes = e.properties?.scopes?.length ? e.properties.scopes.join(' ') : ''
      const label = scopes ? `${e.type}\n${scopes}` : e.type

      return {
        id: e.id,
        from: e.from,
        to: e.to,
        label,
        arrows: 'to',
        dashes: !!e.derived?.isDerived,
        __oidsee: e,
      }
    })

    return { nodes: visNodes, edges: visEdges }
  }

  if (input && typeof input === 'object' && Array.isArray(input.nodes) && Array.isArray(input.edges)) {
    return { nodes: input.nodes, edges: input.edges }
  }

  throw new Error('Unsupported JSON format. Expected an OID-See export (format.name="oidsee-graph") or a {nodes, edges} object.')
}

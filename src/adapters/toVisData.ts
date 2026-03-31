
import { isOidSeeExport, OidSeeExport, OidSeeNode, OidSeeEdge } from './types'

export type VisData = { nodes: any[]; edges: any[] }

// Custom double-circle renderer for group nodes
function doubleCircleRenderer({ ctx, x, y, state, style }: any) {
  try {
    // Validate required parameters
    if (!ctx || x === undefined || y === undefined) {
      console.warn('Custom renderer called with missing parameters')
      return false
    }
    
    const { selected } = state || {}
    const radius = style?.size || 10
    const borderWidth = selected ? 3 : 2
    const color = style?.color || { border: 'rgba(234,242,255,0.75)', background: 'rgba(234,242,255,0.08)' }
    
    // Draw outer circle
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, 2 * Math.PI)
    ctx.fillStyle = color.background || 'rgba(234,242,255,0.08)'
    ctx.fill()
    ctx.strokeStyle = color.border || 'rgba(234,242,255,0.75)'
    ctx.lineWidth = borderWidth
    ctx.stroke()
    
    // Draw inner circle (smaller, creating double-circle effect)
    const innerRadius = radius * 0.65
    ctx.beginPath()
    ctx.arc(x, y, innerRadius, 0, 2 * Math.PI)
    ctx.strokeStyle = color.border || 'rgba(234,242,255,0.75)'
    ctx.lineWidth = borderWidth
    ctx.stroke()
    
    return true // Return true to indicate successful custom rendering
  } catch (e) {
    // Fallback to default rendering if custom renderer fails
    console.warn('Custom renderer failed, using default:', e)
    return false
  }
}

// Shared conversion helpers used by both sync and async paths
function nodeToVisNode(n: OidSeeNode): any {
  try {
    const riskBoost = typeof n.risk?.score === 'number' ? Math.min(30, Math.max(0, n.risk.score)) : 0
    const value = 10 + riskBoost / 2
    const isHigh = (n.risk?.level === 'high' || n.risk?.level === 'critical') && (n.risk?.score ?? 0) >= 70
    const isGroup = n.type === 'Group'
    return {
      id: n.id,
      label: n.displayName || n.id,
      group: n.type,
      value,
      __oidsee: n,
      borderWidth: isHigh ? 3 : 2,
      shape: isGroup ? 'custom' : 'dot',
      ctxRenderer: isGroup ? doubleCircleRenderer : undefined,
      color: isHigh ? {
        border: 'rgba(255,107,107,0.95)',
        background: 'rgba(255,107,107,0.20)',
        highlight: { background: 'rgba(255,107,107,0.30)', border: 'rgba(255,107,107,1.0)' },
      } : undefined,
    }
  } catch (e) {
    return { id: n.id, label: n.displayName || n.id, group: n.type || 'Unknown', value: 10, __oidsee: n }
  }
}

function edgeToVisEdge(e: OidSeeEdge): any {
  const isDerived = !!e.derived?.isDerived
  const isInstance = e.type === 'INSTANCE_OF'
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
    label: e.type,
    arrows: 'to',
    dashes: isDerived || isInstance,
    width: isDerived ? 3 : isTooManyScopes ? 2.5 : 1.5,
    color,
    __oidsee: e,
    ...(isInstance && { selectionWidth: 0, hoverWidth: 0 }),
  }
}

/**
 * Convert raw OidSeeNode/OidSeeEdge arrays directly to VisData (no isOidSeeExport check needed).
 * Use this for on-demand graph loading to avoid the full JSON parse overhead.
 */
export function toVisDataFromRaw(nodes: OidSeeNode[], edges: OidSeeEdge[]): VisData {
  return {
    nodes: nodes.map(nodeToVisNode).filter(Boolean),
    edges: edges.map(edgeToVisEdge),
  }
}

/**
 * Async version of toVisDataFromRaw that yields to event loop between batches.
 * Use for large datasets to avoid blocking the main thread.
 */
export async function toVisDataFromRawAsync(nodes: OidSeeNode[], edges: OidSeeEdge[]): Promise<VisData> {
  const BATCH_SIZE = 2000
  const visNodes: any[] = []
  for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
    for (const n of nodes.slice(i, i + BATCH_SIZE)) visNodes.push(nodeToVisNode(n))
    if (i + BATCH_SIZE < nodes.length) await new Promise(r => setTimeout(r, 0))
  }
  const visEdges: any[] = []
  for (let i = 0; i < edges.length; i += BATCH_SIZE) {
    for (const e of edges.slice(i, i + BATCH_SIZE)) visEdges.push(edgeToVisEdge(e))
    if (i + BATCH_SIZE < edges.length) await new Promise(r => setTimeout(r, 0))
  }
  return { nodes: visNodes, edges: visEdges }
}

export function toVisData(input: any): VisData {
  if (isOidSeeExport(input)) {
    const exp = input as OidSeeExport
    return {
      nodes: exp.nodes.map(nodeToVisNode).filter(Boolean),
      edges: exp.edges.map(edgeToVisEdge),
    }
  }

  if (input && typeof input === 'object' && Array.isArray((input as any).nodes) && Array.isArray((input as any).edges)) {
    return { nodes: (input as any).nodes, edges: (input as any).edges }
  }

  throw new Error('Unsupported JSON format. Expected an OID-See export (format.name="oidsee-graph") or a {nodes, edges} object.')
}

/**
 * Async version of toVisData that processes nodes/edges in batches to avoid blocking UI
 */
export async function toVisDataAsync(input: any): Promise<VisData> {
  if (isOidSeeExport(input)) {
    const exp = input as OidSeeExport
    return toVisDataFromRawAsync(exp.nodes, exp.edges)
  }

  if (input && typeof input === 'object' && Array.isArray((input as any).nodes) && Array.isArray((input as any).edges)) {
    return { nodes: (input as any).nodes, edges: (input as any).edges }
  }

  throw new Error('Unsupported JSON format. Expected an OID-See export (format.name="oidsee-graph") or a {nodes, edges} object.')
}

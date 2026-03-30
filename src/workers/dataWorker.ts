/**
 * dataWorker.ts
 *
 * All CPU-heavy work runs here, off the main thread:
 *   - JSON.parse
 *   - Query/lens filtering (applyFilter)
 *   - Vis-network format conversion (for graph view)
 *
 * Message protocol
 * ----------------
 * Main → Worker:
 *   { type: 'LOAD';         text: string }
 *   { type: 'FILTER';       id: number; query: string; lens: string; pathAware: boolean }
 *   { type: 'LOAD_GRAPH';   subsetNodeIds?: string[] }
 *   { type: 'ABORT_GRAPH' }
 *
 * Worker → Main:
 *   { type: 'PROGRESS';     message: string }
 *   { type: 'LOADED';       nodeCount: number; edgeCount: number; exceedsGraphLimits: boolean }
 *   { type: 'FILTERED';     id: number; nodes: OidSeeNode[]; edges: OidSeeEdge[]; warnings: string[] }
 *   { type: 'GRAPH_READY';  nodes: any[]; edges: any[] }
 *   { type: 'ERROR';        message: string }
 */

import { parseQuery, evalClause, getPath, isNumericOp } from '../filters/query'
import { lensEdgeAllowed } from '../filters/lens'
import type { OidSeeNode, OidSeeEdge } from '../adapters/types'

// ─── Worker-local state ────────────────────────────────────────────────────
let allNodes: OidSeeNode[] = []
let allEdges: OidSeeEdge[] = []
let abortGraphLoad = false

const MAX_RENDERABLE_NODES = 3000
const MAX_RENDERABLE_EDGES = 4500

// ─── Vis-network conversion ────────────────────────────────────────────────
// Duplicated from toVisData.ts to avoid pulling browser-only canvas APIs
// into the worker context.

function doubleCircleRenderer({ ctx, x, y, state, style }: any) {
  try {
    if (!ctx || x === undefined || y === undefined) return false
    const { selected } = state || {}
    const radius = style?.size || 10
    const borderWidth = selected ? 3 : 2
    const color = style?.color || { border: 'rgba(234,242,255,0.75)', background: 'rgba(234,242,255,0.08)' }
    ctx.beginPath(); ctx.arc(x, y, radius, 0, 2 * Math.PI)
    ctx.fillStyle = color.background || 'rgba(234,242,255,0.08)'; ctx.fill()
    ctx.strokeStyle = color.border || 'rgba(234,242,255,0.75)'; ctx.lineWidth = borderWidth; ctx.stroke()
    const innerRadius = radius * 0.65
    ctx.beginPath(); ctx.arc(x, y, innerRadius, 0, 2 * Math.PI)
    ctx.strokeStyle = color.border || 'rgba(234,242,255,0.75)'; ctx.lineWidth = borderWidth; ctx.stroke()
    return true
  } catch { return false }
}

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
  } catch {
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
    id: e.id, from: e.from, to: e.to, label: e.type,
    arrows: 'to',
    dashes: isDerived || isInstance,
    width: isDerived ? 3 : isTooManyScopes ? 2.5 : 1.5,
    color,
    __oidsee: e,
    ...(isInstance && { selectionWidth: 0, hoverWidth: 0 }),
  }
}

// ─── Filtering ─────────────────────────────────────────────────────────────

function applyFilter(query: string, lens: string, pathAware: boolean): { nodes: OidSeeNode[]; edges: OidSeeEdge[] } {
  // Fast path: no filtering at all
  if (!query.trim() && lens === 'full' && !pathAware) {
    return { nodes: allNodes, edges: allEdges }
  }

  const parsed = parseQuery(query)
  const clauses = parsed.clauses
  const nodeClauses = clauses.filter(c => c.target === 'node' || c.target === 'both')
  const edgeClauses = clauses.filter(c => c.target === 'edge' || c.target === 'both')

  const passingNodeIds = new Set<string>()
  if (nodeClauses.length > 0) {
    for (const n of allNodes) {
      if (nodeClauses.every(c => evalClause(n, c))) passingNodeIds.add(n.id)
    }
  } else {
    for (const n of allNodes) passingNodeIds.add(n.id)
  }

  const edgeById = new Map<string, OidSeeEdge>()
  for (const e of allEdges) edgeById.set(e.id, e)

  const edgesOut: OidSeeEdge[] = []
  const edgesKept = new Set<string>()
  for (const e of allEdges) {
    if (!lensEdgeAllowed(lens, e.type)) continue
    if (!edgeClauses.every(c => evalClause(e, c))) continue
    if (!passingNodeIds.has(e.from) || !passingNodeIds.has(e.to)) continue
    if (!edgesKept.has(e.id)) { edgesOut.push(e); edgesKept.add(e.id) }
    if (pathAware && e.derived?.isDerived && Array.isArray(e.derived.inputs)) {
      for (const id of e.derived.inputs) {
        const inp = edgeById.get(id)
        if (inp && !edgesKept.has(inp.id) && passingNodeIds.has(inp.from) && passingNodeIds.has(inp.to) && lensEdgeAllowed(lens, inp.type)) {
          edgesOut.push(inp); edgesKept.add(inp.id)
        }
      }
    }
  }

  const nodesWithEdges = new Set<string>()
  for (const e of edgesOut) { nodesWithEdges.add(e.from); nodesWithEdges.add(e.to) }

  const nodesOut = allNodes.filter(n => {
    if (!passingNodeIds.has(n.id)) return false
    if (lens === 'full') return true
    return nodesWithEdges.has(n.id)
  })

  return { nodes: nodesOut, edges: edgesOut }
}

// ─── Warnings ──────────────────────────────────────────────────────────────

function computeWarnings(query: string): string[] {
  const parsed = parseQuery(query)
  if (parsed.errors.length || parsed.clauses.length === 0) return []
  const warns: string[] = []
  for (const c of parsed.clauses) {
    const pool: any[] = c.target === 'node' ? allNodes : c.target === 'edge' ? allEdges : [...allNodes, ...allEdges]
    const anyHas = pool.some(o => getPath(o, c.path) !== undefined)
    if (!anyHas) {
      warns.push(`No matches for path "${c.path}" (${c.target}). Possible typo or field not present in this export.`)
      continue
    }
    if (isNumericOp(c.op)) {
      const samples = pool.map(o => getPath(o, c.path)).filter(v => v !== undefined && v !== null).slice(0, 25)
      const nonNum = samples.some(v => typeof v !== 'number' && Number.isNaN(Number(v)))
      if (nonNum) warns.push(`Numeric operator used on non-numeric values at "${c.path}". This clause may filter out everything.`)
    }
  }
  return warns
}

// ─── Graph view conversion ─────────────────────────────────────────────────

function buildGraphData(subsetNodeIds?: string[]): { nodes: any[]; edges: any[] } {
  let nodesToConvert = allNodes
  let edgesToConvert = allEdges

  if (subsetNodeIds && subsetNodeIds.length > 0) {
    const idSet = new Set(subsetNodeIds)
    nodesToConvert = allNodes.filter(n => idSet.has(n.id))
    edgesToConvert = allEdges.filter(e => idSet.has(e.from) && idSet.has(e.to))
  } else if (nodesToConvert.length > MAX_RENDERABLE_NODES || edgesToConvert.length > MAX_RENDERABLE_EDGES) {
    const sorted = [...allNodes].sort((a, b) => (b.risk?.score ?? 0) - (a.risk?.score ?? 0))
    nodesToConvert = sorted.slice(0, MAX_RENDERABLE_NODES)
    const idSet = new Set(nodesToConvert.map(n => n.id))
    edgesToConvert = allEdges.filter(e => idSet.has(e.from) && idSet.has(e.to)).slice(0, MAX_RENDERABLE_EDGES)
  }

  return {
    nodes: nodesToConvert.map(nodeToVisNode),
    edges: edgesToConvert.map(edgeToVisEdge),
  }
}

// ─── Message handler ───────────────────────────────────────────────────────

self.onmessage = (e: MessageEvent) => {
  const msg = e.data

  switch (msg.type) {
    case 'LOAD': {
      try {
        self.postMessage({ type: 'PROGRESS', message: 'Parsing JSON…' })
        const parsed = JSON.parse(msg.text)
        if (!Array.isArray(parsed?.nodes) || !Array.isArray(parsed?.edges)) {
          throw new Error('Expected an OID-See export with "nodes" and "edges" arrays.')
        }
        allNodes = parsed.nodes as OidSeeNode[]
        allEdges = parsed.edges as OidSeeEdge[]
        const exceedsGraphLimits = allNodes.length > MAX_RENDERABLE_NODES || allEdges.length > MAX_RENDERABLE_EDGES
        self.postMessage({
          type: 'LOADED',
          nodeCount: allNodes.length,
          edgeCount: allEdges.length,
          exceedsGraphLimits,
        })
        // Send initial unfiltered result so UI renders immediately after load
        self.postMessage({ type: 'FILTERED', id: 0, nodes: allNodes, edges: allEdges, warnings: [] })
      } catch (err: any) {
        self.postMessage({ type: 'ERROR', message: err?.message ?? String(err) })
      }
      break
    }

    case 'FILTER': {
      try {
        const { nodes, edges } = applyFilter(msg.query, msg.lens, msg.pathAware)
        const warnings = computeWarnings(msg.query)
        self.postMessage({ type: 'FILTERED', id: msg.id, nodes, edges, warnings })
      } catch (err: any) {
        self.postMessage({ type: 'ERROR', message: err?.message ?? String(err) })
      }
      break
    }

    case 'LOAD_GRAPH': {
      abortGraphLoad = false
      try {
        self.postMessage({ type: 'PROGRESS', message: 'Building graph view…' })
        if (abortGraphLoad) break
        const visData = buildGraphData(msg.subsetNodeIds)
        if (abortGraphLoad) break
        self.postMessage({ type: 'GRAPH_READY', nodes: visData.nodes, edges: visData.edges })
      } catch (err: any) {
        self.postMessage({ type: 'ERROR', message: `Graph build failed: ${err?.message ?? String(err)}` })
      }
      break
    }

    case 'ABORT_GRAPH': {
      abortGraphLoad = true
      break
    }
  }
}

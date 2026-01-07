
import { isOidSeeExport, OidSeeExport } from './types'

export type VisData = { nodes: any[]; edges: any[] }
export type ProgressCallback = (message: string) => void

// Constants for async processing
const CANCELLED_ERROR_MESSAGE = 'Processing cancelled'

// Helper function to format progress messages
function formatProgress(type: string, processed: number, total: number): string {
  return `Processing ${type}: ${processed.toLocaleString()} / ${total.toLocaleString()}`
}

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

export function toVisData(input: any): VisData {
  if (isOidSeeExport(input)) {
    const exp = input as OidSeeExport

    const visNodes = exp.nodes.map((n) => {
      try {
        const riskBoost = typeof n.risk?.score === 'number' ? Math.min(30, Math.max(0, n.risk.score)) : 0
        const value = 10 + riskBoost / 2

        const isHigh = (n.risk?.level === 'high' || n.risk?.level === 'critical') && (n.risk?.score ?? 0) >= 70
        const isGroup = n.type === 'Group'

        return {
          id: n.id,
          label: n.displayName || n.id, // Fallback to ID if no display name
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
        console.warn('Error mapping node:', n.id, e)
        // Return minimal node if mapping fails
        return {
          id: n.id,
          label: n.displayName || n.id,
          group: n.type || 'Unknown',
          value: 10,
          __oidsee: n,
        }
      }
    }).filter(Boolean) // Remove any null/undefined nodes

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
        // Minimize INSTANCE_OF edge clickable area to prevent interference with node clicks
        // selectionWidth: 0 makes the edge line non-clickable, but labels remain selectable
        // hoverWidth: 0 disables hover highlighting to further reduce interaction area
        ...(isInstance && { 
          selectionWidth: 0,
          hoverWidth: 0,
        }),
      }
    })

    return { nodes: visNodes, edges: visEdges }
  }

  if (input && typeof input === 'object' && Array.isArray((input as any).nodes) && Array.isArray((input as any).edges)) {
    return { nodes: (input as any).nodes, edges: (input as any).edges }
  }

  throw new Error('Unsupported JSON format. Expected an OID-See export (format.name="oidsee-graph") or a {nodes, edges} object.')
}

/**
 * Async version of toVisData that processes nodes/edges in batches to avoid blocking UI
 * @param input The OID-See export data
 * @param onProgress Optional callback to report progress updates
 * @param signal Optional AbortSignal to cancel processing
 */
export async function toVisDataAsync(input: any, onProgress?: ProgressCallback, signal?: AbortSignal): Promise<VisData> {
  if (isOidSeeExport(input)) {
    const exp = input as OidSeeExport
    
    // Adaptive batch sizing based on dataset size for optimal performance
    // Small datasets: Larger batches, minimal yielding (fast)
    // Medium datasets: Moderate batches, balanced yielding
    // Large datasets: Smaller batches, frequent yielding (responsive)
    // Very large datasets: Very small batches, very frequent yielding (maximum responsiveness)
    const totalItems = exp.nodes.length + (exp.edges?.length || 0)
    let BATCH_SIZE: number
    let YIELD_DELAY_MS: number
    
    if (totalItems < 1000) {
      // Small datasets: process quickly without much overhead
      BATCH_SIZE = 500
      YIELD_DELAY_MS = 1
    } else if (totalItems < 5000) {
      // Medium datasets: balance speed and responsiveness
      BATCH_SIZE = 250
      YIELD_DELAY_MS = 5
    } else if (totalItems < 15000) {
      // Large datasets: prioritize responsiveness
      BATCH_SIZE = 150
      YIELD_DELAY_MS = 8
    } else {
      // Very large datasets (15k+ items): maximum responsiveness
      // For 29k nodes: 193 yields with 1.93s overhead
      BATCH_SIZE = 100
      YIELD_DELAY_MS = 10
    }
    
    // Throttle progress updates to avoid excessive re-renders
    // Update UI at most every 150ms to balance feedback and performance
    const PROGRESS_UPDATE_INTERVAL_MS = 150

    console.log('[toVisData] 🔄 Processing nodes in batches...', {
      totalNodes: exp.nodes.length,
      totalEdges: exp.edges.length,
      batchSize: BATCH_SIZE,
      yieldDelay: YIELD_DELAY_MS
    })
    const visNodes: any[] = []
    let lastProgressUpdate: number = 0
    
    // Process nodes in batches
    for (let i = 0; i < exp.nodes.length; i += BATCH_SIZE) {
      // Check for cancellation
      if (signal?.aborted) {
        console.log('[toVisData] ⚠️ Processing cancelled by user')
        throw new Error(CANCELLED_ERROR_MESSAGE)
      }
      
      const batch = exp.nodes.slice(i, Math.min(i + BATCH_SIZE, exp.nodes.length))
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(exp.nodes.length / BATCH_SIZE)
      const processed = i + batch.length
      console.log(`[toVisData] 📦 Processing node batch ${batchNum}/${totalBatches} (${i + 1}-${processed})`)
      
      // Report progress to UI (throttled to avoid excessive re-renders)
      const now = Date.now()
      if (onProgress && (now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL_MS || processed === exp.nodes.length)) {
        onProgress(formatProgress('nodes', processed, exp.nodes.length))
        lastProgressUpdate = now
      }
      
      for (const n of batch) {
        try {
          const riskBoost = typeof n.risk?.score === 'number' ? Math.min(30, Math.max(0, n.risk.score)) : 0
          const value = 10 + riskBoost / 2

          const isHigh = (n.risk?.level === 'high' || n.risk?.level === 'critical') && (n.risk?.score ?? 0) >= 70
          const isGroup = n.type === 'Group'

          visNodes.push({
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
          })
        } catch (e) {
          console.warn('Error mapping node:', n.id, e)
          visNodes.push({
            id: n.id,
            label: n.displayName || n.id,
            group: n.type || 'Unknown',
            value: 10,
            __oidsee: n,
          })
        }
      }
      
      // Yield to event loop every batch with a longer delay
      await new Promise(resolve => setTimeout(resolve, YIELD_DELAY_MS))
    }

    console.log('[toVisData] 🔗 Processing edges in batches...')
    const visEdges: any[] = []
    // Reset timestamp for edges - subtract interval to ensure first update happens immediately
    lastProgressUpdate = Date.now() - PROGRESS_UPDATE_INTERVAL_MS
    
    // Process edges in batches
    for (let i = 0; i < exp.edges.length; i += BATCH_SIZE) {
      // Check for cancellation
      if (signal?.aborted) {
        console.log('[toVisData] ⚠️ Processing cancelled by user')
        throw new Error(CANCELLED_ERROR_MESSAGE)
      }
      
      const batch = exp.edges.slice(i, Math.min(i + BATCH_SIZE, exp.edges.length))
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(exp.edges.length / BATCH_SIZE)
      const processed = i + batch.length
      console.log(`[toVisData] 🔗 Processing edge batch ${batchNum}/${totalBatches} (${i + 1}-${processed})`)
      
      // Report progress to UI (throttled to avoid excessive re-renders)
      const now = Date.now()
      if (onProgress && (now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL_MS || processed === exp.edges.length)) {
        onProgress(formatProgress('edges', processed, exp.edges.length))
        lastProgressUpdate = now
      }
      
      for (const e of batch) {
        const label = e.type
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

        visEdges.push({
          id: e.id,
          from: e.from,
          to: e.to,
          label,
          arrows: 'to',
          dashes: isDerived || isInstance,
          width: isDerived ? 3 : isTooManyScopes ? 2.5 : 1.5,
          color,
          __oidsee: e,
          ...(isInstance && { 
            selectionWidth: 0,
            hoverWidth: 0,
          }),
        })
      }
      
      // Yield to event loop every batch with a longer delay
      await new Promise(resolve => setTimeout(resolve, YIELD_DELAY_MS))
    }

    console.log('[toVisData] ✅ Conversion complete:', {
      nodes: visNodes.length,
      edges: visEdges.length
    })

    return { nodes: visNodes, edges: visEdges }
  }

  if (input && typeof input === 'object' && Array.isArray((input as any).nodes) && Array.isArray((input as any).edges)) {
    return { nodes: (input as any).nodes, edges: (input as any).edges }
  }

  throw new Error('Unsupported JSON format. Expected an OID-See export (format.name="oidsee-graph") or a {nodes, edges} object.')
}

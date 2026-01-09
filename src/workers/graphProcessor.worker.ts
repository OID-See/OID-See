/**
 * Graph Processor Worker - Handles graph truncation and vis-network conversion off the main thread
 * Prevents UI blocking when processing large datasets (26k+ nodes)
 * 
 * Note: Does not include ctxRenderer functions as they cannot be transferred via postMessage.
 * The main thread will need to add these after receiving the data.
 */

import { WorkerMessage, ProgressMessage, CompleteMessage, ErrorMessage } from './types'
import { OidSeeExport, OidSeeNode, OidSeeEdge } from '../adapters/types'

// We need to reimplement toVisDataAsync here without ctxRenderer
// since function references can't be transferred via postMessage

// Constants for async processing
const CANCELLED_ERROR_MESSAGE = 'Processing cancelled'
const BATCH_SIZE = 250
const YIELD_DELAY_MS = 10
const PROGRESS_UPDATE_INTERVAL_MS = 100

// Helper function to format progress messages
function formatProgress(type: string, processed: number, total: number): string {
  return `Processing ${type}: ${processed.toLocaleString()} / ${total.toLocaleString()}`
}

/**
 * Convert OidSee data to vis-network format (worker version without ctxRenderer)
 */
async function toVisDataAsyncWorker(
  input: OidSeeExport,
  onProgress: (message: string) => void,
  signal?: AbortSignal
): Promise<{ nodes: any[], edges: any[] }> {
  console.log('[toVisData Worker] 📊 Starting conversion...')
  console.log('[toVisData Worker] 🔢 Nodes:', input.nodes.length.toLocaleString())
  console.log('[toVisData Worker] 🔗 Edges:', (input.edges || []).length.toLocaleString())
  
  const visNodes: any[] = []
  let lastProgressUpdate = Date.now() - PROGRESS_UPDATE_INTERVAL_MS
  
  // Process nodes in batches
  for (let i = 0; i < input.nodes.length; i += BATCH_SIZE) {
    // Check for cancellation
    if (signal?.aborted) {
      console.log('[toVisData Worker] ⚠️ Processing cancelled')
      throw new Error(CANCELLED_ERROR_MESSAGE)
    }
    
    const batch = input.nodes.slice(i, Math.min(i + BATCH_SIZE, input.nodes.length))
    const processed = i + batch.length
    console.log(`[toVisData Worker] 📊 Processing node batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(input.nodes.length / BATCH_SIZE)}`)
    
    // Report progress
    const now = Date.now()
    if (onProgress && (now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL_MS || processed === input.nodes.length)) {
      onProgress(formatProgress('nodes', processed, input.nodes.length))
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
          // Note: ctxRenderer cannot be set here as functions don't transfer via postMessage
          // Main thread will need to add this property for Group nodes
          __isGroup: isGroup, // Flag for main thread to know which nodes need ctxRenderer
          color: isHigh ? {
            border: 'rgba(255,107,107,0.95)',
            background: 'rgba(255,107,107,0.20)',
            highlight: { background: 'rgba(255,107,107,0.30)', border: 'rgba(255,107,107,1.0)' },
          } : undefined,
        })
      } catch (e) {
        console.warn('[toVisData Worker] Error mapping node:', n.id, e)
        visNodes.push({
          id: n.id,
          label: n.displayName || n.id,
          group: n.type || 'Unknown',
          value: 10,
          __oidsee: n,
        })
      }
    }
    
    // Yield to event loop
    await new Promise(resolve => setTimeout(resolve, YIELD_DELAY_MS))
  }
  
  console.log('[toVisData Worker] 🔗 Processing edges in batches...')
  const visEdges: any[] = []
  lastProgressUpdate = Date.now() - PROGRESS_UPDATE_INTERVAL_MS
  
  // Process edges in batches
  for (let i = 0; i < (input.edges || []).length; i += BATCH_SIZE) {
    // Check for cancellation
    if (signal?.aborted) {
      console.log('[toVisData Worker] ⚠️ Processing cancelled')
      throw new Error(CANCELLED_ERROR_MESSAGE)
    }
    
    const batch = (input.edges || []).slice(i, Math.min(i + BATCH_SIZE, (input.edges || []).length))
    const processed = i + batch.length
    console.log(`[toVisData Worker] 🔗 Processing edge batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil((input.edges || []).length / BATCH_SIZE)}`)
    
    // Report progress
    const now = Date.now()
    if (onProgress && (now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL_MS || processed === (input.edges || []).length)) {
      onProgress(formatProgress('edges', processed, (input.edges || []).length))
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
    
    // Yield to event loop
    await new Promise(resolve => setTimeout(resolve, YIELD_DELAY_MS))
  }
  
  console.log('[toVisData Worker] ✅ Conversion complete:', {
    nodes: visNodes.length.toLocaleString(),
    edges: visEdges.length.toLocaleString()
  })
  
  return { nodes: visNodes, edges: visEdges }
}

// Task types this worker can handle
type GraphProcessorTaskType = 'processGraph'

interface ProcessGraphPayload {
  parsed: OidSeeExport
  maxNodes: number
  maxEdges: number
  needsTruncation: boolean
}

// Active cancellation tokens
const cancellationTokens = new Set<string>()

/**
 * Check if task is cancelled
 */
function isCancelled(taskId: string): boolean {
  return cancellationTokens.has(taskId)
}

/**
 * Send progress update to main thread
 */
function sendProgress(taskId: string, stage: string, progress: number, message: string): void {
  const progressMsg: ProgressMessage = {
    type: 'progress',
    id: taskId,
    payload: { stage, progress, message }
  }
  self.postMessage(progressMsg)
}

/**
 * Send completion message to main thread
 */
function sendComplete<T>(taskId: string, result: T): void {
  const completeMsg: CompleteMessage<T> = {
    type: 'complete',
    id: taskId,
    payload: result
  }
  self.postMessage(completeMsg)
}

/**
 * Send error message to main thread
 */
function sendError(taskId: string, error: Error): void {
  const errorMsg: ErrorMessage = {
    type: 'error',
    id: taskId,
    payload: {
      message: error.message,
      stack: error.stack
    }
  }
  self.postMessage(errorMsg)
}

/**
 * Process graph data: truncate if needed and convert to vis-network format
 */
async function processGraph(taskId: string, payload: ProcessGraphPayload): Promise<void> {
  try {
    const { parsed, maxNodes, maxEdges, needsTruncation } = payload
    
    sendProgress(taskId, 'start', 0, 'Starting graph processing...')
    
    let graphParsed = parsed
    
    if (needsTruncation) {
      sendProgress(taskId, 'truncate', 10, 'Truncating graph data...')
      
      if (isCancelled(taskId)) {
        throw new Error('Processing cancelled')
      }
      
      // Clone to avoid mutating original
      graphParsed = { 
        ...parsed, 
        nodes: [...parsed.nodes], 
        edges: [...(parsed.edges || [])] 
      }
      
      sendProgress(taskId, 'truncate', 20, 'Creating index array for sorting...')
      
      // Create indices array for sorting
      const indices = Array.from({ length: graphParsed.nodes.length }, (_, i) => i)
      
      if (isCancelled(taskId)) {
        throw new Error('Processing cancelled')
      }
      
      sendProgress(taskId, 'truncate', 30, `Sorting ${graphParsed.nodes.length.toLocaleString()} nodes by risk score...`)
      
      // Sort indices by risk score (highest first)
      indices.sort((aIdx, bIdx) => {
        const a = graphParsed.nodes[aIdx]
        const b = graphParsed.nodes[bIdx]
        const scoreA = a?.risk?.score ?? 0
        const scoreB = b?.risk?.score ?? 0
        return scoreB - scoreA
      })
      
      if (isCancelled(taskId)) {
        throw new Error('Processing cancelled')
      }
      
      sendProgress(taskId, 'truncate', 50, `Selecting top ${maxNodes.toLocaleString()} highest-risk nodes...`)
      
      // Take top N highest-risk nodes
      const truncatedNodes = indices.slice(0, maxNodes).map(i => graphParsed.nodes[i])
      const nodeIds = new Set(truncatedNodes.map((n: OidSeeNode) => n.id))
      
      if (isCancelled(taskId)) {
        throw new Error('Processing cancelled')
      }
      
      sendProgress(taskId, 'truncate', 60, 'Filtering edges...')
      
      // Filter edges to only include those between truncated nodes
      const truncatedEdges = (graphParsed.edges || [])
        .filter((e: OidSeeEdge) => nodeIds.has(e.from) && nodeIds.has(e.to))
        .slice(0, maxEdges)
      
      graphParsed.nodes = truncatedNodes
      graphParsed.edges = truncatedEdges
      
      sendProgress(taskId, 'truncate', 70, `Truncation complete: ${truncatedNodes.length.toLocaleString()} nodes, ${truncatedEdges.length.toLocaleString()} edges`)
    }
    
    if (isCancelled(taskId)) {
      throw new Error('Processing cancelled')
    }
    
    sendProgress(taskId, 'convert', 75, 'Converting to vis-network format...')
    
    // Convert to vis-network format using our worker implementation
    // Create an AbortController for cancellation
    const abortController = new AbortController()
    
    // Check for cancellation periodically
    const checkCancellation = setInterval(() => {
      if (isCancelled(taskId)) {
        abortController.abort()
        clearInterval(checkCancellation)
      }
    }, 100)
    
    try {
      const vis = await toVisDataAsyncWorker(
        graphParsed, 
        (progressMsg) => {
          // Forward progress messages
          sendProgress(taskId, 'convert', 75, progressMsg)
        },
        abortController.signal
      )
      
      clearInterval(checkCancellation)
      
      if (isCancelled(taskId)) {
        throw new Error('Processing cancelled')
      }
      
      sendProgress(taskId, 'convert', 95, `Conversion complete: ${vis.nodes.length.toLocaleString()} nodes, ${vis.edges.length.toLocaleString()} edges`)
      
      // Send the complete result
      sendComplete(taskId, {
        visData: vis,
        wasTruncated: needsTruncation,
        nodeCount: vis.nodes.length,
        edgeCount: vis.edges.length
      })
    } catch (error) {
      clearInterval(checkCancellation)
      throw error
    }
    
  } catch (error: any) {
    if (error.message === 'Processing cancelled') {
      console.log('[GraphProcessor Worker] Task cancelled:', taskId)
      cancellationTokens.delete(taskId)
    }
    sendError(taskId, error)
  }
}

/**
 * Handle incoming messages from main thread
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data
  
  switch (message.type) {
    case 'execute':
      {
        const taskId = message.id
        const payload = message.payload as any
        
        if (payload.taskType === 'processGraph') {
          await processGraph(taskId, payload as ProcessGraphPayload)
        } else {
          sendError(taskId, new Error(`Unknown task type: ${payload.taskType}`))
        }
      }
      break
      
    case 'cancel':
      {
        const taskId = message.id
        console.log('[GraphProcessor Worker] Cancelling task:', taskId)
        cancellationTokens.add(taskId)
      }
      break
      
    default:
      console.warn('[GraphProcessor Worker] Unknown message type:', message.type)
  }
}

// Signal that worker is ready
console.log('[GraphProcessor Worker] Initialized and ready')

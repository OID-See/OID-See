/**
 * Filter Worker - Handles filtering operations (applyQuery) off the main thread
 * Supports incremental processing and cancellation
 */

import { WorkerMessage, ProgressMessage, CompleteMessage, ErrorMessage } from './types'
import { parseQuery, evalClause, Clause, Target } from '../filters/query'

// Task types this worker can handle
type FilterTaskType = 'applyQuery'

interface ApplyQueryPayload {
  nodes: any[]
  edges: any[]
  query: string
  lens: 'full' | 'risk' | 'structure'
  pathAware: boolean
}

interface FilterResult {
  nodes: any[]
  edges: any[]
  parsed: {
    clauses: Clause[]
    errors: string[]
  }
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
 * Check if edge type is allowed in the given lens
 */
function lensEdgeAllowed(lens: 'full' | 'risk' | 'structure', edgeType: string): boolean {
  if (lens === 'full') return true

  if (lens === 'risk') {
    const allow = new Set([
      'HAS_SCOPE',
      'HAS_SCOPES',
      'HAS_TOO_MANY_SCOPES',
      'HAS_PRIVILEGED_SCOPES',
      'HAS_OFFLINE_ACCESS',
      'HAS_ROLE',
      'HAS_APP_ROLE',
      'CAN_IMPERSONATE',
      'EFFECTIVE_IMPERSONATION_PATH',
      'PERSISTENCE_PATH',
      'ASSIGNED_TO',
    ])
    return allow.has(edgeType)
  }

  const allow = new Set(['INSTANCE_OF', 'MEMBER_OF', 'OWNS', 'GOVERNS', 'ASSIGNED_TO'])
  return allow.has(edgeType)
}

/**
 * Apply query filter to graph data
 * This is the worker version of the applyQuery function from App.tsx
 */
async function applyQuery(
  taskId: string,
  payload: ApplyQueryPayload
): Promise<FilterResult> {
  const { nodes, edges, query, lens, pathAware } = payload
  
  console.log('[FilterWorker] Starting filter operation:', {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    query,
    lens,
    pathAware
  })
  
  const filterStartTime = performance.now()
  
  // Parse query
  sendProgress(taskId, 'parsing', 5, 'Parsing query...')
  const parsed = parseQuery(query)
  const clauses = parsed.clauses

  const nodeClauses = clauses.filter((c) => c.target === 'node' || c.target === 'both')
  const edgeClauses = clauses.filter((c) => c.target === 'edge' || c.target === 'both')

  // Step 1: Filter nodes
  sendProgress(taskId, 'filtering_nodes', 10, `Filtering ${nodes.length.toLocaleString()} nodes...`)
  
  const step1StartTime = performance.now()
  const nodePass = new Set<string>()
  
  // Process nodes in batches to allow cancellation
  const NODE_BATCH_SIZE = 1000
  let processedNodes = 0
  
  if (nodeClauses.length > 0) {
    for (let i = 0; i < nodes.length; i += NODE_BATCH_SIZE) {
      // Check cancellation
      if (isCancelled(taskId)) {
        throw new Error('Task cancelled')
      }
      
      const batch = nodes.slice(i, Math.min(i + NODE_BATCH_SIZE, nodes.length))
      
      for (const n of batch) {
        const raw = n.__oidsee ?? n
        const ok = nodeClauses.every((c) => evalClause(raw, c))
        if (ok) nodePass.add(n.id)
      }
      
      processedNodes += batch.length
      
      // Report progress periodically
      if (processedNodes % (NODE_BATCH_SIZE * 5) === 0 || processedNodes === nodes.length) {
        const progress = 10 + Math.floor((processedNodes / nodes.length) * 30)
        sendProgress(
          taskId, 
          'filtering_nodes', 
          progress, 
          `Filtered ${processedNodes.toLocaleString()} / ${nodes.length.toLocaleString()} nodes`
        )
      }
      
      // Yield to allow cancellation checks
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  } else {
    // No node filters, include all nodes
    for (const n of nodes) {
      nodePass.add(n.id)
    }
  }
  
  const step1Duration = performance.now() - step1StartTime
  console.log('[FilterWorker] Node filtering complete:', {
    duration: `${step1Duration.toFixed(0)}ms`,
    passedNodes: nodePass.size
  })
  
  sendProgress(taskId, 'filtering_nodes', 40, `Node filtering complete (${nodePass.size} nodes passed)`)

  // Build edge index
  const edgeById = new Map<string, any>()
  for (const e of edges) edgeById.set(e.id, e)

  // Step 2: Filter edges
  sendProgress(taskId, 'filtering_edges', 45, `Filtering ${edges.length.toLocaleString()} edges...`)
  
  const step2StartTime = performance.now()
  const edgesOut: any[] = []
  const edgesKept = new Set<string>()
  
  // Process edges in batches
  const EDGE_BATCH_SIZE = 1000
  let processedEdges = 0

  for (let i = 0; i < edges.length; i += EDGE_BATCH_SIZE) {
    // Check cancellation
    if (isCancelled(taskId)) {
      throw new Error('Task cancelled')
    }
    
    const batch = edges.slice(i, Math.min(i + EDGE_BATCH_SIZE, edges.length))
    
    for (const e of batch) {
      const raw = e.__oidsee ?? e
      const edgeType = raw.type ?? e.label ?? ''
      
      // Check lens filtering
      if (!lensEdgeAllowed(lens, edgeType)) continue

      // Check edge clauses
      const ok = edgeClauses.every((c) => evalClause(raw, c))
      if (!ok) continue

      // Check if both endpoints pass explicit node filter clauses
      if (!nodePass.has(e.from) || !nodePass.has(e.to)) continue

      if (!edgesKept.has(e.id)) {
        edgesOut.push(e)
        edgesKept.add(e.id)
      }

      // Handle path-aware mode: include input edges for derived edges
      if (pathAware && raw?.derived?.isDerived && Array.isArray(raw.derived.inputs)) {
        for (const id of raw.derived.inputs) {
          const inp = edgeById.get(id)
          if (inp && !edgesKept.has(inp.id)) {
            const inpRaw = inp.__oidsee ?? inp
            const inpType = inpRaw.type ?? inp.label ?? ''
            if (nodePass.has(inp.from) && nodePass.has(inp.to) && lensEdgeAllowed(lens, inpType)) {
              edgesOut.push(inp)
              edgesKept.add(inp.id)
            }
          }
        }
      }
    }
    
    processedEdges += batch.length
    
    // Report progress periodically
    if (processedEdges % (EDGE_BATCH_SIZE * 5) === 0 || processedEdges === edges.length) {
      const progress = 45 + Math.floor((processedEdges / edges.length) * 30)
      sendProgress(
        taskId,
        'filtering_edges',
        progress,
        `Filtered ${processedEdges.toLocaleString()} / ${edges.length.toLocaleString()} edges`
      )
    }
    
    // Yield to allow cancellation checks
    await new Promise(resolve => setTimeout(resolve, 0))
  }
  
  const step2Duration = performance.now() - step2StartTime
  console.log('[FilterWorker] Edge filtering complete:', {
    duration: `${step2Duration.toFixed(0)}ms`,
    keptEdges: edgesOut.length
  })
  
  sendProgress(taskId, 'filtering_edges', 75, `Edge filtering complete (${edgesOut.length} edges kept)`)

  // Step 3: Determine final nodes
  sendProgress(taskId, 'finalizing', 80, 'Finalizing node set...')
  
  const step3StartTime = performance.now()
  const nodesWithEdges = new Set<string>()
  for (const e of edgesOut) {
    nodesWithEdges.add(e.from)
    nodesWithEdges.add(e.to)
  }

  const nodesOut = nodes.filter((n) => {
    if (!nodePass.has(n.id)) return false
    if (lens === 'full') return true
    return nodesWithEdges.has(n.id)
  })
  
  const step3Duration = performance.now() - step3StartTime
  console.log('[FilterWorker] Final nodes determined:', {
    duration: `${step3Duration.toFixed(0)}ms`,
    finalNodes: nodesOut.length
  })
  
  const totalDuration = performance.now() - filterStartTime
  console.log('[FilterWorker] Filter complete:', {
    totalDuration: `${totalDuration.toFixed(0)}ms`,
    result: { nodes: nodesOut.length, edges: edgesOut.length }
  })
  
  sendProgress(taskId, 'complete', 100, `Filter complete (${nodesOut.length} nodes, ${edgesOut.length} edges)`)

  return {
    nodes: nodesOut,
    edges: edgesOut,
    parsed
  }
}

/**
 * Handle incoming messages from main thread
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data
  const taskId = message.id

  try {
    if (message.type === 'execute') {
      const { taskType, data } = message.payload
      
      let result: any
      
      switch (taskType as FilterTaskType) {
        case 'applyQuery':
          result = await applyQuery(taskId, data as ApplyQueryPayload)
          break
        default:
          throw new Error(`Unknown task type: ${taskType}`)
      }

      // Remove cancellation token
      cancellationTokens.delete(taskId)
      
      // Send result
      sendComplete(taskId, result)
      
    } else if (message.type === 'cancel') {
      // Mark task as cancelled
      cancellationTokens.add(taskId)
      console.log('[FilterWorker] Task cancelled:', taskId)
    }
  } catch (error) {
    // Remove cancellation token
    cancellationTokens.delete(taskId)
    
    // Send error
    if (error instanceof Error) {
      sendError(taskId, error)
    } else {
      sendError(taskId, new Error(String(error)))
    }
  }
}

// Log worker initialization
console.log('[FilterWorker] Worker initialized')

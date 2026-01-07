/**
 * Layout Worker - Handles layout computation off the main thread
 * Delegates to ClusteringLayout for actual computation
 */

import { WorkerMessage, ProgressMessage, CompleteMessage, ErrorMessage } from './types'
import { ClusteringLayoutEngine, ClusterOptions, NodePosition } from '../adapters/ClusteringLayout'
import { OidSeeNode } from '../adapters/types'

// Task types this worker can handle
type LayoutTaskType = 'computeLayout'

interface ComputeLayoutPayload {
  nodes: OidSeeNode[]
  options: ClusterOptions
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
 * Compute layout for nodes
 */
async function computeLayout(
  taskId: string,
  payload: ComputeLayoutPayload
): Promise<NodePosition[]> {
  const { nodes, options } = payload
  
  console.log('[LayoutWorker] Starting layout computation:', {
    nodeCount: nodes.length,
    options
  })
  
  const startTime = performance.now()
  
  // Stage 1: Indexing
  sendProgress(taskId, 'indexing', 10, 'Indexing nodes...')
  
  // Check cancellation
  if (isCancelled(taskId)) {
    throw new Error('Task cancelled')
  }
  
  // Stage 2: Clustering
  sendProgress(taskId, 'clustering', 20, 'Creating clusters...')
  
  // Create layout engine
  const engine = new ClusteringLayoutEngine()
  
  // Compute layout with progress tracking
  // The ClusteringLayoutEngine already has progress logging, we'll just track overall progress
  const positions = await engine.computeInitialLayout(nodes, options)
  
  // Check cancellation
  if (isCancelled(taskId)) {
    throw new Error('Task cancelled')
  }
  
  const duration = performance.now() - startTime
  console.log('[LayoutWorker] Layout computation complete:', {
    duration: `${duration.toFixed(0)}ms`,
    positions: positions.length
  })
  
  sendProgress(taskId, 'complete', 100, `Layout complete (${positions.length} positions)`)
  
  return positions
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
      
      switch (taskType as LayoutTaskType) {
        case 'computeLayout':
          result = await computeLayout(taskId, data as ComputeLayoutPayload)
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
      console.log('[LayoutWorker] Task cancelled:', taskId)
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
console.log('[LayoutWorker] Worker initialized')

/**
 * Analytics Worker - Handles risk computation and aggregation analysis off the main thread
 * Supports progress tracking and cancellation
 */

import { WorkerMessage, ProgressMessage, CompleteMessage, ErrorMessage } from './types'
import { OidSeeNode, OidSeeEdge } from '../adapters/types'

// Task types this worker can handle
type AnalyticsTaskType = 'computeStatistics' | 'computeRiskDistribution' | 'analyzeGraph'

interface ComputeStatisticsPayload {
  nodes: OidSeeNode[]
  edges: OidSeeEdge[]
}

interface Statistics {
  totalNodes: number
  totalEdges: number
  nodesByType: Record<string, number>
  edgesByType: Record<string, number>
  riskDistribution: Record<string, number>
  topRiskyNodes: OidSeeNode[]
  avgRiskScore: number
  highRiskNodes: number
  criticalRiskNodes: number
  tierExposure: {
    tier0Count: number
    tier1Count: number
    tier2Count: number
    spWithTier0: number
    spWithTier1: number
    spWithTier2: number
    totalTier0Roles: number
    totalTier1Roles: number
    totalTier2Roles: number
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
 * Compute comprehensive statistics for nodes and edges
 */
async function computeStatistics(
  taskId: string,
  payload: ComputeStatisticsPayload
): Promise<Statistics> {
  const { nodes, edges } = payload
  
  console.log('[AnalyticsWorker] Starting statistics computation:', {
    nodeCount: nodes.length,
    edgeCount: edges.length
  })
  
  const startTime = performance.now()
  
  // Stage 1: Count nodes by type
  sendProgress(taskId, 'indexing', 10, 'Analyzing node types...')
  
  const nodesByType: Record<string, number> = {}
  const BATCH_SIZE = 1000
  
  for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
    if (isCancelled(taskId)) {
      throw new Error('Task cancelled')
    }
    
    const batch = nodes.slice(i, Math.min(i + BATCH_SIZE, nodes.length))
    for (const node of batch) {
      nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1
    }
    
    if (i % (BATCH_SIZE * 5) === 0) {
      const progress = 10 + Math.floor((i / nodes.length) * 15)
      sendProgress(taskId, 'indexing', progress, `Analyzed ${i.toLocaleString()} / ${nodes.length.toLocaleString()} nodes`)
    }
    
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  // Stage 2: Count edges by type
  sendProgress(taskId, 'indexing', 25, 'Analyzing edge types...')
  
  const edgesByType: Record<string, number> = {}
  
  for (let i = 0; i < edges.length; i += BATCH_SIZE) {
    if (isCancelled(taskId)) {
      throw new Error('Task cancelled')
    }
    
    const batch = edges.slice(i, Math.min(i + BATCH_SIZE, edges.length))
    for (const edge of batch) {
      edgesByType[edge.type] = (edgesByType[edge.type] ?? 0) + 1
    }
    
    if (i % (BATCH_SIZE * 5) === 0) {
      const progress = 25 + Math.floor((i / edges.length) * 15)
      sendProgress(taskId, 'indexing', progress, `Analyzed ${i.toLocaleString()} / ${edges.length.toLocaleString()} edges`)
    }
    
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  // Stage 3: Compute risk distribution
  sendProgress(taskId, 'scoring', 40, 'Computing risk distribution...')
  
  const riskDistribution: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    none: 0,
  }

  let totalRisk = 0
  let riskCount = 0
  let highRiskNodes = 0
  let criticalRiskNodes = 0

  for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
    if (isCancelled(taskId)) {
      throw new Error('Task cancelled')
    }
    
    const batch = nodes.slice(i, Math.min(i + BATCH_SIZE, nodes.length))
    
    for (const node of batch) {
      const score = node.risk?.score ?? 0
      if (score >= 70) {
        riskDistribution.critical++
        criticalRiskNodes++
        highRiskNodes++
      } else if (score >= 40) {
        riskDistribution.high++
        highRiskNodes++
      } else if (score >= 20) {
        riskDistribution.medium++
      } else if (score > 0) {
        riskDistribution.low++
      } else {
        riskDistribution.none++
      }

      if (score > 0) {
        totalRisk += score
        riskCount++
      }
    }
    
    if (i % (BATCH_SIZE * 5) === 0) {
      const progress = 40 + Math.floor((i / nodes.length) * 20)
      sendProgress(taskId, 'scoring', progress, `Scored ${i.toLocaleString()} / ${nodes.length.toLocaleString()} nodes`)
    }
    
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  const avgRiskScore = riskCount > 0 ? totalRisk / riskCount : 0

  // Stage 4: Find top risky nodes
  sendProgress(taskId, 'ranking', 60, 'Ranking risky nodes...')
  
  const topRiskyNodes = [...nodes]
    .filter(n => (n.risk?.score ?? 0) > 0)
    .sort((a, b) => (b.risk?.score ?? 0) - (a.risk?.score ?? 0))
    .slice(0, 10)

  // Stage 5: Compute tier exposure
  sendProgress(taskId, 'aggregating', 70, 'Computing tier exposure...')
  
  const tierExposure = {
    tier0Count: 0,
    tier1Count: 0,
    tier2Count: 0,
    spWithTier0: 0,
    spWithTier1: 0,
    spWithTier2: 0,
    totalTier0Roles: 0,
    totalTier1Roles: 0,
    totalTier2Roles: 0,
  }

  // Count role nodes by tier
  for (const node of nodes) {
    if (node.type === 'Role') {
      const tier = node.properties?.tier
      if (tier === 'tier0') tierExposure.totalTier0Roles++
      else if (tier === 'tier1') tierExposure.totalTier1Roles++
      else if (tier === 'tier2') tierExposure.totalTier2Roles++
    }
  }

  // Build node ID to node map for edge analysis
  const nodeMap = new Map<string, OidSeeNode>()
  for (const node of nodes) {
    nodeMap.set(node.id, node)
  }

  // Analyze edges to count service principals with tier roles
  const spWithTiers = {
    tier0: new Set<string>(),
    tier1: new Set<string>(),
    tier2: new Set<string>(),
  }

  for (let i = 0; i < edges.length; i += BATCH_SIZE) {
    if (isCancelled(taskId)) {
      throw new Error('Task cancelled')
    }
    
    const batch = edges.slice(i, Math.min(i + BATCH_SIZE, edges.length))
    
    for (const edge of batch) {
      if (edge.type === 'HAS_ROLE' || edge.type === 'HAS_APP_ROLE') {
        const fromNode = nodeMap.get(edge.from)
        const toNode = nodeMap.get(edge.to)
        
        if (fromNode?.type === 'ServicePrincipal' && toNode?.type === 'Role') {
          const tier = toNode.properties?.tier
          if (tier === 'tier0') spWithTiers.tier0.add(fromNode.id)
          else if (tier === 'tier1') spWithTiers.tier1.add(fromNode.id)
          else if (tier === 'tier2') spWithTiers.tier2.add(fromNode.id)
        }
      }
    }
    
    if (i % (BATCH_SIZE * 5) === 0) {
      const progress = 70 + Math.floor((i / edges.length) * 20)
      sendProgress(taskId, 'aggregating', progress, `Analyzed ${i.toLocaleString()} / ${edges.length.toLocaleString()} edges`)
    }
    
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  tierExposure.spWithTier0 = spWithTiers.tier0.size
  tierExposure.spWithTier1 = spWithTiers.tier1.size
  tierExposure.spWithTier2 = spWithTiers.tier2.size
  
  // Count nodes in each tier
  tierExposure.tier0Count = spWithTiers.tier0.size
  tierExposure.tier1Count = spWithTiers.tier1.size
  tierExposure.tier2Count = spWithTiers.tier2.size

  const duration = performance.now() - startTime
  console.log('[AnalyticsWorker] Statistics computation complete:', {
    duration: `${duration.toFixed(0)}ms`
  })
  
  sendProgress(taskId, 'complete', 100, 'Statistics complete')

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    nodesByType,
    edgesByType,
    riskDistribution,
    topRiskyNodes,
    avgRiskScore,
    highRiskNodes,
    criticalRiskNodes,
    tierExposure
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
      
      switch (taskType as AnalyticsTaskType) {
        case 'computeStatistics':
          result = await computeStatistics(taskId, data as ComputeStatisticsPayload)
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
      console.log('[AnalyticsWorker] Task cancelled:', taskId)
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
console.log('[AnalyticsWorker] Worker initialized')

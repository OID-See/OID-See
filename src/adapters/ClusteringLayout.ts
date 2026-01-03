/**
 * Clustering-based layout engine for efficient initial positioning of large graphs
 * Groups nodes by type and risk level, then distributes them spatially
 */

import { OidSeeNode } from './types'

export interface NodePosition {
  id: string
  x: number
  y: number
}

export interface Cluster {
  id: string
  nodeIds: string[]
  centerX: number
  centerY: number
  radius: number
  riskScore: number
  type: string
}

export interface ClusterOptions {
  maxClusterSize: number
  groupBy: string[] // e.g., ['type', 'riskLevel']
  canvasWidth: number
  canvasHeight: number
}

/**
 * Get risk level from risk score
 */
function getRiskLevel(score: number): string {
  if (score >= 80) return 'critical'
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  if (score >= 20) return 'low'
  return 'info'
}

/**
 * Clustering-based layout engine
 */
export class ClusteringLayoutEngine {
  /**
   * Compute initial layout for nodes using clustering
   */
  async computeInitialLayout(
    nodes: OidSeeNode[],
    options: ClusterOptions
  ): Promise<NodePosition[]> {
    console.log('[ClusteringLayout] 🎯 Starting clustering layout...', {
      nodeCount: nodes.length,
      maxClusterSize: options.maxClusterSize
    })
    const startTime = performance.now()

    // Step 1: Create clusters
    console.log('[ClusteringLayout] 📦 Creating clusters...')
    const clusters = await this.createClusters(nodes, options)
    console.log('[ClusteringLayout] ✅ Clusters created:', clusters.length)

    // Step 2: Position clusters
    console.log('[ClusteringLayout] 🎨 Positioning clusters...')
    const clusterPositions = this.positionClusters(clusters, options)
    console.log('[ClusteringLayout] ✅ Cluster positions computed')

    // Step 3: Distribute nodes within clusters
    console.log('[ClusteringLayout] 🔀 Distributing nodes within clusters...')
    const nodePositions = await this.distributeNodesInClusters(
      clusters,
      clusterPositions,
      options
    )
    console.log('[ClusteringLayout] ✅ Node positions computed')

    const totalTime = performance.now() - startTime
    console.log('[ClusteringLayout] 🎉 Layout complete:', {
      duration: `${totalTime.toFixed(0)}ms`,
      clusters: clusters.length,
      nodes: nodePositions.length
    })

    return nodePositions
  }

  /**
   * Create clusters by grouping nodes
   */
  private async createClusters(
    nodes: OidSeeNode[],
    options: ClusterOptions
  ): Promise<Cluster[]> {
    const clusters: Cluster[] = []
    
    // Group nodes by type and risk level
    const groups = new Map<string, OidSeeNode[]>()
    
    // Process nodes in batches to avoid blocking the UI
    const BATCH_SIZE = 5000
    for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
      const batch = nodes.slice(i, Math.min(i + BATCH_SIZE, nodes.length))
      
      for (const node of batch) {
        const type = node.type || 'Unknown'
        const riskScore = node.risk?.score ?? 0
        const riskLevel = getRiskLevel(riskScore)
        const groupKey = `${type}-${riskLevel}`
        
        if (!groups.has(groupKey)) {
          groups.set(groupKey, [])
        }
        groups.get(groupKey)!.push(node)
      }
      
      // Yield to event loop every batch
      if (i + BATCH_SIZE < nodes.length) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
    
    // Create clusters from groups
    let clusterId = 0
    for (const [groupKey, groupNodes] of groups) {
      // Split large groups into multiple clusters
      const numClusters = Math.ceil(groupNodes.length / options.maxClusterSize)
      const nodesPerCluster = Math.ceil(groupNodes.length / numClusters)
      
      for (let i = 0; i < numClusters; i++) {
        const start = i * nodesPerCluster
        const end = Math.min(start + nodesPerCluster, groupNodes.length)
        const clusterNodes = groupNodes.slice(start, end)
        
        // Calculate average risk score for cluster
        const avgRiskScore = clusterNodes.reduce(
          (sum, n) => sum + (n.risk?.score ?? 0),
          0
        ) / clusterNodes.length
        
        clusters.push({
          id: `cluster-${clusterId++}`,
          nodeIds: clusterNodes.map(n => n.id),
          centerX: 0,
          centerY: 0,
          radius: Math.sqrt(clusterNodes.length) * 50, // Proportional to node count
          riskScore: avgRiskScore,
          type: groupKey
        })
      }
      
      // Yield to event loop after each group
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    
    return clusters
  }

  /**
   * Position clusters using force-directed approach
   */
  private positionClusters(
    clusters: Cluster[],
    options: ClusterOptions
  ): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>()
    
    // Use a simple circular layout for cluster centers
    const centerX = options.canvasWidth / 2
    const centerY = options.canvasHeight / 2
    const radius = Math.min(options.canvasWidth, options.canvasHeight) * 0.35
    
    // Group clusters by type for better organization
    const typeGroups = new Map<string, Cluster[]>()
    for (const cluster of clusters) {
      const typeKey = cluster.type.split('-')[0] // Extract type from "type-riskLevel"
      if (!typeGroups.has(typeKey)) {
        typeGroups.set(typeKey, [])
      }
      typeGroups.get(typeKey)!.push(cluster)
    }
    
    // Distribute type groups around a circle
    const types = Array.from(typeGroups.keys())
    const angleStep = (2 * Math.PI) / types.length
    
    types.forEach((type, typeIndex) => {
      const typeClusters = typeGroups.get(type)!
      const typeAngle = typeIndex * angleStep
      const typeX = centerX + radius * Math.cos(typeAngle)
      const typeY = centerY + radius * Math.sin(typeAngle)
      
      // Arrange clusters within each type group
      if (typeClusters.length === 1) {
        positions.set(typeClusters[0].id, { x: typeX, y: typeY })
      } else {
        const subRadius = radius * 0.3
        const subAngleStep = (2 * Math.PI) / typeClusters.length
        
        typeClusters.forEach((cluster, clusterIndex) => {
          const subAngle = clusterIndex * subAngleStep
          const x = typeX + subRadius * Math.cos(subAngle)
          const y = typeY + subRadius * Math.sin(subAngle)
          positions.set(cluster.id, { x, y })
        })
      }
    })
    
    return positions
  }

  /**
   * Distribute nodes within their clusters
   */
  private async distributeNodesInClusters(
    clusters: Cluster[],
    clusterPositions: Map<string, { x: number; y: number }>,
    options: ClusterOptions
  ): Promise<NodePosition[]> {
    const nodePositions: NodePosition[] = []
    
    // Distribute nodes within each cluster using circular layout
    // Process clusters in batches to avoid blocking the UI
    const BATCH_SIZE = 50
    for (let i = 0; i < clusters.length; i += BATCH_SIZE) {
      const batchClusters = clusters.slice(i, Math.min(i + BATCH_SIZE, clusters.length))
      
      for (const cluster of batchClusters) {
        const clusterPos = clusterPositions.get(cluster.id)
        if (!clusterPos) continue
        
        const nodeIds = cluster.nodeIds
        const numNodes = nodeIds.length
        
        if (numNodes === 1) {
          // Single node at cluster center
          nodePositions.push({
            id: nodeIds[0],
            x: clusterPos.x,
            y: clusterPos.y
          })
        } else {
          // Multiple nodes arranged in a circle or grid
          const radius = cluster.radius * 0.5
          const angleStep = (2 * Math.PI) / numNodes
          
          nodeIds.forEach((nodeId, index) => {
            const angle = index * angleStep
            const x = clusterPos.x + radius * Math.cos(angle)
            const y = clusterPos.y + radius * Math.sin(angle)
            nodePositions.push({ id: nodeId, x, y })
          })
        }
      }
      
      // Yield to event loop every batch
      if (i + BATCH_SIZE < clusters.length) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
    
    return nodePositions
  }
}

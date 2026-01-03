/**
 * Virtual Graph Renderer
 * Manages viewport-based rendering of large graphs using spatial indexing
 */

import { QuadTree, Bounds, Point } from './QuadTree'
import { ClusteringLayoutEngine, NodePosition } from './ClusteringLayout'
import { OidSeeNode, OidSeeEdge } from './types'

export interface Viewport {
  x: number
  y: number
  width: number
  height: number
  scale: number
}

export interface VirtualGraph {
  allNodes: OidSeeNode[]
  allEdges: OidSeeEdge[]
  visibleNodes: OidSeeNode[]
  visibleEdges: OidSeeEdge[]
  viewport: Viewport
  nodePositions: Map<string, Point>
}

export interface VirtualGraphConfig {
  viewportBuffer: number // Multiplier for buffer zone (e.g., 1.2 = 20% buffer)
  batchSize: number // Number of nodes to process per batch
  enableClustering: boolean // Use clustering for initial layout
  canvasWidth: number
  canvasHeight: number
}

export const DEFAULT_VIRTUAL_CONFIG: VirtualGraphConfig = {
  viewportBuffer: 1.5, // 50% buffer outside viewport
  batchSize: 100,
  enableClustering: true,
  canvasWidth: 2000,
  canvasHeight: 2000,
}

/**
 * Virtual Graph Renderer
 * Implements viewport-based rendering with spatial indexing
 */
export class VirtualGraphRenderer {
  private spatialIndex: QuadTree<string> | null = null
  private nodePositions: Map<string, Point> = new Map()
  private allNodes: Map<string, OidSeeNode> = new Map()
  private allEdges: Map<string, OidSeeEdge> = new Map()
  private config: VirtualGraphConfig
  private layoutEngine: ClusteringLayoutEngine
  private isInitialized: boolean = false

  constructor(config: Partial<VirtualGraphConfig> = {}) {
    this.config = { ...DEFAULT_VIRTUAL_CONFIG, ...config }
    this.layoutEngine = new ClusteringLayoutEngine()
  }

  /**
   * Initialize the virtual graph with nodes and edges
   */
  async initialize(
    nodes: OidSeeNode[],
    edges: OidSeeEdge[],
    existingPositions?: Map<string, Point>
  ): Promise<void> {
    console.log('[VirtualGraphRenderer] 🚀 Initializing...', {
      nodes: nodes.length,
      edges: edges.length,
      hasExistingPositions: !!existingPositions
    })
    const startTime = performance.now()

    // Store nodes and edges
    this.allNodes.clear()
    this.allEdges.clear()
    for (const node of nodes) {
      this.allNodes.set(node.id, node)
    }
    for (const edge of edges) {
      this.allEdges.set(edge.id, edge)
    }

    // Compute or use existing positions
    if (existingPositions && existingPositions.size === nodes.length) {
      console.log('[VirtualGraphRenderer] 📍 Using existing positions')
      this.nodePositions = new Map(existingPositions)
    } else {
      console.log('[VirtualGraphRenderer] 🎨 Computing initial layout...')
      await this.computeLayout(nodes)
    }

    // Build spatial index
    console.log('[VirtualGraphRenderer] 🗂️  Building spatial index...')
    this.buildSpatialIndex()

    this.isInitialized = true
    const totalTime = performance.now() - startTime
    console.log('[VirtualGraphRenderer] ✅ Initialization complete:', {
      duration: `${totalTime.toFixed(0)}ms`
    })
  }

  /**
   * Compute initial layout using clustering
   */
  private async computeLayout(nodes: OidSeeNode[]): Promise<void> {
    if (!this.config.enableClustering) {
      // Simple random layout fallback
      this.nodePositions.clear()
      for (const node of nodes) {
        this.nodePositions.set(node.id, {
          x: Math.random() * this.config.canvasWidth,
          y: Math.random() * this.config.canvasHeight
        })
      }
      return
    }

    // Use clustering layout
    const positions = await this.layoutEngine.computeInitialLayout(nodes, {
      maxClusterSize: 100,
      groupBy: ['type', 'riskLevel'],
      canvasWidth: this.config.canvasWidth,
      canvasHeight: this.config.canvasHeight
    })

    this.nodePositions.clear()
    for (const pos of positions) {
      this.nodePositions.set(pos.id, { x: pos.x, y: pos.y })
    }
  }

  /**
   * Build spatial index from node positions
   */
  private buildSpatialIndex(): void {
    // Calculate bounds that encompass all nodes
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const pos of this.nodePositions.values()) {
      minX = Math.min(minX, pos.x)
      minY = Math.min(minY, pos.y)
      maxX = Math.max(maxX, pos.x)
      maxY = Math.max(maxY, pos.y)
    }

    // Add padding
    const padding = 500
    minX -= padding
    minY -= padding
    maxX += padding
    maxY += padding

    // Create spatial index
    const boundary: Bounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }

    this.spatialIndex = new QuadTree<string>(boundary, 4)

    // Insert all nodes
    for (const [nodeId, pos] of this.nodePositions) {
      this.spatialIndex.insert(pos, nodeId)
    }

    console.log('[VirtualGraphRenderer] 📊 Spatial index built:', {
      boundary,
      nodeCount: this.spatialIndex.size()
    })
  }

  /**
   * Update visible nodes based on viewport
   */
  updateViewport(viewport: Viewport): VirtualGraph {
    if (!this.isInitialized || !this.spatialIndex) {
      throw new Error('VirtualGraphRenderer not initialized')
    }

    console.log('[VirtualGraphRenderer] 👁️  Updating viewport:', viewport)
    const startTime = performance.now()

    // Calculate query bounds with buffer
    const buffer = this.config.viewportBuffer
    const queryBounds: Bounds = {
      x: viewport.x - (viewport.width * (buffer - 1) / 2),
      y: viewport.y - (viewport.height * (buffer - 1) / 2),
      width: viewport.width * buffer,
      height: viewport.height * buffer
    }

    // Query spatial index
    const visibleNodeData = this.spatialIndex.query(queryBounds)
    const visibleNodeIds = new Set(visibleNodeData.map(n => n.data))

    console.log('[VirtualGraphRenderer] 📊 Visible nodes:', {
      total: this.allNodes.size,
      visible: visibleNodeIds.size,
      percentage: `${((visibleNodeIds.size / this.allNodes.size) * 100).toFixed(1)}%`
    })

    // Get visible nodes
    const visibleNodes: OidSeeNode[] = []
    for (const nodeId of visibleNodeIds) {
      const node = this.allNodes.get(nodeId)
      if (node) {
        visibleNodes.push(node)
      }
    }

    // Get visible edges (edges connecting visible nodes)
    const visibleEdges: OidSeeEdge[] = []
    for (const edge of this.allEdges.values()) {
      if (visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to)) {
        visibleEdges.push(edge)
      }
    }

    const totalTime = performance.now() - startTime
    console.log('[VirtualGraphRenderer] ✅ Viewport update complete:', {
      duration: `${totalTime.toFixed(0)}ms`,
      visibleEdges: visibleEdges.length
    })

    return {
      allNodes: Array.from(this.allNodes.values()),
      allEdges: Array.from(this.allEdges.values()),
      visibleNodes,
      visibleEdges,
      viewport,
      nodePositions: this.nodePositions
    }
  }

  /**
   * Get node position
   */
  getNodePosition(nodeId: string): Point | undefined {
    return this.nodePositions.get(nodeId)
  }

  /**
   * Update node position
   */
  updateNodePosition(nodeId: string, position: Point): void {
    const oldPos = this.nodePositions.get(nodeId)
    this.nodePositions.set(nodeId, position)

    // Update spatial index if needed
    if (this.spatialIndex && oldPos) {
      // For simplicity, rebuild the index
      // In production, we'd want incremental updates
      this.buildSpatialIndex()
    }
  }

  /**
   * Get all node positions
   */
  getAllPositions(): Map<string, Point> {
    return new Map(this.nodePositions)
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.spatialIndex?.clear()
    this.spatialIndex = null
    this.nodePositions.clear()
    this.allNodes.clear()
    this.allEdges.clear()
    this.isInitialized = false
  }
}

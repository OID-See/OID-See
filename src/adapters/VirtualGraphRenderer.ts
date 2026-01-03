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
  enableProgressiveRendering: boolean // Use detail levels based on zoom
  detailLevelThresholds: number[] // Zoom scale thresholds for detail levels
  enableViewportCache: boolean // Cache viewport states
  cacheMaxSize: number // Maximum number of viewport cache entries
  cacheEvictionCount: number // Number of entries to remove when cache is full
}

export const DEFAULT_VIRTUAL_CONFIG: VirtualGraphConfig = {
  viewportBuffer: 1.5, // 50% buffer outside viewport
  batchSize: 100,
  enableClustering: true,
  canvasWidth: 2000,
  canvasHeight: 2000,
  enableProgressiveRendering: true,
  detailLevelThresholds: [0.5, 1.0, 2.0], // Low, medium, high detail zoom levels
  enableViewportCache: true,
  cacheMaxSize: 50, // Maximum viewport cache entries
  cacheEvictionCount: 10, // Remove 10 oldest entries when cache is full
}

export enum DetailLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface ViewportCacheEntry {
  viewport: Viewport
  visibleNodeIds: Set<string>
  visibleEdgeIds: Set<string>
  detailLevel: DetailLevel
  timestamp: number
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
  private viewportCache: Map<string, ViewportCacheEntry> = new Map()
  private lastViewport: Viewport | null = null
  private spatialIndexDirty: boolean = false

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
    await this.buildSpatialIndex()

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
  private async buildSpatialIndex(): Promise<void> {
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

    // Insert nodes in batches to avoid blocking the UI
    const entries = Array.from(this.nodePositions.entries())
    const BATCH_SIZE = 5000
    
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, Math.min(i + BATCH_SIZE, entries.length))
      
      for (const [nodeId, pos] of batch) {
        this.spatialIndex.insert(pos, nodeId)
      }
      
      // Yield to event loop every batch
      if (i + BATCH_SIZE < entries.length) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    console.log('[VirtualGraphRenderer] 📊 Spatial index built:', {
      boundary,
      nodeCount: this.spatialIndex.size()
    })
  }

  /**
   * Update visible nodes based on viewport
   */
  async updateViewport(viewport: Viewport): Promise<VirtualGraph> {
    if (!this.isInitialized || !this.spatialIndex) {
      throw new Error('VirtualGraphRenderer not initialized')
    }

    console.log('[VirtualGraphRenderer] 👁️  Updating viewport:', viewport)
    const startTime = performance.now()

    // Check cache first
    // Rebuild spatial index if it's dirty (positions have changed)
    if (this.spatialIndexDirty) {
      console.log('[VirtualGraphRenderer] 🔄 Rebuilding spatial index due to position changes')
      await this.buildSpatialIndex()
      this.spatialIndexDirty = false
    }

    if (this.config.enableViewportCache) {
      const cached = this.getFromCache(viewport)
      if (cached) {
        console.log('[VirtualGraphRenderer] 💾 Using cached viewport')
        return this.buildVirtualGraphFromCache(cached, viewport)
      }
    }

    // Determine detail level based on zoom
    const detailLevel = this.getDetailLevel(viewport.scale)
    console.log('[VirtualGraphRenderer] 🎨 Detail level:', detailLevel, 'scale:', viewport.scale)

    // Calculate query bounds with buffer
    const buffer = this.config.viewportBuffer
    const queryBounds: Bounds = {
      x: viewport.x - (viewport.width * (buffer - 1) / 2),
      y: viewport.y - (viewport.height * (buffer - 1) / 2),
      width: viewport.width * buffer,
      height: viewport.height * buffer
    }

    // Query spatial index in batches
    const visibleNodeIds = this.queryVisibleNodesBatched(queryBounds)

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
    // For low detail level, only show edges between high-risk nodes
    const visibleEdgeIds = new Set<string>()
    const visibleEdges: OidSeeEdge[] = []
    
    for (const edge of this.allEdges.values()) {
      if (visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to)) {
        // Apply detail level filtering
        if (detailLevel === DetailLevel.LOW) {
          // Only show edges between nodes with risk >= 70
          const fromNode = this.allNodes.get(edge.from)
          const toNode = this.allNodes.get(edge.to)
          const fromRisk = fromNode?.risk?.score ?? 0
          const toRisk = toNode?.risk?.score ?? 0
          if (fromRisk >= 70 || toRisk >= 70) {
            visibleEdges.push(edge)
            visibleEdgeIds.add(edge.id)
          }
        } else if (detailLevel === DetailLevel.MEDIUM) {
          // Show edges between nodes with risk >= 40
          const fromNode = this.allNodes.get(edge.from)
          const toNode = this.allNodes.get(edge.to)
          const fromRisk = fromNode?.risk?.score ?? 0
          const toRisk = toNode?.risk?.score ?? 0
          if (fromRisk >= 40 || toRisk >= 40) {
            visibleEdges.push(edge)
            visibleEdgeIds.add(edge.id)
          }
        } else {
          // Show all edges at high detail
          visibleEdges.push(edge)
          visibleEdgeIds.add(edge.id)
        }
      }
    }

    const totalTime = performance.now() - startTime
    console.log('[VirtualGraphRenderer] ✅ Viewport update complete:', {
      duration: `${totalTime.toFixed(0)}ms`,
      visibleEdges: visibleEdges.length,
      detailLevel
    })

    // Cache the result
    if (this.config.enableViewportCache) {
      this.addToCache(viewport, visibleNodeIds, visibleEdgeIds, detailLevel)
    }

    this.lastViewport = viewport

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
   * Determine detail level based on zoom scale
   */
  private getDetailLevel(scale: number): DetailLevel {
    if (!this.config.enableProgressiveRendering) {
      return DetailLevel.HIGH
    }

    const thresholds = this.config.detailLevelThresholds
    if (scale < thresholds[0]) {
      return DetailLevel.LOW
    } else if (scale < thresholds[1]) {
      return DetailLevel.MEDIUM
    } else {
      return DetailLevel.HIGH
    }
  }

  /**
   * Query visible nodes in batches to prevent blocking
   */
  private queryVisibleNodesBatched(bounds: Bounds): Set<string> {
    const visibleNodeData = this.spatialIndex!.query(bounds)
    const visibleNodeIds = new Set<string>()

    // Process in batches
    const batchSize = this.config.batchSize
    for (let i = 0; i < visibleNodeData.length; i += batchSize) {
      const batch = visibleNodeData.slice(i, i + batchSize)
      for (const node of batch) {
        visibleNodeIds.add(node.data)
      }
    }

    return visibleNodeIds
  }

  /**
   * Generate cache key for viewport
   */
  private getCacheKey(viewport: Viewport): string {
    // Round values to reduce cache fragmentation
    const x = Math.round(viewport.x / 100) * 100
    const y = Math.round(viewport.y / 100) * 100
    const w = Math.round(viewport.width / 100) * 100
    const h = Math.round(viewport.height / 100) * 100
    const s = Math.round(viewport.scale * 10) / 10
    return `${x},${y},${w},${h},${s}`
  }

  /**
   * Get cached viewport data if available
   */
  private getFromCache(viewport: Viewport): ViewportCacheEntry | null {
    const key = this.getCacheKey(viewport)
    const cached = this.viewportCache.get(key)
    
    if (!cached) return null

    // Check if cache is still fresh (within 5 seconds)
    const age = Date.now() - cached.timestamp
    if (age > 5000) {
      this.viewportCache.delete(key)
      return null
    }

    return cached
  }

  /**
   * Add viewport data to cache
   */
  private addToCache(
    viewport: Viewport,
    visibleNodeIds: Set<string>,
    visibleEdgeIds: Set<string>,
    detailLevel: DetailLevel
  ): void {
    const key = this.getCacheKey(viewport)
    
    // Limit cache size to prevent memory issues
    if (this.viewportCache.size > this.config.cacheMaxSize) {
      // Remove oldest entries
      const entries = Array.from(this.viewportCache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      for (let i = 0; i < this.config.cacheEvictionCount; i++) {
        this.viewportCache.delete(entries[i][0])
      }
    }

    this.viewportCache.set(key, {
      viewport,
      visibleNodeIds,
      visibleEdgeIds,
      detailLevel,
      timestamp: Date.now()
    })
  }

  /**
   * Build VirtualGraph from cached data
   */
  private buildVirtualGraphFromCache(
    cached: ViewportCacheEntry,
    viewport: Viewport
  ): VirtualGraph {
    const visibleNodes: OidSeeNode[] = []
    for (const nodeId of cached.visibleNodeIds) {
      const node = this.allNodes.get(nodeId)
      if (node) {
        visibleNodes.push(node)
      }
    }

    const visibleEdges: OidSeeEdge[] = []
    for (const edgeId of cached.visibleEdgeIds) {
      const edge = this.allEdges.get(edgeId)
      if (edge) {
        visibleEdges.push(edge)
      }
    }

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

    // Mark spatial index as dirty instead of rebuilding immediately
    // This allows batching multiple updates before rebuilding
    if (this.spatialIndex && oldPos) {
      this.spatialIndexDirty = true
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
    this.viewportCache.clear()
    this.lastViewport = null
  }

  /**
   * Clear viewport cache
   */
  clearCache(): void {
    this.viewportCache.clear()
  }
}

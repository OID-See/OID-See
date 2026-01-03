import { useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react'
import { DataSet, Network } from 'vis-network/standalone'

export type Selection =
  | { kind: 'node'; id: string; oidsee?: any }
  | { kind: 'edge'; id: string; oidsee?: any }

type VisNode = any
type VisEdge = any

export interface PhysicsConfig {
  gravitationalConstant: number
  springLength: number
  springConstant: number
  avoidOverlap: number
}

// Default physics configuration
export const DEFAULT_PHYSICS: PhysicsConfig = {
  gravitationalConstant: -40000,
  springLength: 500,
  springConstant: 0.015,
  avoidOverlap: 0.95,
}

// Constants for disabled physics (used for large graphs)
const DISABLED_PHYSICS_GRAVITATIONAL_CONSTANT = 0
const DISABLED_PHYSICS_SPRING_CONSTANT = 0

// Helper function to check if physics is disabled
function isPhysicsDisabled(config: PhysicsConfig): boolean {
  return config.gravitationalConstant === DISABLED_PHYSICS_GRAVITATIONAL_CONSTANT 
    && config.springConstant === DISABLED_PHYSICS_SPRING_CONSTANT
}

export interface GraphCanvasHandle {
  focusNode: (nodeId: string) => void
  focusEdge: (edgeId: string) => void
  restabilize: () => void
}

export const GraphCanvas = forwardRef<
  GraphCanvasHandle,
  {
    allNodes: VisNode[]
    allEdges: VisEdge[]
    visibleNodes: VisNode[]
    visibleEdges: VisEdge[]
    physicsConfig?: PhysicsConfig
    onSelection?: (s: Selection | null) => void
    onError?: (error: string) => void
  }
>(({ allNodes, allEdges, visibleNodes, visibleEdges, physicsConfig, onSelection, onError }, ref) => {
  // Constants for physics stabilization
  const PHYSICS_DISABLE_DELAY = 100 // ms delay before disabling physics after fit
  const STABILIZATION_FALLBACK_TIMEOUT = 5000 // ms fallback timeout for large graphs
  const RESTABILIZE_DELAY = 50 // ms delay before re-enabling physics in restabilize
  const RESTABILIZE_FALLBACK_TIMEOUT = 3000 // ms fallback timeout for restabilization
  const RESTABILIZE_AVOID_OVERLAP_LOW = 0.95 // Lower avoidOverlap value for restabilization
  const RESTABILIZE_AVOID_OVERLAP_HIGH = 1.0 // Higher avoidOverlap value for restabilization
  
  // Batching constants for large datasets
  const BATCH_SIZE = 1000 // Process nodes/edges in batches to prevent UI blocking
  
  const containerRef = useRef<HTMLDivElement>(null)
  const networkRef = useRef<Network | null>(null)
  const allNodesRef = useRef<DataSet<VisNode>>(new DataSet([]))
  const allEdgesRef = useRef<DataSet<VisEdge>>(new DataSet([]))
  const fittedRef = useRef(false)
  const updateInProgressRef = useRef(false)

  const physics = useMemo(() => physicsConfig ?? DEFAULT_PHYSICS, [physicsConfig])

  // Expose focus methods to parent component
  useImperativeHandle(ref, () => ({
    focusNode: (nodeId: string) => {
      const network = networkRef.current
      if (!network) return
      
      try {
        network.selectNodes([nodeId])
        network.focus(nodeId, {
          scale: 1.2,
          animation: { duration: 450, easingFunction: 'easeInOutQuad' },
        })
      } catch (e) {
        console.warn('Failed to focus node:', nodeId, e)
      }
    },
    focusEdge: (edgeId: string) => {
      const network = networkRef.current
      const allEdges = allEdgesRef.current
      if (!network || !allEdges) return
      
      try {
        const edge = allEdges.get(edgeId)
        if (!edge) return
        
        // Select the edge
        network.selectEdges([edgeId])
        
        // Focus the "from" node first
        network.focus(edge.from, {
          scale: 1.2,
          animation: { duration: 450, easingFunction: 'easeInOutQuad' },
        })
        
        // Then focus the "to" node after a delay
        setTimeout(() => {
          network.focus(edge.to, {
            scale: 1.2,
            animation: { duration: 450, easingFunction: 'easeInOutQuad' },
          })
        }, 500)
      } catch (e) {
        console.warn('Failed to focus edge:', edgeId, e)
      }
    },
    restabilize: () => {
      const network = networkRef.current
      if (!network) return
      
      try {
        // Re-enable physics temporarily and slightly adjust avoidOverlap to force recalculation
        // This mimics the effect of the user adjusting the slider
        const currentPhysics = physics
        
        // Temporarily change avoidOverlap to force spacing recalculation
        // Use tolerance for floating point comparison
        const isHighOverlap = Math.abs(currentPhysics.avoidOverlap - RESTABILIZE_AVOID_OVERLAP_HIGH) < 0.01
        network.setOptions({ 
          physics: { 
            enabled: true,
            barnesHut: {
              ...currentPhysics,
              avoidOverlap: isHighOverlap 
                ? RESTABILIZE_AVOID_OVERLAP_LOW 
                : RESTABILIZE_AVOID_OVERLAP_HIGH
            }
          } 
        })
        
        // Short delay to allow the change to take effect
        setTimeout(() => {
          // Restore original avoidOverlap value and trigger stabilization
          network.setOptions({ 
            physics: { 
              enabled: true,
              barnesHut: currentPhysics
            } 
          })
          network.stabilize()
          
          // Disable physics after stabilization
          const onceStabilized = () => {
            network.setOptions({ physics: { enabled: false } })
            network.off('stabilized', onceStabilized)
          }
          network.once('stabilized', onceStabilized)
          
          // Fallback timeout to ensure physics gets disabled and listener removed
          setTimeout(() => {
            try {
              network.off('stabilized', onceStabilized)
              network.setOptions({ physics: { enabled: false } })
            } catch (e) {
              console.warn('Failed to disable physics in fallback:', e)
            }
          }, RESTABILIZE_FALLBACK_TIMEOUT)
        }, RESTABILIZE_DELAY)
      } catch (e) {
        console.warn('Failed to restabilize graph:', e)
      }
    },
  }))

  // Update all and visible datasets when nodes/edges change
  // Use hide/unhide approach for better performance with large datasets
  // Batch operations for very large datasets to prevent UI blocking
  useEffect(() => {
    const allNodesDs = allNodesRef.current
    const allEdgesDs = allEdgesRef.current

    // Helper function to process items in batches with delays
    async function processBatched<T>(
      items: T[],
      batchSize: number,
      processor: (batch: T[]) => void
    ) {
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)
        processor(batch)
        // Yield to main thread every batch (1ms for more predictable behavior)
        if (i + batchSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, 1))
        }
      }
    }

    async function updateDataSets() {
      // Skip if an update is already in progress
      if (updateInProgressRef.current) return
      updateInProgressRef.current = true
      
      try {
        // Create sets of visible IDs for quick lookup
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id))
        const visibleEdgeIds = new Set(visibleEdges.map(e => e.id))

        // Get current nodes and edges
        const currentNodeIds = new Set(allNodesDs.getIds())
        const currentEdgeIds = new Set(allEdgesDs.getIds())

        // Find nodes/edges to add (in allNodes/allEdges but not in dataset)
        const nodesToAdd = allNodes.filter(n => !currentNodeIds.has(n.id))
        const edgesToAdd = allEdges.filter(e => !currentEdgeIds.has(e.id))

        // Find nodes/edges to remove (in dataset but not in allNodes/allEdges)
        const allNodeIds = new Set(allNodes.map(n => n.id))
        const allEdgeIds = new Set(allEdges.map(e => e.id))
        const nodeIdsToRemove = Array.from(currentNodeIds).filter(id => !allNodeIds.has(id))
        const edgeIdsToRemove = Array.from(currentEdgeIds).filter(id => !allEdgeIds.has(id))

        // Update dataset: add new nodes/edges in batches
        if (nodesToAdd.length > 0) {
          if (nodesToAdd.length > BATCH_SIZE) {
            await processBatched(nodesToAdd, BATCH_SIZE, batch => allNodesDs.add(batch))
          } else {
            allNodesDs.add(nodesToAdd)
          }
        }
        
        if (edgesToAdd.length > 0) {
          if (edgesToAdd.length > BATCH_SIZE) {
            await processBatched(edgesToAdd, BATCH_SIZE, batch => allEdgesDs.add(batch))
          } else {
            allEdgesDs.add(edgesToAdd)
          }
        }

        // Update dataset: remove nodes/edges that are no longer in allNodes/allEdges
        if (nodeIdsToRemove.length > 0) allNodesDs.remove(nodeIdsToRemove)
        if (edgeIdsToRemove.length > 0) allEdgesDs.remove(edgeIdsToRemove)

        // Update visibility: hide/show nodes and edges based on filter
        const nodeUpdates = allNodes.map(n => ({
          id: n.id,
          hidden: !visibleNodeIds.has(n.id)
        }))
        
        const edgeUpdates = allEdges.map(e => ({
          id: e.id,
          hidden: !visibleEdgeIds.has(e.id)
        }))

        // Batch visibility updates for large datasets
        if (nodeUpdates.length > 0) {
          if (nodeUpdates.length > BATCH_SIZE) {
            await processBatched(nodeUpdates, BATCH_SIZE, batch => allNodesDs.update(batch))
          } else {
            allNodesDs.update(nodeUpdates)
          }
        }
        
        if (edgeUpdates.length > 0) {
          if (edgeUpdates.length > BATCH_SIZE) {
            await processBatched(edgeUpdates, BATCH_SIZE, batch => allEdgesDs.update(batch))
          } else {
            allEdgesDs.update(edgeUpdates)
          }
        }

      } catch (e: any) {
        // Catch errors from vis-network DataSet (e.g., duplicate IDs)
        let errorMessage = 'Unknown error occurred'
        
        // Extract error message from various error formats
        if (typeof e === 'string') {
          errorMessage = e
        } else if (e?.message) {
          errorMessage = e.message
        } else if (e?.toString) {
          errorMessage = e.toString()
        }
        
        console.error('Error updating graph data:', errorMessage, e)
        if (onError) {
          onError(errorMessage)
        }
      } finally {
        updateInProgressRef.current = false
      }
    }

    // Run the async update
    updateDataSets()
  }, [allNodes, allEdges, visibleNodes, visibleEdges, onError])

  // Initialize network once on mount
  useEffect(() => {
    if (!containerRef.current) return

    if (!containerRef.current.style.height) containerRef.current.style.height = '70vh'
    if (!containerRef.current.style.minHeight) containerRef.current.style.minHeight = '420px'

    networkRef.current?.destroy()
    fittedRef.current = false

    const nodeDs = allNodesRef.current
    const edgeDs = allEdgesRef.current

    // Check if physics should be disabled (for large graphs)
    const physicsDisabled = isPhysicsDisabled(physics)

    const network = new Network(
      containerRef.current,
      { nodes: nodeDs, edges: edgeDs },
      {
        autoResize: true,
        layout: { 
          improvedLayout: !physicsDisabled, // Disable improvedLayout for large graphs
          randomSeed: undefined
        },
        interaction: {
          hover: true,
          tooltipDelay: 120,
          multiselect: true,
          navigationButtons: false, // Disable navigation buttons to prevent interaction conflicts
          keyboard: false, // Disable to prevent interference with filter text field
          dragNodes: true,
          dragView: true,
          zoomView: true,
        },
        nodes: {
          shape: 'dot',
          borderWidth: 2,
          font: { color: '#EAF2FF', face: 'system-ui' },
          color: {
            background: 'rgba(66,232,224,0.15)',
            border: 'rgba(66,232,224,0.95)',
            highlight: { background: 'rgba(155,92,255,0.20)', border: 'rgba(155,92,255,0.95)' },
          },
        },
        edges: {
          smooth: { type: 'dynamic' },
          arrows: { to: { enabled: true, scaleFactor: 0.7 } },
          font: { color: 'rgba(234,242,255,0.9)', strokeWidth: 0 },
          color: { color: 'rgba(155,92,255,0.70)', highlight: 'rgba(66,232,224,0.95)' },
          selectionWidth: 2,
        },
        physics: {
          enabled: !physicsDisabled,
          stabilization: { 
            enabled: !physicsDisabled,
            iterations: 250, 
            fit: true 
          },
          barnesHut: {
            gravitationalConstant: physics.gravitationalConstant,
            springLength: physics.springLength,
            springConstant: physics.springConstant,
            damping: 0.35,
            avoidOverlap: physics.avoidOverlap,
          },
        },
        groups: {
          OAuthApp: { color: { border: 'rgba(66,232,224,0.95)', background: 'rgba(66,232,224,0.18)' } },
          ServicePrincipal: { color: { border: 'rgba(155,92,255,0.95)', background: 'rgba(155,92,255,0.16)' } },
          Application: { color: { border: 'rgba(66,232,224,0.95)', background: 'rgba(66,232,224,0.12)' } },
          User: { color: { border: 'rgba(234,242,255,0.9)', background: 'rgba(234,242,255,0.10)' } },
          Group: { color: { border: 'rgba(234,242,255,0.75)', background: 'rgba(234,242,255,0.08)' } },
          Role: { color: { border: 'rgba(255,196,0,0.95)', background: 'rgba(255,196,0,0.12)' } },
          TenantPolicy: { color: { border: 'rgba(255,107,107,0.95)', background: 'rgba(255,107,107,0.10)' } },
          Organization: { color: { border: 'rgba(66,232,224,0.75)', background: 'rgba(66,232,224,0.10)' } },
          ResourceApi: { color: { border: 'rgba(155,92,255,0.85)', background: 'rgba(155,92,255,0.10)' } },
        },
      }
    )

    networkRef.current = network

    // Track if physics has been disabled
    let physicsAlreadyDisabled = physicsDisabled
    
    const disablePhysics = () => {
      if (physicsAlreadyDisabled) return
      physicsAlreadyDisabled = true
      try {
        network.setOptions({ physics: { enabled: false } })
      } catch (e) {
        console.warn('Failed to disable physics:', e)
      }
    }

    const fitOnce = () => {
      if (fittedRef.current) return
      fittedRef.current = true
      try {
        network.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } })
      } catch {}
      // Only disable physics after fitting if it was initially enabled
      if (!physicsDisabled) {
        setTimeout(() => disablePhysics(), PHYSICS_DISABLE_DELAY)
      }
    }

    // If physics is disabled from the start (large graph), fit immediately
    let stabilizationTimeout: NodeJS.Timeout | null = null
    
    if (physicsDisabled) {
      setTimeout(() => {
        try {
          network.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } })
          fittedRef.current = true
        } catch {}
      }, 100)
    } else {
      // Multiple events to ensure we catch stabilization when physics is enabled
      network.on('stabilizationIterationsDone', () => {
        fitOnce()
      })
      
      network.on('stabilized', () => {
        fitOnce()
      })

      // Fallback timeout to ensure physics is disabled even if events don't fire
      stabilizationTimeout = setTimeout(() => {
        if (!fittedRef.current) {
          fitOnce()
        } else {
          // Ensure physics is disabled even if fitOnce ran but physics wasn't disabled
          disablePhysics()
        }
      }, STABILIZATION_FALLBACK_TIMEOUT)
    }

    // Handle clicks manually to prevent label clicks from selecting elements
    // Only select elements when clicking on their body (not labels)
    network.on('click', (params: any) => {
      // params.nodes and params.edges are only populated when clicking on the actual
      // node body or edge line, NOT when clicking on labels
      const clickedNodes = params.nodes || []
      const clickedEdges = params.edges || []
      
      // Check if a node body was clicked (not just the label area)
      if (clickedNodes.length > 0) {
        const nodeId = clickedNodes[0]
        // Clicked on a node body - select it
        network.selectNodes([nodeId])
        const n = nodeDs.get(nodeId) as any
        onSelection?.({ kind: 'node', id: String(nodeId), oidsee: n?.__oidsee ?? n })
        return
      }
      
      // Check if an edge line was clicked (not just the label area)
      if (clickedEdges.length > 0) {
        const edgeId = clickedEdges[0]
        // Clicked on an edge line - select it
        network.selectEdges([edgeId])
        const e = edgeDs.get(edgeId) as any
        onSelection?.({ kind: 'edge', id: String(edgeId), oidsee: e?.__oidsee ?? e })
        return
      }
      
      // Clicked on empty space or label - deselect
      network.unselectAll()
      onSelection?.(null)
    })

    network.on('deselectNode', () => onSelection?.(null))
    network.on('deselectEdge', () => onSelection?.(null))

    // Subtle "glow" for derived edges by pulsing alpha (lightweight).
    const derivedIds = edgeDs
      .get()
      .filter((e: any) => (e.__oidsee?.derived?.isDerived ?? false) === true)
      .map((e: any) => e.id)

    let pulse = false
    const timer =
      derivedIds.length > 0
        ? window.setInterval(() => {
            pulse = !pulse
            const alpha = pulse ? 0.95 : 0.70
            edgeDs.update(
              derivedIds.map((id: string) => ({
                id,
                color: { color: `rgba(66,232,224,${alpha})`, highlight: 'rgba(66,232,224,1.0)' },
              }))
            )
          }, 850)
        : null

    const ro = new ResizeObserver(() => {
      try {
        network.redraw()
        // Only fit on initial render, not on every resize
      } catch {}
    })
    ro.observe(containerRef.current)

    return () => {
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout)
      if (timer) window.clearInterval(timer)
      ro.disconnect()
      network.destroy()
    }
  }, [onSelection, physics])

  // Update physics configuration without recreating the network
  useEffect(() => {
    const network = networkRef.current
    if (!network) return

    try {
      network.setOptions({
        physics: {
          barnesHut: {
            gravitationalConstant: physics.gravitationalConstant,
            springLength: physics.springLength,
            springConstant: physics.springConstant,
            damping: 0.35,
            avoidOverlap: physics.avoidOverlap,
          },
        },
      })
    } catch (e) {
      console.warn('Failed to update physics configuration:', e)
    }
  }, [physics])

  return <div ref={containerRef} className="graph" />
})

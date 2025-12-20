
import { useEffect, useRef } from 'react'
import { DataSet, Network } from 'vis-network/standalone'

export type Selection =
  | { kind: 'node'; id: string; oidsee?: any }
  | { kind: 'edge'; id: string; oidsee?: any }

export type GraphApi = {
  focusNode: (id: string) => void
  focusNeighbors: (id: string) => void
  togglePinNode: (id: string) => void
  isolateNode: (id: string) => void
  isolateEdge: (id: string) => void
  clearIsolation: () => void
  selectEdge: (id: string) => void
  selectNode: (id: string) => void
}

type VisNode = any
type VisEdge = any

export function GraphCanvas({
  nodes,
  edges,
  onSelection,
  onApiReady,
}: {
  nodes: VisNode[]
  edges: VisEdge[]
  onSelection?: (s: Selection | null) => void
  onApiReady?: (api: GraphApi) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const networkRef = useRef<Network | null>(null)
  const nodeDsRef = useRef<DataSet<any> | null>(null)
  const edgeDsRef = useRef<DataSet<any> | null>(null)
  const fittedRef = useRef(false)
  const pinned = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!ref.current) return

    if (!ref.current.style.height) ref.current.style.height = '70vh'
    if (!ref.current.style.minHeight) ref.current.style.minHeight = '420px'

    networkRef.current?.destroy()
    fittedRef.current = false

    const nodeDs = new DataSet(nodes)
    const edgeDs = new DataSet(edges)
    nodeDsRef.current = nodeDs
    edgeDsRef.current = edgeDs

    let network: Network
    try {
      network = new Network(
        ref.current,
        { nodes: nodeDs, edges: edgeDs },
        {
          autoResize: true,
          layout: { improvedLayout: true },
          interaction: {
            hover: true,
            tooltipDelay: 120,
            multiselect: true,
            navigationButtons: true,
            keyboard: false, // iOS Safari can get weird with keyboard handlers
            hideEdgesOnDrag: true,
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
            enabled: true,
            stabilization: { iterations: 80, fit: true }, // lower to reduce iOS load
            barnesHut: {
              gravitationalConstant: -8000,
              springLength: 150,
              springConstant: 0.04,
              damping: 0.30,
              avoidOverlap: 0.6,
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
    } catch (e) {
      // Fail safe: if vis-network explodes (iOS), avoid crashing the whole app.
      console.error('vis-network init failed', e)
      return
    }

    networkRef.current = network

    const api: GraphApi = {
      focusNode: (id: string) => {
        try {
          network.selectNodes([id], false)
          network.focus(id, { scale: 1.1, animation: { duration: 300, easingFunction: 'easeInOutQuad' } })
        } catch {}
      },
      focusNeighbors: (id: string) => {
        try {
          const neigh = network.getConnectedNodes(id) as string[]
          network.selectNodes([id, ...neigh], false)
          network.focus(id, { scale: 1.1, animation: { duration: 300, easingFunction: 'easeInOutQuad' } })
        } catch {}
      },
      togglePinNode: (id: string) => {
        const ds = nodeDsRef.current
        const net = networkRef.current
        if (!ds || !net) return
        const pos = net.getPositions([id])[id]
        const isPinned = pinned.current.has(id)
        if (isPinned) {
          pinned.current.delete(id)
          ds.update({ id, fixed: false })
        } else {
          pinned.current.add(id)
          ds.update({ id, fixed: { x: true, y: true }, x: pos?.x, y: pos?.y })
        }
      },
      isolateNode: (id: string) => {
        const dsN = nodeDsRef.current
        const dsE = edgeDsRef.current
        const net = networkRef.current
        if (!dsN || !dsE || !net) return
        const neigh = new Set<string>([id, ...(net.getConnectedNodes(id) as string[])])
        const keepEdges = new Set<string>(net.getConnectedEdges(id) as string[])
        dsN.update(dsN.get().map((n: any) => ({ id: n.id, hidden: !neigh.has(n.id) })))
        dsE.update(dsE.get().map((e: any) => ({ id: e.id, hidden: !keepEdges.has(e.id) })))
        try {
          net.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } })
        } catch {}
      },
      isolateEdge: (id: string) => {
        const dsN = nodeDsRef.current
        const dsE = edgeDsRef.current
        const net = networkRef.current
        if (!dsN || !dsE || !net) return
        const e = dsE.get(id) as any
        if (!e) return
        const keepNodes = new Set<string>([e.from, e.to])
        dsN.update(dsN.get().map((n: any) => ({ id: n.id, hidden: !keepNodes.has(n.id) })))
        dsE.update(dsE.get().map((x: any) => ({ id: x.id, hidden: x.id !== id })))
        try {
          net.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } })
        } catch {}
      },
      clearIsolation: () => {
        const dsN = nodeDsRef.current
        const dsE = edgeDsRef.current
        const net = networkRef.current
        if (!dsN || !dsE || !net) return
        dsN.update(dsN.get().map((n: any) => ({ id: n.id, hidden: false })))
        dsE.update(dsE.get().map((e: any) => ({ id: e.id, hidden: false })))
        try {
          net.fit({ animation: { duration: 250, easingFunction: 'easeInOutQuad' } })
        } catch {}
      },
      selectEdge: (id: string) => {
        try {
          network.selectEdges([id])
        } catch {}
      },
      selectNode: (id: string) => {
        try {
          network.selectNodes([id])
        } catch {}
      },
    }

    onApiReady?.(api)

    const fitOnce = () => {
      if (fittedRef.current) return
      fittedRef.current = true
      try {
        network.fit({ animation: { duration: 350, easingFunction: 'easeInOutQuad' } })
      } catch {}
    }

    network.on('stabilizationIterationsDone', () => {
      fitOnce()
      // Stop physics after stabilize to avoid iOS CPU runaway.
      try {
        network.setOptions({ physics: { enabled: false } })
      } catch {}
    })
    network.on('afterDrawing', fitOnce)

    network.on('selectNode', (p: any) => {
      const id = p.nodes?.[0]
      if (!id) return
      const n = nodeDs.get(id) as any
      onSelection?.({ kind: 'node', id, oidsee: n?.__oidsee ?? n })
    })
    network.on('selectEdge', (p: any) => {
      const id = p.edges?.[0]
      if (!id) return
      const e = edgeDs.get(id) as any
      onSelection?.({ kind: 'edge', id, oidsee: e?.__oidsee ?? e })
    })
    network.on('deselectNode', () => onSelection?.(null))
    network.on('deselectEdge', () => onSelection?.(null))

    network.on('doubleClick', (p: any) => {
      const id = p.nodes?.[0]
      if (!id) return
      api.isolateNode(id)
    })

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
              derivedIds.map((did: string) => ({
                id: did,
                color: { color: `rgba(66,232,224,${alpha})`, highlight: 'rgba(66,232,224,1.0)' },
              }))
            )
          }, 950)
        : null

    // Throttled ResizeObserver
    let raf = 0
    let pending = false
    const ro = new ResizeObserver(() => {
      if (pending) return
      pending = true
      raf = window.requestAnimationFrame(() => {
        pending = false
        try {
          network.redraw()
        } catch {}
      })
    })
    ro.observe(ref.current)

    return () => {
      if (timer) window.clearInterval(timer)
      ro.disconnect()
      if (raf) window.cancelAnimationFrame(raf)
      network.destroy()
    }
  }, [nodes, edges, onSelection, onApiReady])

  return <div ref={ref} className="graph" />
}

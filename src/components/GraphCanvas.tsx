
import { useEffect, useRef } from 'react'
import { DataSet, Network } from 'vis-network/standalone'

export type Selection =
  | { kind: 'node'; id: string; oidsee?: any }
  | { kind: 'edge'; id: string; oidsee?: any }

type VisNode = any
type VisEdge = any

export function GraphCanvas({
  nodes,
  edges,
  onSelection,
}: {
  nodes: VisNode[]
  edges: VisEdge[]
  onSelection?: (s: Selection | null) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const networkRef = useRef<Network | null>(null)
  const fittedRef = useRef(false)

  useEffect(() => {
    if (!ref.current) return

    if (!ref.current.style.height) ref.current.style.height = '70vh'
    if (!ref.current.style.minHeight) ref.current.style.minHeight = '420px'

    networkRef.current?.destroy()
    fittedRef.current = false

    const nodeDs = new DataSet(nodes)
    const edgeDs = new DataSet(edges)

    const network = new Network(
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
          keyboard: true,
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
          stabilization: { iterations: 200, fit: true },
          barnesHut: {
            gravitationalConstant: -9000,
            springLength: 150,
            springConstant: 0.04,
            damping: 0.25,
            avoidOverlap: 0.5,
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

    const fitOnce = () => {
      if (fittedRef.current) return
      fittedRef.current = true
      try {
        network.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } })
      } catch {}
    }

    network.on('stabilizationIterationsDone', fitOnce)
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
        network.fit({ animation: false })
      } catch {}
    })
    ro.observe(ref.current)

    return () => {
      if (timer) window.clearInterval(timer)
      ro.disconnect()
      network.destroy()
    }
  }, [nodes, edges, onSelection])

  return <div ref={ref} className="graph" />
}

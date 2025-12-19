
import { useEffect, useRef } from 'react'
import { DataSet, Network } from 'vis-network/standalone'

type VisNode = any
type VisEdge = any

export function GraphCanvas({ nodes, edges }: { nodes: VisNode[]; edges: VisEdge[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const networkRef = useRef<Network | null>(null)
  const fittedRef = useRef(false)

  useEffect(() => {
    if (!ref.current) return

    // Mobile Safari can init the canvas while the element reports 0px height.
    // Give it a concrete height at init time (CSS still controls layout).
    if (!ref.current.style.height) ref.current.style.height = '70vh'
    if (!ref.current.style.minHeight) ref.current.style.minHeight = '420px'

    networkRef.current?.destroy()
    fittedRef.current = false

    const data = {
      nodes: new DataSet(nodes),
      edges: new DataSet(edges),
    }

    const network = new Network(ref.current, data, {
      autoResize: true,
      layout: { improvedLayout: true },
      interaction: {
        hover: true,
        tooltipDelay: 120,
        multiselect: true,
        navigationButtons: true,
        keyboard: true,
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
    })

    networkRef.current = network

    const fitOnce = () => {
      if (fittedRef.current) return
      fittedRef.current = true
      try {
        network.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } })
      } catch {
        // ignore
      }
    }

    // More reliable than setTimeout on mobile
    network.on('stabilizationIterationsDone', fitOnce)
    network.on('afterDrawing', fitOnce)

    // Handle viewport/address-bar resize on mobile
    const ro = new ResizeObserver(() => {
      try {
        network.redraw()
        network.fit({ animation: false })
      } catch {
        // ignore
      }
    })
    ro.observe(ref.current)

    return () => {
      ro.disconnect()
      network.destroy()
    }
  }, [nodes, edges])

  return <div ref={ref} className="graph" />
}

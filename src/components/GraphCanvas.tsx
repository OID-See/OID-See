
import { useEffect, useRef } from 'react'
import { DataSet, Network } from 'vis-network/standalone'

type VisNode = any
type VisEdge = any

export function GraphCanvas({ nodes, edges }: { nodes: VisNode[]; edges: VisEdge[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const networkRef = useRef<Network | null>(null)

  useEffect(() => {
    if (!ref.current) return

    networkRef.current?.destroy()

    const data = {
      nodes: new DataSet(nodes),
      edges: new DataSet(edges),
    }

    networkRef.current = new Network(ref.current, data, {
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
        stabilization: { iterations: 150 },
        barnesHut: {
          gravitationalConstant: -8000,
          springLength: 140,
          springConstant: 0.04,
          damping: 0.2,
          avoidOverlap: 0.4,
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

    setTimeout(() => {
      try {
        networkRef.current?.fit({ animation: { duration: 350, easingFunction: 'easeInOutQuad' } })
      } catch {
        // ignore
      }
    }, 50)

    return () => networkRef.current?.destroy()
  }, [nodes, edges])

  return <div ref={ref} className="graph" />
}

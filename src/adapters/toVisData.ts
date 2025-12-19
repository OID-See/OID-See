
import { isOidSeeExport, OidSeeExport } from './types'

type VisData = { nodes: any[]; edges: any[] }

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c] as string))
}

function formatRisk(risk?: any) {
  if (!risk) return ''
  const score = typeof risk.score === 'number' ? `Score: ${risk.score}` : ''
  const level = risk.level ? `Level: ${risk.level}` : ''
  const parts = [level, score].filter(Boolean).join(' · ')
  return parts ? `<div><b>Risk</b>: ${esc(parts)}</div>` : ''
}

function formatProps(props: Record<string, any>) {
  const entries = Object.entries(props ?? {})
  if (!entries.length) return ''
  const rows = entries
    .slice(0, 30)
    .map(([k, v]) => `<tr><td style="opacity:.8;padding-right:.6rem">${esc(k)}</td><td>${esc(String(v))}</td></tr>`)
    .join('')
  return `<details><summary><b>Properties</b></summary><table style="margin-top:.4rem">${rows}</table></details>`
}

export function toVisData(input: any): VisData {
  if (isOidSeeExport(input)) {
    const exp = input as OidSeeExport

    const visNodes = exp.nodes.map((n) => {
      const riskBoost = typeof n.risk?.score === 'number' ? Math.min(20, Math.max(0, n.risk.score)) : 0
      const value = 10 + (riskBoost / 2)

      const title = [
        `<div><b>${esc(n.displayName)}</b></div>`,
        `<div style="opacity:.85">${esc(n.type)} · ${esc(n.id)}</div>`,
        formatRisk(n.risk),
        formatProps(n.properties ?? {}),
        n.labels?.length ? `<div style="margin-top:.4rem"><b>Labels</b>: ${esc(n.labels.join(', '))}</div>` : '',
      ].filter(Boolean).join('')

      return {
        id: n.id,
        label: n.displayName,
        group: n.type,
        value,
        title,
      }
    })

    const visEdges = exp.edges.map((e) => {
      const scopes = e.properties?.scopes?.length ? e.properties.scopes.join(' ') : ''
      const label = scopes ? `${e.type}\n${scopes}` : e.type

      const title = [
        `<div><b>${esc(e.type)}</b></div>`,
        `<div style="opacity:.85">${esc(e.from)} → ${esc(e.to)}</div>`,
        formatRisk(e.risk),
        e.properties ? formatProps(e.properties) : '',
        e.derived?.isDerived ? `<div style="margin-top:.4rem;opacity:.9"><b>Derived</b>: ${esc(e.derived.algorithm ?? 'unknown')}</div>` : '',
      ].filter(Boolean).join('')

      return {
        id: e.id,
        from: e.from,
        to: e.to,
        label,
        title,
        arrows: 'to',
        dashes: !!e.derived?.isDerived,
      }
    })

    return { nodes: visNodes, edges: visEdges }
  }

  if (input && typeof input === 'object' && Array.isArray(input.nodes) && Array.isArray(input.edges)) {
    return { nodes: input.nodes, edges: input.edges }
  }

  throw new Error('Unsupported JSON format. Expected an OID-See export (format.name="oidsee-graph") or a {nodes, edges} object.')
}

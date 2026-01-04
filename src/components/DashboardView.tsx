import { useMemo } from 'react'
import { OidSeeNode, OidSeeEdge } from '../adapters/types'
import { Selection } from './GraphCanvas'

type DashboardViewProps = {
  nodes: OidSeeNode[]
  edges: OidSeeEdge[]
  onSelection?: (selection: Selection) => void
}

type Statistics = {
  totalNodes: number
  totalEdges: number
  nodesByType: Record<string, number>
  edgesByType: Record<string, number>
  riskDistribution: Record<string, number>
  topRiskyNodes: OidSeeNode[]
  avgRiskScore: number
  highRiskNodes: number
  criticalRiskNodes: number
}

export function DashboardView({ nodes, edges, onSelection }: DashboardViewProps) {
  const stats = useMemo((): Statistics => {
    // Count nodes by type
    const nodesByType: Record<string, number> = {}
    for (const node of nodes) {
      nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1
    }

    // Count edges by type
    const edgesByType: Record<string, number> = {}
    for (const edge of edges) {
      edgesByType[edge.type] = (edgesByType[edge.type] ?? 0) + 1
    }

    // Risk distribution
    const riskDistribution: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    }

    let totalRisk = 0
    let riskCount = 0

    for (const node of nodes) {
      const score = node.risk?.score ?? 0
      if (score >= 70) {
        riskDistribution.critical++
      } else if (score >= 40) {
        riskDistribution.high++
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

    const avgRiskScore = riskCount > 0 ? totalRisk / riskCount : 0

    // Top risky nodes
    const topRiskyNodes = [...nodes]
      .filter(n => (n.risk?.score ?? 0) > 0)
      .sort((a, b) => (b.risk?.score ?? 0) - (a.risk?.score ?? 0))
      .slice(0, 10)

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodesByType,
      edgesByType,
      riskDistribution,
      topRiskyNodes,
      avgRiskScore,
      highRiskNodes: riskDistribution.high,
      criticalRiskNodes: riskDistribution.critical,
    }
  }, [nodes, edges])

  const getRiskClass = (score: number) => {
    if (score >= 70) return 'risk-critical'
    if (score >= 40) return 'risk-high'
    if (score >= 20) return 'risk-medium'
    if (score > 0) return 'risk-low'
    return 'risk-none'
  }

  return (
    <div className="dashboard-view">
      <div className="dashboard-view__header">
        <h2>Dashboard Overview</h2>
        <p className="dashboard-view__subtitle">
          Summary statistics and risk analysis for your tenant
        </p>
      </div>

      <div className="dashboard-view__grid">
        {/* Summary Cards */}
        <div className="dashboard-card dashboard-card--highlight">
          <div className="dashboard-card__icon">📊</div>
          <div className="dashboard-card__content">
            <div className="dashboard-card__value">{stats.totalNodes.toLocaleString()}</div>
            <div className="dashboard-card__label">Total Nodes</div>
          </div>
        </div>

        <div className="dashboard-card dashboard-card--highlight">
          <div className="dashboard-card__icon">🔗</div>
          <div className="dashboard-card__content">
            <div className="dashboard-card__value">{stats.totalEdges.toLocaleString()}</div>
            <div className="dashboard-card__label">Total Edges</div>
          </div>
        </div>

        <div className="dashboard-card dashboard-card--warning">
          <div className="dashboard-card__icon">⚠️</div>
          <div className="dashboard-card__content">
            <div className="dashboard-card__value">{stats.criticalRiskNodes}</div>
            <div className="dashboard-card__label">Critical Risk Nodes</div>
          </div>
        </div>

        <div className="dashboard-card dashboard-card--warning">
          <div className="dashboard-card__icon">⚡</div>
          <div className="dashboard-card__content">
            <div className="dashboard-card__value">{stats.highRiskNodes}</div>
            <div className="dashboard-card__label">High Risk Nodes</div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card__icon">📈</div>
          <div className="dashboard-card__content">
            <div className="dashboard-card__value">{stats.avgRiskScore.toFixed(1)}</div>
            <div className="dashboard-card__label">Average Risk Score</div>
          </div>
        </div>

        {/* Nodes by Type */}
        <div className="dashboard-section dashboard-section--span-2">
          <h3>Nodes by Type</h3>
          <div className="dashboard-chart">
            {Object.entries(stats.nodesByType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => {
                const percentage = (count / stats.totalNodes) * 100
                return (
                  <div key={type} className="dashboard-bar">
                    <div className="dashboard-bar__label">
                      <span>{type}</span>
                      <span>{count}</span>
                    </div>
                    <div className="dashboard-bar__track">
                      <div
                        className="dashboard-bar__fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="dashboard-section dashboard-section--span-2">
          <h3>Risk Distribution</h3>
          <div className="dashboard-chart">
            {Object.entries(stats.riskDistribution)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([level, count]) => {
                const percentage = (count / stats.totalNodes) * 100
                return (
                  <div key={level} className="dashboard-bar">
                    <div className="dashboard-bar__label">
                      <span className={`risk-label risk-label--${level}`}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </span>
                      <span>{count}</span>
                    </div>
                    <div className="dashboard-bar__track">
                      <div
                        className={`dashboard-bar__fill dashboard-bar__fill--${level}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Top Edge Types */}
        <div className="dashboard-section">
          <h3>Top Edge Types</h3>
          <div className="dashboard-list">
            {Object.entries(stats.edgesByType)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([type, count]) => (
                <div key={type} className="dashboard-list__item">
                  <span className="dashboard-list__label">{type}</span>
                  <span className="dashboard-list__value">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Top Risky Nodes */}
        <div className="dashboard-section">
          <h3>Top 10 Risky Nodes</h3>
          <div className="dashboard-list">
            {stats.topRiskyNodes.map((node) => (
              <div key={node.id} className="dashboard-list__item dashboard-list__item--clickable">
                <button
                  className="dashboard-list__button"
                  onClick={() => {
                    if (onSelection) {
                      onSelection({
                        kind: 'node',
                        id: node.id,
                        oidsee: node
                      })
                    }
                  }}
                >
                  <div className="dashboard-list__node">
                    <span className="dashboard-list__label">
                      {node.displayName || node.id}
                    </span>
                    <span className="dashboard-list__type">{node.type}</span>
                  </div>
                  <span className={`dashboard-list__risk ${getRiskClass(node.risk?.score ?? 0)}`}>
                    {node.risk?.score ?? 0}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

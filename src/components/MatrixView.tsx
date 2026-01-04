import { useMemo, useState } from 'react'
import { OidSeeNode, OidSeeEdge, OidSeeNodeType } from '../adapters/types'

type MatrixCell = {
  fromType: string
  toType: string
  count: number
  avgRisk: number
  maxRisk: number
  edges: OidSeeEdge[]
}

type MatrixViewProps = {
  nodes: OidSeeNode[]
  edges: OidSeeEdge[]
  onDrillDown?: (edges: OidSeeEdge[]) => void
}

export function MatrixView({ nodes, edges, onDrillDown }: MatrixViewProps) {
  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  // Build matrix data
  const matrixData = useMemo(() => {
    // Create node type lookup and node map for risk scores
    const nodeTypeMap = new Map<string, string>()
    const nodeMap = new Map<string, OidSeeNode>()
    for (const node of nodes) {
      nodeTypeMap.set(node.id, node.type)
      nodeMap.set(node.id, node)
    }

    // Get unique node types
    const nodeTypes = Array.from(new Set(nodes.map(n => n.type))).sort()

    // Build matrix
    const matrix = new Map<string, MatrixCell>()
    
    for (const edge of edges) {
      const fromType = nodeTypeMap.get(edge.from) ?? 'Unknown'
      const toType = nodeTypeMap.get(edge.to) ?? 'Unknown'
      const key = `${fromType}:${toType}`
      
      if (!matrix.has(key)) {
        matrix.set(key, {
          fromType,
          toType,
          count: 0,
          avgRisk: 0,
          maxRisk: 0,
          edges: []
        })
      }
      
      const cell = matrix.get(key)!
      cell.count++
      cell.edges.push(edge)
      
      // Get risk score from target node (not from edge)
      const targetNode = nodeMap.get(edge.to)
      const riskScore = targetNode?.risk?.score ?? 0
      if (riskScore > cell.maxRisk) {
        cell.maxRisk = riskScore
      }
    }

    // Calculate average risks based on target node risk scores
    for (const cell of matrix.values()) {
      const risks = cell.edges
        .map(e => {
          const targetNode = nodeMap.get(e.to)
          return targetNode?.risk?.score ?? 0
        })
        .filter(r => r > 0)
      cell.avgRisk = risks.length > 0 
        ? risks.reduce((sum, r) => sum + r, 0) / risks.length 
        : 0
    }

    return { matrix, nodeTypes }
  }, [nodes, edges])

  const getCell = (fromType: string, toType: string): MatrixCell | undefined => {
    return matrixData.matrix.get(`${fromType}:${toType}`)
  }

  // Risk color constants
  const RISK_COLORS = {
    CRITICAL: '#ff4444',
    HIGH: '#ff9933',
    MEDIUM: '#ffcc00',
    LOW: '#99cc00',
    EMPTY: '#f5f5f5'
  }

  const getCellColor = (cell?: MatrixCell): string => {
    if (!cell || cell.count === 0) return RISK_COLORS.EMPTY
    
    // Color based on average risk
    const risk = cell.avgRisk
    if (risk >= 70) return RISK_COLORS.CRITICAL
    if (risk >= 40) return RISK_COLORS.HIGH
    if (risk >= 20) return RISK_COLORS.MEDIUM
    if (risk > 0) return RISK_COLORS.LOW
    
    // Color for edges with no risk data (matches legend #ccccff)
    return '#ccccff'
  }

  const handleCellClick = (fromType: string, toType: string) => {
    const cell = getCell(fromType, toType)
    if (cell && cell.count > 0) {
      setSelectedCell(cell)
      setShowDetails(true)
    }
  }

  const handleDrillDown = () => {
    if (selectedCell && onDrillDown) {
      onDrillDown(selectedCell.edges)
      setShowDetails(false)
    }
  }

  return (
    <div className="matrix-view">
      <div className="matrix-view__header">
        <h3>Relationship Matrix</h3>
        <p className="matrix-view__description">
          Visualizes relationships between node types. Cell color intensity indicates average risk score.
          Click cells to see details and drill down.
        </p>
      </div>

      <div className="matrix-view__container">
        <div className="matrix-view__scroll">
          <table className="matrix-view__table">
            <thead>
              <tr>
                <th className="matrix-view__corner">From \ To</th>
                {matrixData.nodeTypes.map(toType => (
                  <th key={toType} className="matrix-view__header-cell">
                    <div className="matrix-view__header-text">{toType}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixData.nodeTypes.map(fromType => (
                <tr key={fromType}>
                  <th className="matrix-view__row-header">{fromType}</th>
                  {matrixData.nodeTypes.map(toType => {
                    const cell = getCell(fromType, toType)
                    const hasData = cell && cell.count > 0
                    
                    return (
                      <td
                        key={toType}
                        className={`matrix-view__cell${hasData ? ' has-data' : ''}`}
                        style={{ backgroundColor: getCellColor(cell) }}
                        onClick={() => handleCellClick(fromType, toType)}
                        title={
                          hasData
                            ? `${cell.count} edges, Avg Risk: ${cell.avgRisk.toFixed(1)}, Max Risk: ${cell.maxRisk}`
                            : 'No edges'
                        }
                      >
                        {hasData && (
                          <div className="matrix-view__cell-content">
                            <div className="matrix-view__cell-count">{cell.count}</div>
                            {cell.avgRisk > 0 && (
                              <div className="matrix-view__cell-risk">
                                {cell.avgRisk.toFixed(0)}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="matrix-view__legend">
          <h4>Legend</h4>
          <div className="matrix-view__legend-items">
            <div className="matrix-view__legend-item">
              <div className="matrix-view__legend-color" style={{ backgroundColor: '#ff4444' }}></div>
              <span>Critical Risk (≥70)</span>
            </div>
            <div className="matrix-view__legend-item">
              <div className="matrix-view__legend-color" style={{ backgroundColor: '#ff9933' }}></div>
              <span>High Risk (40-69)</span>
            </div>
            <div className="matrix-view__legend-item">
              <div className="matrix-view__legend-color" style={{ backgroundColor: '#ffcc00' }}></div>
              <span>Medium Risk (20-39)</span>
            </div>
            <div className="matrix-view__legend-item">
              <div className="matrix-view__legend-color" style={{ backgroundColor: '#99cc00' }}></div>
              <span>Low Risk (1-19)</span>
            </div>
            <div className="matrix-view__legend-item">
              <div className="matrix-view__legend-color" style={{ backgroundColor: '#ccccff' }}></div>
              <span>No Risk Data</span>
            </div>
          </div>
        </div>
      </div>

      {showDetails && selectedCell && (
        <div className="matrix-view__details-overlay" onClick={() => setShowDetails(false)}>
          <div className="matrix-view__details-panel" onClick={(e) => e.stopPropagation()}>
            <div className="matrix-view__details-header">
              <h3>Cell Details</h3>
              <button className="btn btn--close" onClick={() => setShowDetails(false)}>✕</button>
            </div>
            
            <div className="matrix-view__details-content">
              <div className="matrix-view__detail-row">
                <span className="matrix-view__detail-label">From Type:</span>
                <span className="matrix-view__detail-value">{selectedCell.fromType}</span>
              </div>
              <div className="matrix-view__detail-row">
                <span className="matrix-view__detail-label">To Type:</span>
                <span className="matrix-view__detail-value">{selectedCell.toType}</span>
              </div>
              <div className="matrix-view__detail-row">
                <span className="matrix-view__detail-label">Total Edges:</span>
                <span className="matrix-view__detail-value">{selectedCell.count}</span>
              </div>
              <div className="matrix-view__detail-row">
                <span className="matrix-view__detail-label">Average Risk:</span>
                <span className="matrix-view__detail-value">{selectedCell.avgRisk.toFixed(2)}</span>
              </div>
              <div className="matrix-view__detail-row">
                <span className="matrix-view__detail-label">Max Risk:</span>
                <span className="matrix-view__detail-value">{selectedCell.maxRisk}</span>
              </div>

              <div className="matrix-view__edge-types">
                <h4>Edge Types:</h4>
                <ul>
                  {Array.from(new Set(selectedCell.edges.map(e => e.type))).map(type => {
                    const count = selectedCell.edges.filter(e => e.type === type).length
                    return (
                      <li key={type}>
                        {type}: {count} edge{count !== 1 ? 's' : ''}
                      </li>
                    )
                  })}
                </ul>
              </div>

              {onDrillDown && (
                <button className="btn btn--primary" onClick={handleDrillDown}>
                  View in Table
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

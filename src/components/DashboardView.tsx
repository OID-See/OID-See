import { useState, useEffect } from 'react'
import { OidSeeNode, OidSeeEdge } from '../adapters/types'
import { Selection } from './GraphCanvas'

type DashboardViewProps = {
  nodes: OidSeeNode[]
  edges: OidSeeEdge[]
  onSelection?: (selection: Selection) => void
}

type TenantPosture = {
  collectionAttempted: boolean
  skippedReason?: string
  guestAccess?: string
  crossTenantDefaultStance?: string
  postureRating?: string
  error?: string
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
  tenantPosture: TenantPosture | null
  tierExposure: {
    tier0Count: number
    tier1Count: number
    tier2Count: number
    spWithTier0: number
    spWithTier1: number
    spWithTier2: number
    totalTier0Roles: number
    totalTier1Roles: number
    totalTier2Roles: number
  }
}

// Chunk size for async processing (nodes per chunk)
// Very conservative for iOS Safari's strict memory limits
const CHUNK_SIZE = 250

// Yield delay - increased for iOS Safari to ensure responsiveness
const YIELD_DELAY_MS = 15

// Initial delay before starting calculation (let page stabilize)
const INITIAL_DELAY_MS = 500

// Helper to sleep and yield to event loop
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Detect if we're on a mobile browser (iOS Safari, etc.)
const isMobileBrowser = () => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

export function DashboardView({ nodes, edges, onSelection }: DashboardViewProps) {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [userReady, setUserReady] = useState(false)
  const [isLargeDataset, setIsLargeDataset] = useState(false)

  // Check if dataset is large on mount
  useEffect(() => {
    const large = nodes.length > 10000 || edges.length > 15000
    setIsLargeDataset(large)
    // For small datasets, auto-start. For large datasets on mobile, require user action
    if (!large || !isMobileBrowser()) {
      setUserReady(true)
    }
  }, [nodes.length, edges.length])

  useEffect(() => {
    if (!userReady) return
    
    let cancelled = false
    let timeoutId: number
    
    const calculateStats = async () => {
      // Initial delay to let page stabilize (especially important for iOS)
      await sleep(INITIAL_DELAY_MS)
      if (cancelled) return
      
      setIsCalculating(true)
      setProgress(0)
      
      const nodesByType: Record<string, number> = {}
      const edgesByType: Record<string, number> = {}
      const riskDistribution: Record<string, number> = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        none: 0,
      }
      
      let totalRisk = 0
      let riskCount = 0
      // Keep only top 50 to minimize memory - we only show top 10 anyway
      const topRiskyNodesLimit = 50
      const riskyNodes: Array<{node: OidSeeNode, score: number}> = []
      
      const tierExposure = {
        tier0Count: 0,
        tier1Count: 0,
        tier2Count: 0,
        spWithTier0: 0,
        spWithTier1: 0,
        spWithTier2: 0,
        totalTier0Roles: 0,
        totalTier1Roles: 0,
        totalTier2Roles: 0,
      }
      
      let tenantPosture: TenantPosture | null = null
      
      // Process nodes in smaller chunks with progress updates for iOS Safari
      const totalNodes = nodes.length
      const totalEdges = edges.length
      
      for (let i = 0; i < nodes.length; i += CHUNK_SIZE) {
        if (cancelled) return
        
        const chunk = nodes.slice(i, i + CHUNK_SIZE)
        
        for (const node of chunk) {
          // Count by type
          nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1
          
          // Risk distribution
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
            // Only keep top candidates to limit memory - more aggressive trimming
            if (riskyNodes.length < topRiskyNodesLimit) {
              riskyNodes.push({node, score})
            } else if (score > riskyNodes[riskyNodes.length - 1].score) {
              riskyNodes.push({node, score})
              riskyNodes.sort((a, b) => b.score - a.score)
              riskyNodes.length = topRiskyNodesLimit
            }
          }
          
          // Tier exposure
          if (node.type === 'Role') {
            const tier = node.properties?.tier
            if (tier === 'tier0') tierExposure.tier0Count++
            else if (tier === 'tier1') tierExposure.tier1Count++
            else if (tier === 'tier2') tierExposure.tier2Count++
          } else if (node.type === 'ServicePrincipal') {
            const privilegeReason = node.risk?.reasons?.find(r => r.code === 'PRIVILEGE')
            if (privilegeReason) {
              const tier0 = (privilegeReason as any).rolesReachableTier0 || 0
              const tier1 = (privilegeReason as any).rolesReachableTier1 || 0
              const tier2 = (privilegeReason as any).rolesReachableTier2 || 0
              
              if (tier0 > 0) {
                tierExposure.spWithTier0++
                tierExposure.totalTier0Roles += tier0
              }
              if (tier1 > 0) {
                tierExposure.spWithTier1++
                tierExposure.totalTier1Roles += tier1
              }
              if (tier2 > 0) {
                tierExposure.spWithTier2++
                tierExposure.totalTier2Roles += tier2
              }
            }
          } else if (node.type === 'TenantPolicy' && 
                     node.properties?.policyType === 'externalIdentityPosture') {
            tenantPosture = {
              collectionAttempted: node.properties.collectionAttempted ?? false,
              skippedReason: node.properties.skippedReason,
              guestAccess: node.properties.guestAccess,
              crossTenantDefaultStance: node.properties.crossTenantDefaultStance,
              postureRating: node.properties.postureRating,
              error: node.properties.error,
            }
          }
        }
        
        // Update progress for nodes processing
        const nodeProgress = Math.floor(((i + CHUNK_SIZE) / totalNodes) * 50) // 50% for nodes
        setProgress(Math.min(nodeProgress, 50))
        
        // Yield with longer delay for iOS Safari
        await sleep(YIELD_DELAY_MS)
      }
      
      if (cancelled) return
      
      // Process edges in chunks with reduced processing
      for (let i = 0; i < edges.length; i += CHUNK_SIZE * 2) { // Larger chunks for edges (simpler processing)
        if (cancelled) return
        
        const chunk = edges.slice(i, i + CHUNK_SIZE * 2)
        for (const edge of chunk) {
          edgesByType[edge.type] = (edgesByType[edge.type] ?? 0) + 1
        }
        
        // Update progress for edges processing  
        const edgeProgress = 50 + Math.floor(((i + CHUNK_SIZE * 2) / totalEdges) * 50) // 50-100%
        setProgress(Math.min(edgeProgress, 100))
        
        await sleep(YIELD_DELAY_MS)
      }
      
      if (cancelled) return
      
      // Final sort - riskyNodes should already be mostly sorted
      const topRiskyNodes = riskyNodes.slice(0, 10).map(item => item.node)
      
      const avgRiskScore = riskCount > 0 ? totalRisk / riskCount : 0
      
      setStats({
        totalNodes: nodes.length,
        totalEdges: edges.length,
        nodesByType,
        edgesByType,
        riskDistribution,
        topRiskyNodes,
        avgRiskScore,
        highRiskNodes: riskDistribution.high,
        criticalRiskNodes: riskDistribution.critical,
        tenantPosture,
        tierExposure,
      })
      
      setIsCalculating(false)
      setProgress(0)
    }
    
    timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        calculateStats()
      }
    }, 100) as unknown as number
    
    return () => {
      cancelled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [userReady, nodes, edges])
  
  // Show prompt for large datasets on mobile
  if (!userReady && isLargeDataset) {
    return (
      <div className="dashboard-view">
        <div className="dashboard-view__header">
          <h2>Dashboard Overview</h2>
          <p className="dashboard-view__subtitle">
            Large dataset detected ({nodes.length.toLocaleString()} nodes, {edges.length.toLocaleString()} edges)
          </p>
        </div>
        <div className="dashboard-view__loading">
          <div className="dashboard-view__large-dataset-warning">
            <p>⚠️ This dataset is large and may take significant time to process on mobile devices.</p>
            <p>The Dashboard will calculate statistics for all {nodes.length.toLocaleString()} nodes and {edges.length.toLocaleString()} edges.</p>
            <button 
              className="dashboard-view__start-button"
              onClick={() => setUserReady(true)}
            >
              Calculate Dashboard Statistics
            </button>
            <p className="dashboard-view__hint">
              Tip: Other views (Table, Tree, Matrix, Graph) are available and may be more responsive for large datasets.
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  // Show loading state while calculating
  if (!stats || isCalculating) {
    return (
      <div className="dashboard-view">
        <div className="dashboard-view__header">
          <h2>Dashboard Overview</h2>
          <p className="dashboard-view__subtitle">
            Calculating statistics{progress > 0 ? ` (${progress}%)` : '...'}
          </p>
        </div>
        <div className="dashboard-view__loading">
          <div className="loading-spinner"></div>
          <p>Processing {nodes.length.toLocaleString()} nodes and {edges.length.toLocaleString()} edges...</p>
          {progress > 0 && (
            <div className="loading-progress">
              <div className="loading-progress__bar">
                <div className="loading-progress__fill" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="loading-progress__text">{progress}%</div>
            </div>
          )}
        </div>
      </div>
    )
  }
  
  const statsData = stats
  
  const getRiskClass = (score: number) => {
    if (score >= 70) return 'risk-critical'
    if (score >= 40) return 'risk-high'
    if (score >= 20) return 'risk-medium'
    if (score > 0) return 'risk-low'
    return 'risk-none'
  }

  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
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
            <div className="dashboard-card__value">{statsData.totalNodes.toLocaleString()}</div>
            <div className="dashboard-card__label">Total Nodes</div>
          </div>
        </div>

        <div className="dashboard-card dashboard-card--highlight">
          <div className="dashboard-card__icon">🔗</div>
          <div className="dashboard-card__content">
            <div className="dashboard-card__value">{statsData.totalEdges.toLocaleString()}</div>
            <div className="dashboard-card__label">Total Edges</div>
          </div>
        </div>

        <div className="dashboard-card dashboard-card--warning">
          <div className="dashboard-card__icon">⚠️</div>
          <div className="dashboard-card__content">
            <div className="dashboard-card__value">{statsData.criticalRiskNodes}</div>
            <div className="dashboard-card__label">Critical Risk Nodes</div>
          </div>
        </div>

        <div className="dashboard-card dashboard-card--warning">
          <div className="dashboard-card__icon">⚡</div>
          <div className="dashboard-card__content">
            <div className="dashboard-card__value">{statsData.highRiskNodes}</div>
            <div className="dashboard-card__label">High Risk Nodes</div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card__icon">📈</div>
          <div className="dashboard-card__content">
            <div className="dashboard-card__value">{statsData.avgRiskScore.toFixed(1)}</div>
            <div className="dashboard-card__label">Average Risk Score</div>
          </div>
        </div>

        {/* Tenant Posture Card */}
        {statsData.tenantPosture && statsData.tenantPosture.collectionAttempted && (
          <div className={`dashboard-card dashboard-card--posture dashboard-card--posture-${statsData.tenantPosture.postureRating || 'unknown'}`}>
            <div className="dashboard-card__icon">
              {statsData.tenantPosture.postureRating === 'hardened' && '🛡️'}
              {statsData.tenantPosture.postureRating === 'moderate' && '⚖️'}
              {statsData.tenantPosture.postureRating === 'permissive' && '⚠️'}
              {!statsData.tenantPosture.postureRating && '❓'}
            </div>
            <div className="dashboard-card__content">
              <div className="dashboard-card__value">
                {capitalize(statsData.tenantPosture.postureRating || 'unknown')}
              </div>
              <div className="dashboard-card__label">External Identity Posture</div>
              <div className="dashboard-card__sublabel">
                Guest: {capitalize(statsData.tenantPosture.guestAccess || 'unknown')} | 
                Cross-Tenant: {capitalize(statsData.tenantPosture.crossTenantDefaultStance || 'unknown')}
              </div>
            </div>
          </div>
        )}

        {/* Privilege Tier Exposure */}
        <div className="dashboard-section dashboard-section--span-2">
          <h3>🔐 Privilege Tier Exposure</h3>
          <p className="dashboard-section__subtitle">
            Service principals with reachable directory roles by tier
          </p>
          <div className="dashboard-grid dashboard-grid--tier">
            <div className="dashboard-card dashboard-card--tier0">
              <div className="dashboard-card__header">
                <div className="dashboard-card__icon">🔴</div>
                <div className="dashboard-card__title">Tier 0</div>
              </div>
              <div className="dashboard-card__content">
                <div className="dashboard-card__value">{statsData.tierExposure.spWithTier0}</div>
                <div className="dashboard-card__label">Service Principals</div>
                <div className="dashboard-card__secondary">{statsData.tierExposure.totalTier0Roles} role assignments</div>
              </div>
              <div className="dashboard-card__footer">
                Horizontal/Global Control
              </div>
            </div>
            
            <div className="dashboard-card dashboard-card--tier1">
              <div className="dashboard-card__header">
                <div className="dashboard-card__icon">🟠</div>
                <div className="dashboard-card__title">Tier 1</div>
              </div>
              <div className="dashboard-card__content">
                <div className="dashboard-card__value">{statsData.tierExposure.spWithTier1}</div>
                <div className="dashboard-card__label">Service Principals</div>
                <div className="dashboard-card__secondary">{statsData.tierExposure.totalTier1Roles} role assignments</div>
              </div>
              <div className="dashboard-card__footer">
                Critical Services
              </div>
            </div>
            
            <div className="dashboard-card dashboard-card--tier2">
              <div className="dashboard-card__header">
                <div className="dashboard-card__icon">🟡</div>
                <div className="dashboard-card__title">Tier 2</div>
              </div>
              <div className="dashboard-card__content">
                <div className="dashboard-card__value">{statsData.tierExposure.spWithTier2}</div>
                <div className="dashboard-card__label">Service Principals</div>
                <div className="dashboard-card__secondary">{statsData.tierExposure.totalTier2Roles} role assignments</div>
              </div>
              <div className="dashboard-card__footer">
                Scoped/Operational
              </div>
            </div>
          </div>
        </div>

        {/* Nodes by Type */}
        <div className="dashboard-section dashboard-section--span-2">
          <h3>Nodes by Type</h3>
          <div className="dashboard-chart">
            {Object.entries(statsData.nodesByType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => {
                const percentage = (count / statsData.totalNodes) * 100
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
            {Object.entries(statsData.riskDistribution)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([level, count]) => {
                const percentage = (count / statsData.totalNodes) * 100
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
            {Object.entries(statsData.edgesByType)
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
            {statsData.topRiskyNodes.map((node) => (
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

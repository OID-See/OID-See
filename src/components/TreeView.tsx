import { useState, useMemo } from 'react'
import { OidSeeNode, OidSeeEdge, OidSeeNodeType } from '../adapters/types'
import { Selection } from './GraphCanvas'

type TreeNode = {
  id: string
  label: string
  type: 'group' | 'node'
  nodeType?: OidSeeNodeType
  children?: TreeNode[]
  data?: OidSeeNode
  isExpanded?: boolean
  riskScore?: number
  count?: number
}

type TreeViewProps = {
  nodes: OidSeeNode[]
  edges: OidSeeEdge[]
  onSelection?: (selection: Selection) => void
  onVisualize?: (nodeIds: string[]) => void
}

export function TreeView({ nodes, edges, onSelection, onVisualize }: TreeViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['ServicePrincipal', 'Application']))
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterText, setFilterText] = useState('')

  // Group nodes by type
  const treeData = useMemo(() => {
    // Filter nodes first
    const filteredNodes = filterText.trim()
      ? nodes.filter(n => 
          n.displayName.toLowerCase().includes(filterText.toLowerCase()) ||
          n.id.toLowerCase().includes(filterText.toLowerCase()) ||
          n.type.toLowerCase().includes(filterText.toLowerCase())
        )
      : nodes

    // Group by type
    const groups = new Map<string, OidSeeNode[]>()
    for (const node of filteredNodes) {
      if (!groups.has(node.type)) {
        groups.set(node.type, [])
      }
      groups.get(node.type)!.push(node)
    }

    // Convert to tree structure
    const tree: TreeNode[] = []
    
    // Sort groups by risk (highest first) and then by name
    const sortedTypes = Array.from(groups.keys()).sort((a, b) => {
      const aNodes = groups.get(a)!
      const bNodes = groups.get(b)!
      const aMaxRisk = Math.max(...aNodes.map(n => n.risk?.score ?? 0))
      const bMaxRisk = Math.max(...bNodes.map(n => n.risk?.score ?? 0))
      if (aMaxRisk !== bMaxRisk) return bMaxRisk - aMaxRisk
      return a.localeCompare(b)
    })

    for (const type of sortedTypes) {
      const typeNodes = groups.get(type)!
      
      // Calculate aggregated risk
      const riskScores = typeNodes.map(n => n.risk?.score ?? 0).filter(s => s > 0)
      const avgRisk = riskScores.length > 0 
        ? riskScores.reduce((sum, s) => sum + s, 0) / riskScores.length 
        : 0
      const maxRisk = riskScores.length > 0 ? Math.max(...riskScores) : 0

      // Sort nodes within group by risk score
      const sortedNodes = [...typeNodes].sort((a, b) => {
        const scoreA = a.risk?.score ?? 0
        const scoreB = b.risk?.score ?? 0
        if (scoreA !== scoreB) return scoreB - scoreA
        return a.displayName.localeCompare(b.displayName)
      })

      const children: TreeNode[] = sortedNodes.map(node => ({
        id: node.id,
        label: node.displayName,
        type: 'node' as const,
        nodeType: node.type,
        data: node,
        riskScore: node.risk?.score ?? 0,
      }))

      tree.push({
        id: type,
        label: `${type} (${typeNodes.length})`,
        type: 'group' as const,
        nodeType: type as OidSeeNodeType,
        children,
        isExpanded: expandedGroups.has(type),
        riskScore: maxRisk,
        count: typeNodes.length,
      })
    }

    return tree
  }, [nodes, expandedGroups, filterText])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const expandAll = () => {
    const allGroups = treeData.map(g => g.id)
    setExpandedGroups(new Set(allGroups))
  }

  const collapseAll = () => {
    setExpandedGroups(new Set())
  }

  const toggleNodeSelection = (nodeId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const selectGroup = (group: TreeNode) => {
    if (group.children) {
      const nodeIds = group.children.map(c => c.id)
      setSelectedIds(prev => {
        const next = new Set(prev)
        for (const id of nodeIds) {
          next.add(id)
        }
        return next
      })
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const visualizeSelected = () => {
    if (onVisualize && selectedIds.size > 0) {
      onVisualize(Array.from(selectedIds))
    }
  }

  const getRiskBadgeClass = (score?: number) => {
    if (!score || score === 0) return 'risk-badge risk-badge--none'
    if (score >= 70) return 'risk-badge risk-badge--critical'
    if (score >= 40) return 'risk-badge risk-badge--high'
    if (score >= 20) return 'risk-badge risk-badge--medium'
    return 'risk-badge risk-badge--low'
  }

  return (
    <div className="tree-view">
      <div className="tree-view__header">
        <div className="tree-view__controls">
          <input
            type="text"
            placeholder="Filter nodes..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="input"
          />
          
          <div className="tree-view__actions">
            <button className="btn btn--sm" onClick={expandAll}>
              Expand All
            </button>
            <button className="btn btn--sm" onClick={collapseAll}>
              Collapse All
            </button>
            <button 
              className="btn btn--sm" 
              onClick={clearSelection}
              disabled={selectedIds.size === 0}
            >
              Clear Selection
            </button>
            {onVisualize && (
              <button 
                className="btn btn--sm btn--primary" 
                onClick={visualizeSelected}
                disabled={selectedIds.size === 0}
              >
                Visualize Selected ({selectedIds.size})
              </button>
            )}
          </div>
        </div>

        <div className="tree-view__stats">
          <span>Showing {nodes.length.toLocaleString()} nodes in {treeData.length} groups</span>
        </div>
      </div>

      <div className="tree-view__container">
        {treeData.map((group) => (
          <div key={group.id} className="tree-group">
            <div className="tree-group__header">
              <button
                className="tree-group__toggle"
                onClick={() => toggleGroup(group.id)}
              >
                {group.isExpanded ? '▼' : '▶'}
              </button>
              <span className="tree-group__label">{group.label}</span>
              {group.riskScore !== undefined && group.riskScore > 0 && (
                <span className={getRiskBadgeClass(group.riskScore)}>
                  Max Risk: {group.riskScore}
                </span>
              )}
              <button
                className="btn btn--xs tree-group__select-btn"
                onClick={() => selectGroup(group)}
              >
                Select All
              </button>
            </div>

            {group.isExpanded && group.children && (
              <div className="tree-group__children">
                {group.children.map((child) => (
                  <div
                    key={child.id}
                    className={`tree-node${selectedIds.has(child.id) ? ' selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(child.id)}
                      onChange={() => toggleNodeSelection(child.id)}
                      className="tree-node__checkbox"
                    />
                    <span className="tree-node__label">{child.label}</span>
                    {child.riskScore !== undefined && child.riskScore > 0 && (
                      <span className={getRiskBadgeClass(child.riskScore)}>
                        {child.riskScore}
                      </span>
                    )}
                    <button
                      className="btn btn--xs tree-node__view-btn"
                      onClick={() => {
                        if (onSelection && child.data) {
                          onSelection({
                            kind: 'node',
                            id: child.id,
                            oidsee: child.data
                          })
                        }
                      }}
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

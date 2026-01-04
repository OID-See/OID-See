import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { OidSeeNode, OidSeeEdge } from '../adapters/types'
import { Selection } from './GraphCanvas'

type DataItem = (OidSeeNode | OidSeeEdge) & { __itemType: 'node' | 'edge' }

type SortConfig = {
  key: string
  direction: 'asc' | 'desc'
}

type TableViewProps = {
  nodes: OidSeeNode[]
  edges: OidSeeEdge[]
  onSelection?: (selection: Selection) => void
  onVisualize?: (items: DataItem[]) => void
}

const ITEMS_PER_PAGE = 50
const VISIBLE_ROWS_BUFFER = 10

export function TableView({ nodes, edges, onSelection, onVisualize }: TableViewProps) {
  const [dataType, setDataType] = useState<'nodes' | 'edges' | 'both'>('nodes')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'displayName', direction: 'asc' })
  const [filterText, setFilterText] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Prepare data with item type marker
  const allData = useMemo(() => {
    const data: DataItem[] = []
    
    if (dataType === 'nodes' || dataType === 'both') {
      data.push(...nodes.map(n => ({ ...n, __itemType: 'node' as const })))
    }
    
    if (dataType === 'edges' || dataType === 'both') {
      data.push(...edges.map(e => ({ ...e, __itemType: 'edge' as const })))
    }
    
    return data
  }, [nodes, edges, dataType])

  // Filter data
  const filteredData = useMemo(() => {
    if (!filterText.trim()) return allData
    
    const lowerFilter = filterText.toLowerCase()
    return allData.filter(item => {
      const searchStr = JSON.stringify(item).toLowerCase()
      return searchStr.includes(lowerFilter)
    })
  }, [allData, filterText])

  // Sort data
  const sortedData = useMemo(() => {
    const sorted = [...filteredData]
    const { key, direction } = sortConfig
    
    sorted.sort((a, b) => {
      let aVal: any
      let bVal: any
      
      // Handle nested keys like 'risk.score'
      if (key.includes('.')) {
        const keys = key.split('.')
        aVal = keys.reduce((obj, k) => obj?.[k], a as any)
        bVal = keys.reduce((obj, k) => obj?.[k], b as any)
      } else {
        aVal = (a as any)[key]
        bVal = (b as any)[key]
      }
      
      // Handle null/undefined
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      
      // Compare
      let comparison = 0
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal)
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal
      } else {
        comparison = String(aVal).localeCompare(String(bVal))
      }
      
      return direction === 'asc' ? comparison : -comparison
    })
    
    return sorted
  }, [filteredData, sortConfig])

  // Virtual scrolling calculations
  const ROW_HEIGHT = 48
  const totalItems = sortedData.length
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VISIBLE_ROWS_BUFFER)
  const endIndex = Math.min(totalItems, startIndex + ITEMS_PER_PAGE + VISIBLE_ROWS_BUFFER * 2)
  const visibleData = sortedData.slice(startIndex, endIndex)
  const offsetY = startIndex * ROW_HEIGHT
  const totalHeight = totalItems * ROW_HEIGHT

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // Handle sort
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Handle row selection
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(sortedData.map(item => item.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // Export selected items
  const exportSelected = () => {
    const selected = sortedData.filter(item => selectedIds.has(item.id))
    const dataStr = JSON.stringify(selected, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    // Sanitize dataType and format timestamp for valid filename
    const sanitizedType = dataType.replace(/[^a-zA-Z0-9-_]/g, '-')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    a.download = `oidsee-export-${sanitizedType}-${timestamp}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Visualize selected items
  const visualizeSelected = () => {
    if (onVisualize) {
      const selected = sortedData.filter(item => selectedIds.has(item.id))
      onVisualize(selected)
    }
  }

  // Get columns based on data type
  const columns = useMemo(() => {
    if (dataType === 'nodes') {
      return [
        { key: 'id', label: 'ID', width: '150px' },
        { key: 'type', label: 'Type', width: '150px' },
        { key: 'displayName', label: 'Display Name', width: '250px' },
        { key: 'risk.score', label: 'Risk Score', width: '100px' },
        { key: 'risk.level', label: 'Risk Level', width: '100px' },
      ]
    } else if (dataType === 'edges') {
      return [
        { key: 'id', label: 'ID', width: '150px' },
        { key: 'type', label: 'Type', width: '150px' },
        { key: 'from', label: 'From', width: '150px' },
        { key: 'to', label: 'To', width: '150px' },
        { key: 'risk.score', label: 'Risk Score', width: '100px' },
      ]
    } else {
      return [
        { key: 'id', label: 'ID', width: '150px' },
        { key: '__itemType', label: 'Item Type', width: '100px' },
        { key: 'type', label: 'Type', width: '150px' },
        { key: 'displayName', label: 'Name', width: '200px' },
        { key: 'risk.score', label: 'Risk Score', width: '100px' },
      ]
    }
  }, [dataType])

  // Get cell value
  const getCellValue = (item: DataItem, key: string): string => {
    if (key.includes('.')) {
      const keys = key.split('.')
      const value = keys.reduce((obj, k) => obj?.[k], item as any)
      return value != null ? String(value) : '-'
    }
    const value = (item as any)[key]
    return value != null ? String(value) : '-'
  }

  return (
    <div className="table-view">
      <div className="table-view__header">
        <div className="table-view__controls">
          <div className="table-view__filter">
            <input
              type="text"
              placeholder="Filter data..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="input"
            />
          </div>
          
          <div className="table-view__type-selector">
            <label>Show:</label>
            <select value={dataType} onChange={(e) => {
              setDataType(e.target.value as any)
              setCurrentPage(0)
              clearSelection()
            }} className="select">
              <option value="nodes">Nodes Only</option>
              <option value="edges">Edges Only</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>

        <div className="table-view__stats">
          <span>Showing {sortedData.length.toLocaleString()} of {allData.length.toLocaleString()} items</span>
          {selectedIds.size > 0 && <span>({selectedIds.size} selected)</span>}
        </div>

        <div className="table-view__actions">
          <button 
            className="btn btn--sm" 
            onClick={selectAll}
            disabled={sortedData.length === 0}
          >
            Select All
          </button>
          <button 
            className="btn btn--sm" 
            onClick={clearSelection}
            disabled={selectedIds.size === 0}
          >
            Clear
          </button>
          <button 
            className="btn btn--sm" 
            onClick={exportSelected}
            disabled={selectedIds.size === 0}
          >
            Export Selected
          </button>
          {onVisualize && (
            <button 
              className="btn btn--sm btn--primary" 
              onClick={visualizeSelected}
              disabled={selectedIds.size === 0}
            >
              Visualize Selected
            </button>
          )}
        </div>
      </div>

      <div className="table-view__container" ref={containerRef} onScroll={handleScroll}>
        <div style={{ height: totalHeight, position: 'relative' }}>
          <table className="table-view__table" style={{ transform: `translateY(${offsetY}px)` }}>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === sortedData.length && sortedData.length > 0}
                    onChange={() => selectedIds.size === sortedData.length ? clearSelection() : selectAll()}
                  />
                </th>
                {columns.map(col => (
                  <th 
                    key={col.key} 
                    style={{ width: col.width, cursor: 'pointer' }}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {sortConfig.key === col.key && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
                      </span>
                    )}
                  </th>
                ))}
                <th style={{ width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleData.map((item) => (
                <tr 
                  key={item.id}
                  className={selectedIds.has(item.id) ? 'selected' : ''}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelection(item.id)}
                    />
                  </td>
                  {columns.map(col => (
                    <td key={col.key} style={{ width: col.width }}>
                      {getCellValue(item, col.key)}
                    </td>
                  ))}
                  <td>
                    <button
                      className="btn btn--xs"
                      onClick={() => {
                        if (onSelection) {
                          onSelection({
                            kind: item.__itemType,
                            id: item.id,
                            oidsee: item
                          })
                        }
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

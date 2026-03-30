import { useEffect, useMemo, useState, useRef, useCallback, startTransition } from 'react'
import { GraphCanvas, Selection, GraphCanvasHandle, PhysicsConfig, DEFAULT_PHYSICS } from './components/GraphCanvas'
import { VisData } from './adapters/toVisData'
import sampleObj from './samples/sample-oidsee-graph.json'
import { DetailsPanel } from './components/DetailsPanel'
import { FilterBar, Lens } from './components/FilterBar'
import { parseQuery, evalClause } from './filters/query'
import { lensEdgeAllowed } from './filters/lens'
import { ErrorDialog } from './components/ErrorDialog'
import { InfoDialog } from './components/InfoDialog'
import { PhysicsControls } from './components/PhysicsControls'
import { ResizeHandle } from './components/ResizeHandle'
import { Legend } from './components/Legend'
import { LoadingOverlay } from './components/LoadingOverlay'
import { OidSeeNode, OidSeeEdge } from './adapters/types'
import { ViewMode } from './types/ViewMode'
import { ViewModeSelector } from './components/ViewModeSelector'
import { TableView } from './components/TableView'
import { TreeView } from './components/TreeView'
import { MatrixView } from './components/MatrixView'
import { DashboardView } from './components/DashboardView'

type SavedQuery = { name: string; query: string }

const MAX_RENDERABLE_NODES = 3000
const MAX_RENDERABLE_EDGES = 4500
const MAX_SUBSET_VISUALIZATION_NODES = 500
const FILE_SIZE_MEDIUM_MB = 1
const FILE_SIZE_LARGE_MB = 5
const FILE_SIZE_VERY_LARGE_MB = 30
const RESPONSIVE_BREAKPOINT = 1100
const MOBILE_DETAILS_WIDTH = 240
const DETAILS_AUTO_EXPAND_DELAY = 100
const SCROLL_DELAY_OFFSET = 50
const GRAPH_RESTABILIZE_DELAY = 100

function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/u

const PRESET_QUERIES: SavedQuery[] = [
  { name: 'Service Principals', query: 'n.type=ServicePrincipal' },
  { name: 'Applications', query: 'n.type=Application' },
  { name: 'Users', query: 'n.type=User' },
  { name: 'Groups', query: 'n.type=Group' },
  { name: 'Roles', query: 'n.type=Role' },
  { name: 'Resource APIs', query: 'n.type=ResourceApi' },
  { name: 'High Risk', query: 'n.risk.score>=70' },
  { name: 'Medium Risk', query: 'n.risk.score>=40 n.risk.score<70' },
  { name: 'Low Risk', query: 'n.risk.score<40' },
  { name: 'Can Impersonate', query: 'e.type=CAN_IMPERSONATE' },
  { name: 'Has App Roles', query: 'e.type=HAS_APP_ROLE' },
  { name: 'Has Directory Roles', query: 'e.type=HAS_ROLE' },
  { name: 'Privileged Scopes', query: 'e.type=HAS_SCOPES e.properties.scopeRiskClass~privileged' },
  { name: 'ReadWrite.All Scopes', query: 'e.type=HAS_SCOPES e.properties.scopeRiskClass=readwrite_all' },
  { name: 'Action Scopes', query: 'e.type=HAS_SCOPES e.properties.scopeRiskClass=action_privileged' },
  { name: 'Too Many Scopes', query: 'e.type=HAS_SCOPES e.properties.scopeRiskClass=too_broad' },
  { name: 'Offline Access', query: 'e.type=HAS_OFFLINE_ACCESS' },
  { name: 'Has Tier 0 Roles', query: 'n.risk.reasons~PRIVILEGE n.type=ServicePrincipal' },
  { name: 'Tier 0 Roles', query: 'n.type=Role n.properties.tier=tier0' },
  { name: 'Tier 1 Roles', query: 'n.type=Role n.properties.tier=tier1' },
  { name: 'Tier 2 Roles', query: 'n.type=Role n.properties.tier=tier2' },
  { name: 'Service Principals with Password Credentials', query: 'n.type=ServicePrincipal n.properties.credentialInsights.active_password_credentials>0' },
  { name: 'Service Principals with Key Credentials', query: 'n.type=ServicePrincipal n.properties.credentialInsights.active_key_credentials>0' },
  { name: 'Unverified Publishers', query: 'n.type=ServicePrincipal n.properties.verifiedPublisher.displayName=null' },
  { name: 'Service Principals Without Owners', query: 'n.risk.reasons~NO_OWNERS' },
  { name: 'Broad Reachability Service Principals', query: 'n.risk.reasons~BROAD_REACHABILITY' },
  { name: 'Identity Laundering Suspected', query: 'n.properties.trustSignals.identityLaunderingSuspected=true' },
  { name: 'Service Principals Not Requiring Assignment', query: 'n.type=ServicePrincipal n.properties.requiresAssignment=false' },
  { name: 'Service Principals with Reply URLs', query: 'n.properties.replyUrlAnalysis.total_urls>0' },
  { name: 'Service Principals with Non-HTTPS URLs', query: 'n.properties.replyUrlAnalysis.non_https_urls.length>0' },
  { name: 'Expired Credentials Present', query: 'n.properties.credentialInsights.expired_but_present.length>0' },
  { name: 'Long Lived Secrets', query: 'n.properties.credentialInsights.long_lived_secrets.length>0' },
  { name: 'App Ownership', query: 'e.type=OWNS' },
  { name: 'App Instances', query: 'e.type=INSTANCE_OF' },
  { name: 'App Assignments', query: 'e.type=ASSIGNED_TO' },
  { name: 'High Risk with Credentials', query: 'n.risk.score>=70 n.properties.credentialInsights.active_password_credentials>0' },
  { name: 'Unverified with Offline Access', query: 'n.properties.verifiedPublisher.displayName=null e.type=HAS_OFFLINE_ACCESS' },
  { name: 'Impersonation Capable Service Principals', query: 'e.type=CAN_IMPERSONATE e.properties.markers~user_impersonation' },
]

function loadPhysicsConfig(): PhysicsConfig {
  try {
    const raw = localStorage.getItem('oidsee.physicsConfig')
    if (raw) return { ...DEFAULT_PHYSICS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return DEFAULT_PHYSICS
}

function savePhysicsConfig(config: PhysicsConfig) {
  try { localStorage.setItem('oidsee.physicsConfig', JSON.stringify(config)) } catch { /* ignore */ }
}

function createDisabledPhysicsConfig(): PhysicsConfig {
  return { ...DEFAULT_PHYSICS, gravitationalConstant: 0, springConstant: 0 }
}

function loadSaved(): SavedQuery[] {
  try {
    const raw = localStorage.getItem('oidsee.savedQueries')
    let arr: SavedQuery[] = []
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) arr = parsed.filter(x => x && typeof x.name === 'string' && typeof x.query === 'string')
    }
    if (arr.length === 0) { arr = PRESET_QUERIES; saveSaved(arr) }
    return arr
  } catch { return PRESET_QUERIES }
}

function saveSaved(arr: SavedQuery[]) {
  try { localStorage.setItem('oidsee.savedQueries', JSON.stringify(arr)) } catch { /* ignore */ }
}

/**
 * Apply query/lens filtering to vis-network format data.
 * Only used for the graph view (≤3000 nodes) — stays on main thread.
 */
function applyQuery(data: VisData, query: string, lens: Lens, pathAware: boolean) {
  const parsed = parseQuery(query)
  const clauses = parsed.clauses
  const nodeClauses = clauses.filter(c => c.target === 'node' || c.target === 'both')
  const edgeClauses = clauses.filter(c => c.target === 'edge' || c.target === 'both')

  const nodePass = new Set<string>()
  if (nodeClauses.length > 0) {
    for (const n of data.nodes) {
      const raw = n.__oidsee ?? n
      if (nodeClauses.every(c => evalClause(raw, c))) nodePass.add(n.id)
    }
  } else {
    for (const n of data.nodes) nodePass.add(n.id)
  }

  const edgeById = new Map<string, any>()
  for (const e of data.edges) edgeById.set(e.id, e)

  const edgesOut: any[] = []
  const edgesKept = new Set<string>()

  for (const e of data.edges) {
    const raw = e.__oidsee ?? e
    const edgeType = raw.type ?? e.label ?? ''
    if (!lensEdgeAllowed(lens, edgeType)) continue
    if (!edgeClauses.every(c => evalClause(raw, c))) continue
    if (!nodePass.has(e.from) || !nodePass.has(e.to)) continue
    if (!edgesKept.has(e.id)) { edgesOut.push(e); edgesKept.add(e.id) }
    if (pathAware && raw?.derived?.isDerived && Array.isArray(raw.derived.inputs)) {
      for (const id of raw.derived.inputs) {
        const inp = edgeById.get(id)
        if (inp && !edgesKept.has(inp.id)) {
          const inpRaw = inp.__oidsee ?? inp
          const inpType = inpRaw.type ?? inp.label ?? ''
          if (nodePass.has(inp.from) && nodePass.has(inp.to) && lensEdgeAllowed(lens, inpType)) {
            edgesOut.push(inp); edgesKept.add(inp.id)
          }
        }
      }
    }
  }

  const nodesWithEdges = new Set<string>()
  for (const e of edgesOut) { nodesWithEdges.add(e.from); nodesWithEdges.add(e.to) }

  return {
    nodes: data.nodes.filter(n => {
      if (!nodePass.has(n.id)) return false
      if (lens === 'full') return true
      return nodesWithEdges.has(n.id)
    }),
    edges: edgesOut,
    parsed,
  }
}

export default function App() {
  // ─── Worker ref ────────────────────────────────────────────────────────────
  const workerRef = useRef<Worker | null>(null)
  const filterReqIdRef = useRef(0)

  // ─── Data state (populated by worker) ──────────────────────────────────────
  const [totalNodeCount, setTotalNodeCount] = useState<number>(0)
  const [totalEdgeCount, setTotalEdgeCount] = useState<number>(0)
  const [filteredNodes, setFilteredNodes] = useState<OidSeeNode[]>([])
  const [filteredEdges, setFilteredEdges] = useState<OidSeeEdge[]>([])
  const [warnings, setWarnings] = useState<string[]>([])

  // ─── Graph view state (vis-network format, populated by worker on demand) ──
  const [data, setData] = useState<VisData | null>(null)
  const [graphViewLoading, setGraphViewLoading] = useState<boolean>(false)
  const [graphError, setGraphError] = useState<string | null>(null)

  // ─── UI state ──────────────────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [query, setQuery] = useState<string>('')
  const [lens, setLens] = useState<Lens>('full')
  const [pathAware, setPathAware] = useState<boolean>(true)
  const [saved, setSaved] = useState<SavedQuery[]>([])
  const [filterCollapsed, setFilterCollapsed] = useState<boolean>(false)
  const [detailsCollapsed, setDetailsCollapsed] = useState<boolean>(true)
  const [detailsManuallyCollapsed, setDetailsManuallyCollapsed] = useState<boolean>(false)
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [isPortrait, setIsPortrait] = useState<boolean>(false)
  const [physicsConfig, setPhysicsConfig] = useState<PhysicsConfig>(DEFAULT_PHYSICS)
  const [detailsWidth, setDetailsWidth] = useState<number>(360)
  const [maximizedPanel, setMaximizedPanel] = useState<'graph' | 'details' | 'filter' | null>(null)
  const [viewportWidth, setViewportWidth] = useState<number>(1280)
  const [legendVisible, setLegendVisible] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [loadingProgress, setLoadingProgress] = useState<string>('')
  const [largeGraphWarning, setLargeGraphWarning] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [viewsReady, setViewsReady] = useState<Set<ViewMode>>(new Set())

  const graphRef = useRef<GraphCanvasHandle>(null)
  const detailsPanelRef = useRef<HTMLElement>(null)

  // ─── Worker initialisation ─────────────────────────────────────────────────
  useEffect(() => {
    const worker = new Worker(
      new URL('./workers/dataWorker.ts', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data
      switch (msg.type) {
        case 'PROGRESS':
          setLoadingProgress(msg.message)
          break

        case 'LOADED': {
          const { nodeCount, edgeCount, exceedsGraphLimits } = msg
          setTotalNodeCount(nodeCount)
          setTotalEdgeCount(edgeCount)
          if (exceedsGraphLimits) {
            setLargeGraphWarning(
              `Large dataset: ${nodeCount.toLocaleString()} nodes, ${edgeCount.toLocaleString()} edges. ` +
              `Graph view will be capped at ${MAX_RENDERABLE_NODES.toLocaleString()} highest-risk nodes when loaded. ` +
              `Table, Tree, Matrix and Dashboard views show the full dataset.`
            )
            const physicsDisabled = createDisabledPhysicsConfig()
            setPhysicsConfig(physicsDisabled)
            savePhysicsConfig(physicsDisabled)
          }
          const ready: ViewMode[] = ['dashboard', 'table', 'tree', 'matrix']
          if (!isIOS()) ready.push('graph')
          setViewsReady(new Set(ready))
          setLoading(false)
          setLoadingProgress('')
          break
        }

        case 'FILTERED': {
          const { id, nodes, edges, warnings: w } = msg
          // Discard stale responses
          if (id !== 0 && id < filterReqIdRef.current) break
          startTransition(() => {
            setFilteredNodes(nodes as OidSeeNode[])
            setFilteredEdges(edges as OidSeeEdge[])
            setWarnings(w)
          })
          break
        }

        case 'GRAPH_READY': {
          const { nodes: visNodes, edges: visEdges } = msg
          setData({ nodes: visNodes, edges: visEdges })
          setViewsReady(prev => new Set([...prev, 'graph']))
          setGraphViewLoading(false)
          setLoadingProgress('')
          break
        }

        case 'ERROR':
          setError(msg.message)
          setLoading(false)
          setGraphViewLoading(false)
          setLoadingProgress('')
          break
      }
    }

    worker.onerror = (err) => {
      console.error('[OID-See] Worker error:', err)
      setError('Worker error: ' + err.message)
      setLoading(false)
      setGraphViewLoading(false)
    }

    workerRef.current = worker
    return () => { worker.terminate(); workerRef.current = null }
  }, [])

  // ─── Send FILTER message when filters change ────────────────────────────────
  useEffect(() => {
    if (totalNodeCount === 0) return
    const id = ++filterReqIdRef.current
    workerRef.current?.postMessage({ type: 'FILTER', id, query: query.trim(), lens, pathAware })
  }, [query, lens, pathAware, totalNodeCount])

  // ─── Load physics config on mount ──────────────────────────────────────────
  useEffect(() => { setPhysicsConfig(loadPhysicsConfig()) }, [])

  // ─── Viewport tracking ─────────────────────────────────────────────────────
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      setIsMobile(width <= 768)
      setIsPortrait(width <= 768 && height > width)
      setViewportWidth(width)
    }
    checkMobile()
    let timeoutId: ReturnType<typeof setTimeout>
    const debouncedResize = () => { clearTimeout(timeoutId); timeoutId = setTimeout(checkMobile, 150) }
    window.addEventListener('resize', debouncedResize)
    return () => { clearTimeout(timeoutId); window.removeEventListener('resize', debouncedResize) }
  }, [])

  useEffect(() => { setSaved(loadSaved()) }, [])

  // ─── Auto-expand details panel when selection changes ──────────────────────
  useEffect(() => {
    if (selection && detailsCollapsed && !detailsManuallyCollapsed) {
      setDetailsCollapsed(false)
      if (isPortrait && detailsPanelRef.current) {
        setTimeout(() => {
          detailsPanelRef.current!.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, DETAILS_AUTO_EXPAND_DELAY + SCROLL_DELAY_OFFSET)
      }
    }
  }, [selection, detailsCollapsed, detailsManuallyCollapsed, isPortrait])

  // ─── Reset physics when graph data changes ─────────────────────────────────
  useEffect(() => {
    if (data) { setPhysicsConfig(DEFAULT_PHYSICS); savePhysicsConfig(DEFAULT_PHYSICS) }
  }, [data])

  // ─── Restabilize graph when filters change ─────────────────────────────────
  useEffect(() => {
    if (data && graphRef.current) {
      const timer = setTimeout(() => { graphRef.current?.restabilize() }, GRAPH_RESTABILIZE_DELAY)
      return () => clearTimeout(timer)
    }
  }, [lens, pathAware, query, data])

  // ─── Layout ────────────────────────────────────────────────────────────────
  const mainGridStyle = useMemo(() => {
    if (maximizedPanel) return {}
    if (isPortrait) return {}
    const effectiveDetailsWidth = viewportWidth <= RESPONSIVE_BREAKPOINT ? MOBILE_DETAILS_WIDTH : detailsWidth
    if (detailsCollapsed) return { gridTemplateColumns: '1fr 8px 80px' }
    return { gridTemplateColumns: `1fr 8px ${effectiveDetailsWidth}px` }
  }, [maximizedPanel, detailsCollapsed, detailsWidth, viewportWidth, isPortrait])

  const counts = useMemo(() => {
    if (totalNodeCount === 0) return undefined
    return {
      nodes: filteredNodes.length,
      edges: filteredEdges.length,
      totalNodes: totalNodeCount,
      totalEdges: totalEdgeCount,
    }
  }, [totalNodeCount, totalEdgeCount, filteredNodes.length, filteredEdges.length])

  // ─── Filtered vis-network data for graph view (fast, ≤3000 nodes) ──────────
  const filtered = useMemo(() => {
    if (!data) return null
    try { return applyQuery(data, query.trim(), lens, pathAware) }
    catch { return data }
  }, [data, query, lens, pathAware])

  // ─── Memoised lookup maps for graph focus ──────────────────────────────────
  const nodeMap = useMemo(() => {
    if (!data) return new Map<string, any>()
    return new Map(data.nodes.map(n => [n.id, n]))
  }, [data])

  const edgeMap = useMemo(() => {
    if (!data) return new Map<string, any>()
    return new Map(data.edges.map(e => [e.id, e]))
  }, [data])

  // ─── Load text into worker ─────────────────────────────────────────────────
  function loadText(text: string) {
    setError(null)
    setData(null)
    setFilteredNodes([])
    setFilteredEdges([])
    setTotalNodeCount(0)
    setTotalEdgeCount(0)
    setWarnings([])
    setSelection(null)
    setLargeGraphWarning(null)
    setViewsReady(new Set())
    setLoading(true)
    setLoadingProgress('Sending to worker…')
    workerRef.current?.postMessage({ type: 'LOAD', text })
  }

  async function readFile(file: File) {
    const sizeMB = file.size / 1024 / 1024
    const sizeLabel = sizeMB < FILE_SIZE_MEDIUM_MB ? `Small (${sizeMB.toFixed(1)} MB)`
      : sizeMB < FILE_SIZE_LARGE_MB ? `Medium (${sizeMB.toFixed(1)} MB)`
      : sizeMB < FILE_SIZE_VERY_LARGE_MB ? `Large (${sizeMB.toFixed(1)} MB)`
      : `Very Large (${sizeMB.toFixed(1)} MB)`
    console.log('[OID-See] 📁 File upload started:', { name: file.name, size: sizeLabel })
    setLoading(true)
    setLoadingProgress(`Reading ${sizeLabel} file…`)
    try {
      const text = await file.text()
      loadText(text)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to read file')
      setLoading(false)
    }
  }

  // ─── Graph view (loaded on demand via worker) ──────────────────────────────
  const loadGraphView = useCallback((subsetNodeIds?: string[]) => {
    if (isIOS() || totalNodeCount === 0) return
    workerRef.current?.postMessage({ type: 'ABORT_GRAPH' })
    setGraphViewLoading(true)
    setLoadingProgress('Building graph view…')
    workerRef.current?.postMessage({ type: 'LOAD_GRAPH', subsetNodeIds })
  }, [totalNodeCount])

  // ─── Event handlers ────────────────────────────────────────────────────────
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) void readFile(file)
  }

  function handleFocus(sel: Selection) {
    let fullSelection: Selection = sel
    if (sel.kind === 'node') {
      const node = nodeMap.get(sel.id)
      if (node) {
        fullSelection = { kind: 'node', id: sel.id, oidsee: node.__oidsee ?? node }
      } else {
        const raw = filteredNodes.find(n => n.id === sel.id)
        if (raw) fullSelection = { kind: 'node', id: sel.id, oidsee: raw }
      }
    } else if (sel.kind === 'edge') {
      const edge = edgeMap.get(sel.id)
      if (edge) {
        fullSelection = { kind: 'edge', id: sel.id, oidsee: edge.__oidsee ?? edge }
      } else {
        const raw = filteredEdges.find(e => e.id === sel.id)
        if (raw) fullSelection = { kind: 'edge', id: sel.id, oidsee: raw }
      }
    }
    setSelection(fullSelection)
    if (sel.kind === 'node') graphRef.current?.focusNode(sel.id)
    else if (sel.kind === 'edge') graphRef.current?.focusEdge(sel.id)
  }

  function handlePhysicsChange(config: PhysicsConfig) { setPhysicsConfig(config); savePhysicsConfig(config) }
  function handlePhysicsReset() { setPhysicsConfig(DEFAULT_PHYSICS); savePhysicsConfig(DEFAULT_PHYSICS) }

  function handleVisualizeNodes(nodeIds: string[]) {
    if (nodeIds.length === 0) return
    if (isIOS()) { alert('Graph view is not available on iOS. Use Table View to explore your data.'); return }
    if (nodeIds.length > MAX_SUBSET_VISUALIZATION_NODES) {
      alert(`Selection too large (${nodeIds.length} nodes). Please select ${MAX_SUBSET_VISUALIZATION_NODES} or fewer nodes for graph visualization.`)
      return
    }
    setViewMode('graph')
    loadGraphView(nodeIds)
  }

  function handleVisualizeTableItems(items: any[]) {
    if (items.length === 0) return
    const nodeItems = items.filter(item => item.__itemType === 'node')
    if (nodeItems.length > 0) handleVisualizeNodes(nodeItems.map(item => item.id))
  }

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode)
    if (mode === 'graph' && !data && !graphViewLoading && !isIOS()) loadGraphView()
  }

  function handleDetailsResize(delta: number) {
    setDetailsWidth(prev => Math.max(200, Math.min(800, prev - delta)))
  }

  function toggleMaximize(panel: 'graph' | 'details' | 'filter') {
    setMaximizedPanel(prev => prev === panel ? null : panel)
  }

  function resetPanelView(panel: 'graph' | 'details' | 'filter') {
    if (panel === 'details') {
      setDetailsWidth(360); setDetailsCollapsed(false); setDetailsManuallyCollapsed(false)
    } else if (panel === 'filter') {
      setFilterCollapsed(false)
    }
    setMaximizedPanel(null)
  }

  function resetAllViews() {
    setDetailsWidth(360); setDetailsCollapsed(false); setDetailsManuallyCollapsed(false)
    setFilterCollapsed(false); setMaximizedPanel(null); setViewMode('dashboard')
  }

  // ─── Saved queries ─────────────────────────────────────────────────────────
  function saveCurrentQuery() {
    const name = prompt('Save query as…')
    if (!name) return
    if (EMOJI_REGEX.test(name)) { alert('Emojis are not supported in query names. Please use text only.'); return }
    const next = saved.filter(s => s.name !== name).concat([{ name, query }])
    setSaved(next); saveSaved(next)
  }

  function deleteSavedQuery() {
    if (!saved.length) return
    const name = prompt('Delete which saved query? Enter exact name:\n' + saved.map(s => `- ${s.name}`).join('\n'))
    if (!name) return
    const next = saved.filter(s => s.name !== name)
    setSaved(next); saveSaved(next)
  }

  function loadSavedQuery(name: string) {
    const found = saved.find(s => s.name === name)
    if (found) setQuery(found.query)
  }

  function resetPresetQueries() {
    const presetNames = new Set(PRESET_QUERIES.map(q => q.name))
    const userQueries = saved.filter(q => !presetNames.has(q.name))
    const next = [...PRESET_QUERIES, ...userQueries]
    setSaved(next); saveSaved(next)
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img className="brand__logo" src="/icons/oidsee_logo.png" alt="OID-See" />
          <div className="brand__text">
            <div className="brand__name">OID-See Viewer</div>
            <div className="brand__tag">Render OIDC/OAuth graphs from JSON</div>
            <a
              href="https://github.com/OID-See/OID-See/tree/v1.1.0"
              target="_blank"
              rel="noopener noreferrer"
              className="brand__version-link"
            >
              <img
                src="https://img.shields.io/badge/version-1.1.0-blue.svg"
                alt="Version 1.1.0"
                className="brand__version-badge"
              />
            </a>
          </div>
        </div>

        <div className="topbar__actions">
          <ViewModeSelector currentMode={viewMode} onChange={handleViewModeChange} viewsReady={viewsReady} />

          <button
            className="btn file"
            onClick={() => loadText(JSON.stringify(sampleObj))}
          >
            Load sample
          </button>

          <label className="btn file">
            <input
              type="file"
              hidden
              accept="application/json,.json"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void readFile(file)
              }}
            />
            Upload JSON
          </label>

          <button className="btn file" onClick={resetAllViews} title="Reset all panel views">
            ⟲ Reset View
          </button>
        </div>
      </header>

      <section className={`panel--filter${filterCollapsed ? ' collapsed' : ''}${maximizedPanel === 'filter' ? ' maximized' : ''}`}>
        <div className={`panel__header-content filter-header${filterCollapsed ? ' collapsed' : ''}`}>
          <button
            className="btn btn--ghost btn--collapse-sm"
            onClick={() => setFilterCollapsed(!filterCollapsed)}
          >
            {filterCollapsed ? '▼' : '▲'}
          </button>
          <span className="filter-label">Filters</span>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button
              className="btn btn--ghost btn--maximize-sm"
              onClick={() => resetPanelView('filter')}
              title="Reset filter panel view"
            >
              ⟲
            </button>
            <button
              className="btn btn--ghost btn--maximize-sm"
              onClick={() => toggleMaximize('filter')}
              title={maximizedPanel === 'filter' ? 'Restore' : 'Maximize'}
            >
              {maximizedPanel === 'filter' ? '◱' : '◰'}
            </button>
          </div>
        </div>
        {!filterCollapsed && (
          <FilterBar
            query={query}
            onChange={setQuery}
            counts={counts}
            warnings={warnings}
            lens={lens}
            onLens={setLens}
            pathAware={pathAware}
            onPathAware={setPathAware}
            saved={saved}
            onSave={saveCurrentQuery}
            onDelete={deleteSavedQuery}
            onLoad={loadSavedQuery}
            onReset={resetPresetQueries}
          />
        )}
      </section>

      <main className={`main${maximizedPanel ? ' maximized' : ''}`} style={mainGridStyle} onDragOver={e => e.preventDefault()} onDrop={onDrop}>
        <section className={`panel panel--graph${maximizedPanel === 'graph' ? ' maximized-panel' : ''}`}>
          <div className="panel__title">
            <div className="panel__header-content">
              <span className="panel__title-text">
                {viewMode === 'graph' && 'Graph'}
                {viewMode === 'table' && 'Table'}
                {viewMode === 'tree' && 'Tree'}
                {viewMode === 'matrix' && 'Matrix'}
                {viewMode === 'dashboard' && 'Dashboard'}
              </span>
              <div className="panel__header-actions">
                {viewMode === 'graph' && (
                  <>
                    <button
                      className="btn btn--ghost btn--maximize"
                      onClick={() => setLegendVisible(!legendVisible)}
                      title="Show legend"
                    >
                      ?
                    </button>
                    <PhysicsControls
                      config={physicsConfig}
                      onChange={handlePhysicsChange}
                      onReset={handlePhysicsReset}
                    />
                  </>
                )}
                <button
                  className="btn btn--ghost btn--maximize"
                  onClick={() => resetPanelView('graph')}
                  title="Reset panel view"
                >
                  ⟲
                </button>
                <button
                  className="btn btn--ghost btn--maximize"
                  onClick={() => toggleMaximize('graph')}
                  title={maximizedPanel === 'graph' ? 'Restore' : 'Maximize'}
                >
                  {maximizedPanel === 'graph' ? '◱' : '◰'}
                </button>
              </div>
            </div>
          </div>

          {totalNodeCount > 0 ? (
            <>
              {viewMode === 'graph' && (
                <>
                  {isIOS() ? (
                    <div className="empty">
                      <div className="empty__title">Graph view unavailable on iOS</div>
                      <div className="empty__msg">
                        Graph rendering is not supported on iOS due to memory limits.
                        Use Table, Tree, Matrix or Dashboard to explore your data.
                      </div>
                    </div>
                  ) : graphViewLoading ? (
                    <div className="empty">
                      <div className="empty__title">Loading graph…</div>
                      <div className="empty__msg">Building graph view. This may take a moment for large datasets.</div>
                    </div>
                  ) : data && filtered ? (
                    <GraphCanvas
                      ref={graphRef}
                      allNodes={data.nodes}
                      allEdges={data.edges}
                      visibleNodes={filtered.nodes}
                      visibleEdges={filtered.edges}
                      physicsConfig={physicsConfig}
                      onSelection={setSelection}
                      onError={setGraphError}
                    />
                  ) : (
                    <div className="empty">
                      <div className="empty__title">Graph view not loaded</div>
                      <div className="empty__msg">
                        <button className="btn" onClick={() => loadGraphView()}>Load Graph View</button>
                        {totalNodeCount > MAX_RENDERABLE_NODES && (
                          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.7 }}>
                            Will show top {MAX_RENDERABLE_NODES.toLocaleString()} highest-risk nodes
                            ({totalNodeCount.toLocaleString()} total).
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              {viewMode === 'table' && (
                <TableView
                  nodes={filteredNodes}
                  edges={filteredEdges}
                  onSelection={setSelection}
                  onVisualize={handleVisualizeTableItems}
                />
              )}
              {viewMode === 'tree' && (
                <TreeView
                  nodes={filteredNodes}
                  edges={filteredEdges}
                  onSelection={setSelection}
                  onVisualize={handleVisualizeNodes}
                />
              )}
              {viewMode === 'matrix' && (
                <MatrixView
                  nodes={filteredNodes}
                  edges={filteredEdges}
                />
              )}
              {viewMode === 'dashboard' && (
                <DashboardView
                  nodes={filteredNodes}
                  edges={filteredEdges}
                  onSelection={setSelection}
                />
              )}
            </>
          ) : (
            <div className="empty" onDragOver={e => e.preventDefault()} onDrop={onDrop}>
              <div className="empty__title">No data yet</div>
              <div className="empty__msg">
                Click <strong>Upload JSON</strong> to load an OID-See export, or <strong>Load sample</strong> to try the demo.
                <br /><br />
                <span style={{ opacity: 0.6, fontSize: '0.85rem' }}>
                  You can also drag and drop a <code>.json</code> file anywhere here.
                  Nothing is uploaded to a server — all processing happens in your browser.
                </span>
              </div>
              {error && (
                <div className="error" style={{ marginTop: '1rem' }}>
                  <div className="error__title">Could not load file</div>
                  <div className="error__msg">{error}</div>
                </div>
              )}
            </div>
          )}
        </section>

        <ResizeHandle onResize={handleDetailsResize} orientation="horizontal" />

        <section
          ref={detailsPanelRef}
          className={`panel panel--details${detailsCollapsed ? ' collapsed-horizontal' : ''}${maximizedPanel === 'details' ? ' maximized-panel' : ''}`}
        >
          <div className="panel__title">
            <div className="panel__header-content">
              <button
                className="panel__collapse-btn"
                onClick={() => {
                  const newCollapsed = !detailsCollapsed
                  setDetailsCollapsed(newCollapsed)
                  setDetailsManuallyCollapsed(newCollapsed)
                }}
                title={detailsCollapsed ? 'Expand' : 'Collapse'}
              >
                {detailsCollapsed ? (isMobile ? '▼' : '▶') : (isMobile ? '▲' : '◀')}
              </button>
              <span className="panel__title-text">Details</span>
              <div className="panel__header-actions">
                {!detailsCollapsed && (
                  <>
                    <button
                      className="btn btn--ghost btn--maximize"
                      onClick={() => resetPanelView('details')}
                      title="Reset details panel view"
                    >
                      ⟲
                    </button>
                    <button
                      className="btn btn--ghost btn--maximize"
                      onClick={() => toggleMaximize('details')}
                      title={maximizedPanel === 'details' ? 'Restore' : 'Maximize'}
                    >
                      {maximizedPanel === 'details' ? '◱' : '◰'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          {!detailsCollapsed && <DetailsPanel selection={selection} onFocus={handleFocus} />}
        </section>
      </main>

      <footer className="footer">
        <span>OID-See processes files locally. No data leaves your browser.</span>
      </footer>

      {graphError && (
        <ErrorDialog message={graphError} onDismiss={() => setGraphError(null)} />
      )}

      {largeGraphWarning && (
        <InfoDialog message={largeGraphWarning} onDismiss={() => setLargeGraphWarning(null)} />
      )}

      <Legend visible={legendVisible} onClose={() => setLegendVisible(false)} />

      <LoadingOverlay visible={loading} message="Loading data" progress={loadingProgress} />
    </div>
  )
}

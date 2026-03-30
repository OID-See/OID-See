import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { GraphCanvas, Selection, GraphCanvasHandle, PhysicsConfig, DEFAULT_PHYSICS } from './components/GraphCanvas'
import { VisData, toVisDataFromRawAsync } from './adapters/toVisData'
import sampleObj from './samples/sample-oidsee-graph.json'
import { DetailsPanel } from './components/DetailsPanel'
import { FilterBar, Lens } from './components/FilterBar'
import { parseQuery, evalClause, getPath, isNumericOp, Clause } from './filters/query'
import { JSONEditor } from './components/JSONEditor'
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

// Maximum nodes/edges to render in graph view - beyond this, graph will be truncated
const MAX_RENDERABLE_NODES = 3000
const MAX_RENDERABLE_EDGES = 4500

// Maximum nodes for subset visualization from Table/Tree views
const MAX_SUBSET_VISUALIZATION_NODES = 500

// File size tiers (bytes) for pre-load warnings
const FILE_SIZE_MEDIUM_MB = 1
const FILE_SIZE_LARGE_MB = 5
const FILE_SIZE_VERY_LARGE_MB = 30

// Delay before processing to allow loading overlay to render
const RENDER_DELAY_MS = 200

// Yield delay between blocking operations to keep UI responsive
const YIELD_DELAY_MS = 50

// Detect iOS (all browsers on iOS use WebKit — graph view is unsafe there)
function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

// Emoji regex for cross-browser compatibility validation
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/u

// Responsive layout breakpoint - matches CSS media query
const RESPONSIVE_BREAKPOINT = 1100

// Responsive panel widths for mobile/tablet viewports
const MOBILE_INPUT_WIDTH = 280
const MOBILE_DETAILS_WIDTH = 240

// Details panel auto-expand delay
const DETAILS_AUTO_EXPAND_DELAY = 100 // ms delay before auto-expanding details panel

// Scroll delay offset for portrait mode auto-expand
const SCROLL_DELAY_OFFSET = 50 // ms additional delay to ensure panel has expanded before scrolling

// Graph restabilization delay
const GRAPH_RESTABILIZE_DELAY = 100 // ms delay before triggering graph restabilization

const PRESET_QUERIES: SavedQuery[] = [
  // Node type queries
  { name: 'Service Principals', query: 'n.type=ServicePrincipal' },
  { name: 'Applications', query: 'n.type=Application' },
  { name: 'Users', query: 'n.type=User' },
  { name: 'Groups', query: 'n.type=Group' },
  { name: 'Roles', query: 'n.type=Role' },
  { name: 'Resource APIs', query: 'n.type=ResourceApi' },
  
  // Risk level queries
  { name: 'High Risk', query: 'n.risk.score>=70' },
  { name: 'Medium Risk', query: 'n.risk.score>=40 n.risk.score<70' },
  { name: 'Low Risk', query: 'n.risk.score<40' },
  
  // Risk-focused edge queries
  { name: 'Can Impersonate', query: 'e.type=CAN_IMPERSONATE' },
  { name: 'Has App Roles', query: 'e.type=HAS_APP_ROLE' },
  { name: 'Has Directory Roles', query: 'e.type=HAS_ROLE' },
  { name: 'Privileged Scopes', query: 'e.type=HAS_SCOPES e.properties.scopeRiskClass~privileged' },
  { name: 'ReadWrite.All Scopes', query: 'e.type=HAS_SCOPES e.properties.scopeRiskClass=readwrite_all' },
  { name: 'Action Scopes', query: 'e.type=HAS_SCOPES e.properties.scopeRiskClass=action_privileged' },
  { name: 'Too Many Scopes', query: 'e.type=HAS_SCOPES e.properties.scopeRiskClass=too_broad' },
  { name: 'Offline Access', query: 'e.type=HAS_OFFLINE_ACCESS' },
  
  // Tier-based role queries
  { name: 'Has Tier 0 Roles', query: 'n.risk.reasons~PRIVILEGE n.type=ServicePrincipal' },
  { name: 'Tier 0 Roles', query: 'n.type=Role n.properties.tier=tier0' },
  { name: 'Tier 1 Roles', query: 'n.type=Role n.properties.tier=tier1' },
  { name: 'Tier 2 Roles', query: 'n.type=Role n.properties.tier=tier2' },
  
  // Specific risk queries
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
  
  // Structure queries
  { name: 'App Ownership', query: 'e.type=OWNS' },
  { name: 'App Instances', query: 'e.type=INSTANCE_OF' },
  { name: 'App Assignments', query: 'e.type=ASSIGNED_TO' },
  
  // Complex multi-condition queries
  { name: 'High Risk with Credentials', query: 'n.risk.score>=70 n.properties.credentialInsights.active_password_credentials>0' },
  { name: 'Unverified with Offline Access', query: 'n.properties.verifiedPublisher.displayName=null e.type=HAS_OFFLINE_ACCESS' },
  { name: 'Impersonation Capable Service Principals', query: 'e.type=CAN_IMPERSONATE e.properties.markers~user_impersonation' },
]

function loadPhysicsConfig(): PhysicsConfig {
  try {
    const raw = localStorage.getItem('oidsee.physicsConfig')
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_PHYSICS, ...parsed }
    }
  } catch {
    // ignore
  }
  return DEFAULT_PHYSICS
}

function savePhysicsConfig(config: PhysicsConfig) {
  try {
    localStorage.setItem('oidsee.physicsConfig', JSON.stringify(config))
  } catch {
    // ignore
  }
}

function createDisabledPhysicsConfig(): PhysicsConfig {
  return {
    ...DEFAULT_PHYSICS,
    gravitationalConstant: 0,
    springConstant: 0,
  }
}

function loadSaved(): SavedQuery[] {
  try {
    const raw = localStorage.getItem('oidsee.savedQueries')
    let arr: SavedQuery[] = []
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        arr = parsed.filter((x) => x && typeof x.name === 'string' && typeof x.query === 'string')
      }
    }
    
    if (arr.length === 0) {
      arr = PRESET_QUERIES
      saveSaved(arr)
    }
    
    return arr
  } catch {
    return PRESET_QUERIES
  }
}
function saveSaved(arr: SavedQuery[]) {
  try {
    localStorage.setItem('oidsee.savedQueries', JSON.stringify(arr))
  } catch {
    // ignore
  }
}

function lensEdgeAllowed(lens: Lens, edgeType: string): boolean {
  if (lens === 'full') return true

  if (lens === 'risk') {
    // Risk lens: show edges that represent security risks
    // Note: ASSIGNED_TO appears in both lenses - in risk lens it shows who has access to risky resources
    const allow = new Set([
      'HAS_SCOPE',
      'HAS_SCOPES',
      'HAS_TOO_MANY_SCOPES',
      'HAS_PRIVILEGED_SCOPES',
      'HAS_OFFLINE_ACCESS',
      'HAS_ROLE',
      'HAS_APP_ROLE',
      'CAN_IMPERSONATE',
      'EFFECTIVE_IMPERSONATION_PATH',
      'PERSISTENCE_PATH',
      'ASSIGNED_TO',
    ])
    return allow.has(edgeType)
  }

  // Structure lens: show edges that represent organizational structure
  // Note: ASSIGNED_TO appears in both lenses - in structure lens it shows organizational assignments
  const allow = new Set(['INSTANCE_OF', 'MEMBER_OF', 'OWNS', 'GOVERNS', 'ASSIGNED_TO'])
  return allow.has(edgeType)
}

function computeWarnings(nodes: OidSeeNode[], edges: OidSeeEdge[], clauses: Clause[]): string[] {
  const warns: string[] = []
  for (const c of clauses) {
    const pool: any[] = c.target === 'node' ? nodes : c.target === 'edge' ? edges : [...nodes, ...edges]
    const anyHas = pool.some((o) => getPath(o, c.path) !== undefined)
    if (!anyHas) {
      warns.push(`No matches for path "${c.path}" (${c.target}). Possible typo or field not present in this export.`)
      continue
    }
    if (isNumericOp(c.op)) {
      const samples = pool.map((o) => getPath(o, c.path)).filter((v) => v !== undefined && v !== null).slice(0, 25)
      const nonNum = samples.some((v) => typeof v !== 'number' && Number.isNaN(Number(v)))
      if (nonNum) {
        warns.push(`Numeric operator used on non-numeric values at "${c.path}". This clause may filter out everything.`)
      }
    }
  }
  return warns
}

/**
 * Apply query/lens filtering directly to raw OidSeeNode/OidSeeEdge arrays.
 * Used for Dashboard, Table, Tree, Matrix views — no vis-network conversion needed.
 */
function applyQueryToRaw(nodes: OidSeeNode[], edges: OidSeeEdge[], query: string, lens: Lens, pathAware: boolean) {
  const parsed = parseQuery(query)
  const clauses = parsed.clauses
  const nodeClauses = clauses.filter((c) => c.target === 'node' || c.target === 'both')
  const edgeClauses = clauses.filter((c) => c.target === 'edge' || c.target === 'both')

  const nodePass = new Set<string>()
  if (nodeClauses.length > 0) {
    for (const n of nodes) {
      if (nodeClauses.every((c) => evalClause(n, c))) nodePass.add(n.id)
    }
  } else {
    for (const n of nodes) nodePass.add(n.id)
  }

  const edgeById = new Map<string, OidSeeEdge>()
  for (const e of edges) edgeById.set(e.id, e)

  const edgesOut: OidSeeEdge[] = []
  const edgesKept = new Set<string>()
  for (const e of edges) {
    if (!lensEdgeAllowed(lens, e.type)) continue
    if (!edgeClauses.every((c) => evalClause(e, c))) continue
    if (!nodePass.has(e.from) || !nodePass.has(e.to)) continue
    if (!edgesKept.has(e.id)) { edgesOut.push(e); edgesKept.add(e.id) }
    if (pathAware && e.derived?.isDerived && Array.isArray(e.derived.inputs)) {
      for (const id of e.derived.inputs) {
        const inp = edgeById.get(id)
        if (inp && !edgesKept.has(inp.id) && nodePass.has(inp.from) && nodePass.has(inp.to) && lensEdgeAllowed(lens, inp.type)) {
          edgesOut.push(inp)
          edgesKept.add(inp.id)
        }
      }
    }
  }

  const nodesWithEdges = new Set<string>()
  for (const e of edgesOut) { nodesWithEdges.add(e.from); nodesWithEdges.add(e.to) }

  const nodesOut = nodes.filter((n) => {
    if (!nodePass.has(n.id)) return false
    if (lens === 'full') return true
    return nodesWithEdges.has(n.id)
  })

  return { nodes: nodesOut, edges: edgesOut, parsed }
}

/**
 * Apply query/lens filtering to vis-network format data (used only for the graph view).
 */
function applyQuery(data: VisData, query: string, lens: Lens, pathAware: boolean) {
  const parsed = parseQuery(query)
  const clauses = parsed.clauses

  const nodeClauses = clauses.filter((c) => c.target === 'node' || c.target === 'both')
  const edgeClauses = clauses.filter((c) => c.target === 'edge' || c.target === 'both')

  const nodePass = new Set<string>()
  if (nodeClauses.length > 0) {
    for (const n of data.nodes) {
      const raw = n.__oidsee ?? n
      const ok = nodeClauses.every((c) => evalClause(raw, c))
      if (ok) nodePass.add(n.id)
    }
  } else {
    for (const n of data.nodes) {
      nodePass.add(n.id)
    }
  }

  const edgeById = new Map<string, any>()
  for (const e of data.edges) edgeById.set(e.id, e)

  const edgesOut: any[] = []
  const edgesKept = new Set<string>()

  for (const e of data.edges) {
    const raw = e.__oidsee ?? e
    const edgeType = raw.type ?? e.label ?? ''
    if (!lensEdgeAllowed(lens, edgeType)) continue
    const ok = edgeClauses.every((c) => evalClause(raw, c))
    if (!ok) continue
    if (!nodePass.has(e.from) || !nodePass.has(e.to)) continue
    if (!edgesKept.has(e.id)) { edgesOut.push(e); edgesKept.add(e.id) }
    if (pathAware && raw?.derived?.isDerived && Array.isArray(raw.derived.inputs)) {
      for (const id of raw.derived.inputs) {
        const inp = edgeById.get(id)
        if (inp && !edgesKept.has(inp.id)) {
          const inpRaw = inp.__oidsee ?? inp
          const inpType = inpRaw.type ?? inp.label ?? ''
          if (nodePass.has(inp.from) && nodePass.has(inp.to) && lensEdgeAllowed(lens, inpType)) {
            edgesOut.push(inp)
            edgesKept.add(inp.id)
          }
        }
      }
    }
  }

  const nodesWithEdges = new Set<string>()
  for (const e of edgesOut) { nodesWithEdges.add(e.from); nodesWithEdges.add(e.to) }

  const nodesOut = data.nodes.filter((n) => {
    if (!nodePass.has(n.id)) return false
    if (lens === 'full') return true
    return nodesWithEdges.has(n.id)
  })

  return { nodes: nodesOut, edges: edgesOut, parsed }
}

export default function App() {
  const [raw, setRaw] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [graphError, setGraphError] = useState<string | null>(null)
  const [data, setData] = useState<VisData | null>(null)       // vis-network format, loaded lazily for graph view only
  const [rawNodes, setRawNodes] = useState<OidSeeNode[]>([])   // full untruncated raw nodes
  const [rawEdges, setRawEdges] = useState<OidSeeEdge[]>([])   // full untruncated raw edges
  const [graphViewLoading, setGraphViewLoading] = useState<boolean>(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [query, setQuery] = useState<string>('')
  const [lens, setLens] = useState<Lens>('full')
  const [pathAware, setPathAware] = useState<boolean>(true)
  const [saved, setSaved] = useState<SavedQuery[]>([])
  const [inputCollapsed, setInputCollapsed] = useState<boolean>(false)
  const [filterCollapsed, setFilterCollapsed] = useState<boolean>(false)
  const [detailsCollapsed, setDetailsCollapsed] = useState<boolean>(true)
  const [detailsManuallyCollapsed, setDetailsManuallyCollapsed] = useState<boolean>(false)
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [isPortrait, setIsPortrait] = useState<boolean>(false)
  const [physicsConfig, setPhysicsConfig] = useState<PhysicsConfig>(DEFAULT_PHYSICS)
  const [inputWidth, setInputWidth] = useState<number>(420)
  const [detailsWidth, setDetailsWidth] = useState<number>(360)
  const [maximizedPanel, setMaximizedPanel] = useState<'input' | 'graph' | 'details' | 'filter' | null>(null)
  const [viewportWidth, setViewportWidth] = useState<number>(1280)
  const [legendVisible, setLegendVisible] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [loadingProgress, setLoadingProgress] = useState<string>('')
  const [largeGraphWarning, setLargeGraphWarning] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [viewsReady, setViewsReady] = useState<Set<ViewMode>>(new Set())
  const graphRef = useRef<GraphCanvasHandle>(null)
  const detailsPanelRef = useRef<HTMLElement>(null)
  const graphLoadAbortRef = useRef<boolean>(false) // signal to cancel in-progress graph loading

  // Load physics config on mount
  useEffect(() => {
    setPhysicsConfig(loadPhysicsConfig())
  }, [])

  // Detect mobile viewport and track viewport width
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      setIsMobile(width <= 768)
      setIsPortrait(width <= 768 && height > width)
      setViewportWidth(width)
    }
    checkMobile()
    
    // Debounce resize events
    let timeoutId: NodeJS.Timeout
    const debouncedResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(checkMobile, 150)
    }
    
    window.addEventListener('resize', debouncedResize)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', debouncedResize)
    }
  }, [])

  useEffect(() => {
    setSaved(loadSaved())
  }, [])

  // Auto-expand details panel when a node or edge is selected
  // Only auto-expand if the user hasn't manually collapsed it
  useEffect(() => {
    if (selection && detailsCollapsed && !detailsManuallyCollapsed) {
      setDetailsCollapsed(false)
      // In portrait mode, scroll the details panel into view after expanding
      if (isPortrait && detailsPanelRef.current) {
        setTimeout(() => {
          detailsPanelRef.current!.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, DETAILS_AUTO_EXPAND_DELAY + SCROLL_DELAY_OFFSET) // Additional delay to ensure panel has expanded
      }
    }
  }, [selection, detailsCollapsed, detailsManuallyCollapsed, isPortrait])

  // Reset physics configuration when graph data changes
  useEffect(() => {
    if (data) {
      setPhysicsConfig(DEFAULT_PHYSICS)
      savePhysicsConfig(DEFAULT_PHYSICS)
    }
  }, [data])

  // Trigger graph restabilization when filters change
  useEffect(() => {
    if (data && graphRef.current) {
      // Small delay to ensure the graph has updated with new data
      const timer = setTimeout(() => {
        graphRef.current?.restabilize()
      }, GRAPH_RESTABILIZE_DELAY)
      return () => clearTimeout(timer)
    }
  }, [lens, pathAware, query, data])

  const placeholder = useMemo(() => {
    return `Paste an OID-See export (oidsee-graph v1.x) here…\n\nTip: Click "Load sample" to see the expected shape.`
  }, [])

  const mainGridStyle = useMemo(() => {
    if (maximizedPanel) return {}
    // In portrait mode, don't apply grid layout at all
    if (isPortrait) return {}
    // Apply appropriate grid layout based on collapsed panel states
    // Include 8px for each visible resize handle
    // For mobile/tablet viewports, use smaller default widths but still support collapse
    const effectiveInputWidth = viewportWidth <= RESPONSIVE_BREAKPOINT ? MOBILE_INPUT_WIDTH : inputWidth
    const effectiveDetailsWidth = viewportWidth <= RESPONSIVE_BREAKPOINT ? MOBILE_DETAILS_WIDTH : detailsWidth
    
    if (inputCollapsed && detailsCollapsed) return { gridTemplateColumns: '80px 8px 1fr 8px 80px' }
    if (inputCollapsed) return { gridTemplateColumns: `80px 8px 1fr 8px ${effectiveDetailsWidth}px` }
    if (detailsCollapsed) return { gridTemplateColumns: `${effectiveInputWidth}px 8px 1fr 8px 80px` }
    return { gridTemplateColumns: `${effectiveInputWidth}px 8px 1fr 8px ${effectiveDetailsWidth}px` }
  }, [maximizedPanel, inputCollapsed, detailsCollapsed, inputWidth, detailsWidth, viewportWidth, isPortrait])

  async function readFile(file: File) {
    const sizeMB = file.size / 1024 / 1024
    const sizeLabel = sizeMB < FILE_SIZE_MEDIUM_MB ? `Small (${sizeMB.toFixed(1)} MB)`
      : sizeMB < FILE_SIZE_LARGE_MB ? `Medium (${sizeMB.toFixed(1)} MB)`
      : sizeMB < FILE_SIZE_VERY_LARGE_MB ? `Large (${sizeMB.toFixed(1)} MB)`
      : `Very Large (${sizeMB.toFixed(1)} MB)`
    
    console.log('[OID-See] 📁 File upload started:', { name: file.name, size: sizeLabel })

    setLoading(true)
    setError(null)
    setLoadingProgress(`Reading ${sizeLabel} file…`)

    try {
      const text = await file.text()
      setRaw(text)
      await render(text)
    } catch (e: any) {
      console.error('[OID-See] ❌ File read error:', e)
      setError(e?.message || 'Failed to read file')
      setLoading(false)
    }
  }

  // Helper function to yield control to the event loop
  const yieldToEventLoop = () => new Promise(resolve => setTimeout(resolve, YIELD_DELAY_MS))

  async function render(input: string) {
    // Abort any in-progress graph load
    graphLoadAbortRef.current = true

    setLoading(true)
    setLoadingProgress('Parsing JSON data…')
    setError(null)
    setSelection(null)
    setLargeGraphWarning(null)
    setData(null)
    setRawNodes([])
    setRawEdges([])
    setViewsReady(new Set())

    try {
      await new Promise(resolve => setTimeout(resolve, RENDER_DELAY_MS))
      await yieldToEventLoop()

      const parsed = JSON.parse(input)

      if (!Array.isArray(parsed?.nodes) || !Array.isArray(parsed?.edges)) {
        throw new Error('Unsupported format: expected an OID-See export with "nodes" and "edges" arrays.')
      }

      const nodeCount: number = parsed.nodes.length
      const edgeCount: number = parsed.edges.length
      console.log('[OID-See] 📊 Loaded:', { nodes: nodeCount.toLocaleString(), edges: edgeCount.toLocaleString() })

      const exceedsGraphLimits = nodeCount > MAX_RENDERABLE_NODES || edgeCount > MAX_RENDERABLE_EDGES

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

      // Store raw arrays — no vis-network conversion here.
      // Dashboard/Table/Tree/Matrix work directly on OidSeeNode[]/OidSeeEdge[].
      // Graph view is loaded lazily via loadGraphView() only when the user requests it.
      const nodes: OidSeeNode[] = parsed.nodes
      const edges: OidSeeEdge[] = parsed.edges

      setRawNodes(nodes)
      setRawEdges(edges)

      // Non-graph views are immediately ready
      const ready: ViewMode[] = ['dashboard', 'table', 'tree', 'matrix']
      // On iOS, graph view is blocked — don't add it to viewsReady
      if (!isIOS()) ready.push('graph')
      setViewsReady(new Set(ready))

      setLoading(false)
      setLoadingProgress('')
    } catch (e: any) {
      console.error('[OID-See] ❌ Render error:', e)
      setData(null)
      setRawNodes([])
      setRawEdges([])
      setViewsReady(new Set())
      setSelection(null)
      setError(e?.message ?? String(e))
      setLoading(false)
      setLoadingProgress('')
    }
  }

  /**
   * Load (or reload) the graph view. Converts raw nodes/edges to vis-network format,
   * truncating to MAX_RENDERABLE_NODES if needed. If subsetNodeIds is provided, only
   * those nodes (and edges between them) are shown — used by "Visualize Selected".
   * Never called on iOS.
   */
  const loadGraphView = useCallback(async (subsetNodeIds?: string[]) => {
    if (isIOS() || rawNodes.length === 0) return

    graphLoadAbortRef.current = false
    setGraphViewLoading(true)
    setLoadingProgress('Preparing graph view…')

    try {
      let nodesToConvert = rawNodes
      let edgesToConvert = rawEdges

      if (subsetNodeIds && subsetNodeIds.length > 0) {
        const idSet = new Set(subsetNodeIds)
        nodesToConvert = rawNodes.filter(n => idSet.has(n.id))
        edgesToConvert = rawEdges.filter(e => idSet.has(e.from) && idSet.has(e.to))
      } else if (nodesToConvert.length > MAX_RENDERABLE_NODES || edgesToConvert.length > MAX_RENDERABLE_EDGES) {
        // Truncate to highest-risk nodes
        const indices = Array.from({ length: nodesToConvert.length }, (_, i) => i)
        indices.sort((a, b) => (nodesToConvert[b].risk?.score ?? 0) - (nodesToConvert[a].risk?.score ?? 0))
        const topNodes = indices.slice(0, MAX_RENDERABLE_NODES).map(i => nodesToConvert[i])
        const idSet = new Set(topNodes.map(n => n.id))
        nodesToConvert = topNodes
        edgesToConvert = rawEdges
          .filter(e => idSet.has(e.from) && idSet.has(e.to))
          .slice(0, MAX_RENDERABLE_EDGES)
      }

      if (graphLoadAbortRef.current) return // new render started, abort

      const vis = await toVisDataFromRawAsync(nodesToConvert, edgesToConvert)
      if (graphLoadAbortRef.current) return

      setData(vis)
      setViewsReady(prev => new Set([...prev, 'graph']))
    } catch (e: any) {
      console.error('[OID-See] ❌ Graph view load error:', e)
      setGraphError(`Failed to prepare graph view: ${e?.message ?? String(e)}`)
    } finally {
      setGraphViewLoading(false)
      setLoadingProgress('')
    }
  }, [rawNodes, rawEdges])

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) void readFile(file)
  }

  // Filtered data for graph view (vis-network format, used only in GraphCanvas)
  const filtered = useMemo(() => {
    if (!data) return null
    try {
      return applyQuery(data, query.trim(), lens, pathAware)
    } catch (e) {
      console.error('Error applying query/lens filter:', e)
      return data
    }
  }, [data, query, lens, pathAware])

  // Filtered raw nodes/edges for Dashboard, Table, Tree, Matrix views
  const filteredRaw = useMemo(() => {
    if (rawNodes.length === 0) return { nodes: [] as OidSeeNode[], edges: [] as OidSeeEdge[] }
    try {
      const result = applyQueryToRaw(rawNodes, rawEdges, query.trim(), lens, pathAware)
      return { nodes: result.nodes, edges: result.edges }
    } catch (e) {
      console.error('Error applying query/lens filter to raw data:', e)
      return { nodes: rawNodes, edges: rawEdges }
    }
  }, [rawNodes, rawEdges, query, lens, pathAware])

  const filteredNodes = filteredRaw.nodes
  const filteredEdges = filteredRaw.edges

  const counts = useMemo(() => {
    if (rawNodes.length === 0) return undefined
    return {
      nodes: filteredNodes.length,
      edges: filteredEdges.length,
      totalNodes: rawNodes.length,
      totalEdges: rawEdges.length,
    }
  }, [rawNodes, rawEdges, filteredNodes, filteredEdges])

  const warnings = useMemo(() => {
    if (rawNodes.length === 0) return []
    const p = parseQuery(query)
    if (p.errors.length) return []
    return computeWarnings(rawNodes, rawEdges, p.clauses)
  }, [rawNodes, rawEdges, query])

  // Memoized Maps for graph focus lookups (only populated when graph is loaded)
  const nodeMap = useMemo(() => {
    if (!data) return new Map<string, any>()
    return new Map(data.nodes.map(n => [n.id, n]))
  }, [data])

  const edgeMap = useMemo(() => {
    if (!data) return new Map<string, any>()
    return new Map(data.edges.map(e => [e.id, e]))
  }, [data])

  function saveCurrentQuery() {
    const name = prompt('Save query as…')
    if (!name) return
    
    // Check for emojis
    if (EMOJI_REGEX.test(name)) {
      alert('Emojis are not supported in query names for cross-browser compatibility. Please use text only.')
      return
    }
    
    const next = saved.filter((s) => s.name !== name).concat([{ name, query }])
    setSaved(next)
    saveSaved(next)
  }

  function deleteSavedQuery() {
    if (!saved.length) return
    const name = prompt('Delete which saved query? Enter exact name:\n' + saved.map((s) => `- ${s.name}`).join('\n'))
    if (!name) return
    const next = saved.filter((s) => s.name !== name)
    setSaved(next)
    saveSaved(next)
  }

  function loadSavedQuery(name: string) {
    const found = saved.find((s) => s.name === name)
    if (found) setQuery(found.query)
  }

  function resetPresetQueries() {
    // Get all preset query names
    const presetNames = new Set(PRESET_QUERIES.map(q => q.name))
    
    // Keep only user-added queries (those not in PRESET_QUERIES)
    const userQueries = saved.filter(q => !presetNames.has(q.name))
    
    // Combine preset queries with user queries
    const next = [...PRESET_QUERIES, ...userQueries]
    
    setSaved(next)
    saveSaved(next)
  }

  function formatJSON() {
    try {
      const parsed = JSON.parse(raw)
      const pretty = JSON.stringify(parsed, null, 2)
      setRaw(pretty)
      setError(null)
    } catch (e: any) {
      setError(`Format failed: ${e?.message ?? String(e)}`)
    }
  }

  function handleFocus(sel: Selection) {
    let fullSelection: Selection = sel
    if (sel.kind === 'node') {
      // Try vis-network nodeMap first (when graph is loaded), then fall back to raw
      const node = nodeMap.get(sel.id)
      if (node) {
        fullSelection = { kind: 'node', id: sel.id, oidsee: node.__oidsee ?? node }
      } else {
        const raw = rawNodes.find(n => n.id === sel.id)
        if (raw) fullSelection = { kind: 'node', id: sel.id, oidsee: raw }
      }
    } else if (sel.kind === 'edge') {
      const edge = edgeMap.get(sel.id)
      if (edge) {
        fullSelection = { kind: 'edge', id: sel.id, oidsee: edge.__oidsee ?? edge }
      } else {
        const raw = rawEdges.find(e => e.id === sel.id)
        if (raw) fullSelection = { kind: 'edge', id: sel.id, oidsee: raw }
      }
    }
    setSelection(fullSelection)
    if (sel.kind === 'node') graphRef.current?.focusNode(sel.id)
    else if (sel.kind === 'edge') graphRef.current?.focusEdge(sel.id)
  }

  function handlePhysicsChange(config: PhysicsConfig) {
    setPhysicsConfig(config)
    savePhysicsConfig(config)
  }

  function handlePhysicsReset() {
    setPhysicsConfig(DEFAULT_PHYSICS)
    savePhysicsConfig(DEFAULT_PHYSICS)
  }

  // Handle visualization of a node subset — switches to graph view and loads only those nodes
  function handleVisualizeNodes(nodeIds: string[]) {
    if (nodeIds.length === 0) return
    if (isIOS()) {
      alert('Graph view is not available on iOS. Use Table View to explore your data.')
      return
    }
    if (nodeIds.length > MAX_SUBSET_VISUALIZATION_NODES) {
      alert(`Selection too large (${nodeIds.length} nodes). Please select ${MAX_SUBSET_VISUALIZATION_NODES} or fewer nodes for graph visualization.`)
      return
    }
    setViewMode('graph')
    void loadGraphView(nodeIds)
  }

  // Handle visualization of table items (nodes or edges)
  function handleVisualizeTableItems(items: any[]) {
    if (items.length === 0) return
    const nodeItems = items.filter(item => item.__itemType === 'node')
    if (nodeItems.length > 0) {
      handleVisualizeNodes(nodeItems.map(item => item.id))
    }
  }

  // Switching to graph view triggers lazy load if graph data isn't ready yet
  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode)
    if (mode === 'graph' && !data && !graphViewLoading && !isIOS()) {
      void loadGraphView()
    }
  }

  function handleInputResize(delta: number) {
    setInputWidth(prev => Math.max(200, Math.min(800, prev + delta)))
  }

  function handleDetailsResize(delta: number) {
    setDetailsWidth(prev => Math.max(200, Math.min(800, prev - delta)))
  }

  function toggleMaximize(panel: 'input' | 'graph' | 'details' | 'filter') {
    setMaximizedPanel(prev => prev === panel ? null : panel)
  }

  function resetPanelView(panel: 'input' | 'graph' | 'details' | 'filter') {
    if (panel === 'input') {
      setInputWidth(420)
      setInputCollapsed(false)
    } else if (panel === 'details') {
      setDetailsWidth(360)
      setDetailsCollapsed(false)
      setDetailsManuallyCollapsed(false)
    } else if (panel === 'filter') {
      setFilterCollapsed(false)
    }
    // Graph panel only has maximized state to reset
    setMaximizedPanel(null)
  }

  function resetAllViews() {
    setInputWidth(420)
    setDetailsWidth(360)
    setInputCollapsed(false)
    setDetailsCollapsed(false)
    setDetailsManuallyCollapsed(false)
    setFilterCollapsed(false)
    setMaximizedPanel(null)
    // Reset view mode to dashboard when resetting all views
    setViewMode('dashboard')
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img className="brand__logo" src="/icons/oidsee_logo.png" alt="OID-See" />
          <div className="brand__text">
            <div className="brand__name">OID-See Viewer</div>
            <div className="brand__tag">Render OIDC/OAuth graphs from JSON</div>
            <a 
              href="https://github.com/OID-See/OID-See/tree/v1.0.0" 
              target="_blank" 
              rel="noopener noreferrer"
              className="brand__version-link"
            >
              <img 
                src="https://img.shields.io/badge/version-1.0.0-blue.svg" 
                alt="Version 1.0.0" 
                className="brand__version-badge"
              />
            </a>
          </div>
        </div>

        <div className="topbar__actions">
          <ViewModeSelector currentMode={viewMode} onChange={handleViewModeChange} viewsReady={viewsReady} />
          
          <button
            className="btn file"
            onClick={() => {
              const pretty = JSON.stringify(sampleObj, null, 2)
              setRaw(pretty)
              render(pretty).catch(err => {
                console.error('Failed to render sample:', err)
              })
            }}
          >
            Load sample
          </button>
          <button className="btn file" onClick={() => render(raw).catch(err => {
            console.error('Failed to render:', err)
          })}>
            Render
          </button>

          <label className="btn file">
            <input
              type="file"
              hidden
              accept="application/json,.json"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) readFile(file).catch(err => {
                  console.error('Failed to read file:', err)
                })
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

      <main className={`main${maximizedPanel ? ' maximized' : ''}`} style={mainGridStyle}>
        <section className={`panel${inputCollapsed ? ' collapsed-horizontal' : ''}${maximizedPanel === 'input' ? ' maximized-panel' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={onDrop} title="Drop a .json file here">
          <div className="panel__title">
            <div className="panel__header-content">
              <button 
                className="panel__collapse-btn" 
                onClick={() => setInputCollapsed(!inputCollapsed)}
                title={inputCollapsed ? 'Expand' : 'Collapse'}
              >
                {inputCollapsed ? (isMobile ? '▼' : '▶') : (isMobile ? '▲' : '◀')}
              </button>
              <span className="panel__title-text">Input</span>
              <div className="panel__header-actions">
                {!inputCollapsed && (
                  <>
                    <button className="btn btn--ghost btn--format" onClick={formatJSON}>
                      Format
                    </button>
                    <button
                      className="btn btn--ghost btn--maximize"
                      onClick={() => resetPanelView('input')}
                      title="Reset input panel view"
                    >
                      ⟲
                    </button>
                    <button
                      className="btn btn--ghost btn--maximize"
                      onClick={() => toggleMaximize('input')}
                      title={maximizedPanel === 'input' ? 'Restore' : 'Maximize'}
                    >
                      {maximizedPanel === 'input' ? '◱' : '◰'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          {!inputCollapsed && (
            <>
              <JSONEditor
                value={raw}
                onChange={setRaw}
                placeholder={placeholder}
              />
              <div className="hint">Drop a JSON file anywhere in this panel, or paste JSON above. Nothing is uploaded to a server.</div>

              {error && (
                <div className="error">
                  <div className="error__title">Couldn't render</div>
                  <div className="error__msg">{error}</div>
                </div>
              )}
            </>
          )}
        </section>

        <ResizeHandle onResize={handleInputResize} orientation="horizontal" />

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
          {rawNodes.length > 0 ? (
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
                        <button className="btn" onClick={() => void loadGraphView()}>Load Graph View</button>
                        {rawNodes.length > MAX_RENDERABLE_NODES && (
                          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.7 }}>
                            Will show top {MAX_RENDERABLE_NODES.toLocaleString()} highest-risk nodes
                            ({rawNodes.length.toLocaleString()} total).
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
            <div className="empty">
              <div className="empty__title">No data yet</div>
              <div className="empty__msg">Paste or upload an OID-See export JSON and click Render.</div>
            </div>
          )}
        </section>

        <ResizeHandle onResize={handleDetailsResize} orientation="horizontal" />

        <section ref={detailsPanelRef} className={`panel panel--details${detailsCollapsed ? ' collapsed-horizontal' : ''}${maximizedPanel === 'details' ? ' maximized-panel' : ''}`}>
          <div className="panel__title">
            <div className="panel__header-content">
              <button 
                className="panel__collapse-btn" 
                onClick={() => {
                  const newCollapsed = !detailsCollapsed
                  setDetailsCollapsed(newCollapsed)
                  // Track if user manually collapsed the panel
                  if (newCollapsed) {
                    setDetailsManuallyCollapsed(true)
                  } else {
                    setDetailsManuallyCollapsed(false)
                  }
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
        <ErrorDialog 
          message={graphError} 
          onDismiss={() => setGraphError(null)} 
        />
      )}
      
      {largeGraphWarning && (
        <InfoDialog 
          message={largeGraphWarning} 
          onDismiss={() => setLargeGraphWarning(null)} 
        />
      )}
      
      <Legend 
        visible={legendVisible}
        onClose={() => setLegendVisible(false)}
      />
      
      <LoadingOverlay visible={loading} message="Loading data" progress={loadingProgress} />
    </div>
  )
}

import { useEffect, useMemo, useState, useRef } from 'react'
import { GraphCanvas, Selection, GraphCanvasHandle, PhysicsConfig, DEFAULT_PHYSICS } from './components/GraphCanvas'
import { toVisData, toVisDataAsync, VisData, ProgressCallback } from './adapters/toVisData'
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

// Large graph detection threshold - reduced to catch more cases
const LARGE_GRAPH_THRESHOLD = 3000 // nodes or edges

// Maximum nodes/edges to render - beyond this, graph will be truncated
// Ultra-conservative limits (25% lower again) for guaranteed stability
const MAX_RENDERABLE_NODES = 3000
const MAX_RENDERABLE_EDGES = 4500

// Maximum nodes for subset visualization (hybrid approach)
// This limit ensures optimal performance when visualizing selected subsets
const MAX_SUBSET_VISUALIZATION_NODES = 500

// Delay before processing to allow loading overlay to render
// Increased to 200ms for large graphs to ensure overlay is visible before blocking operations
const RENDER_DELAY_MS = 200 // ms delay to ensure UI updates before heavy processing

// Yield delay between blocking operations to keep UI responsive
const YIELD_DELAY_MS = 50 // ms delay to yield control to event loop

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

function computeWarnings(data: VisData, clauses: Clause[]): string[] {
  const warns: string[] = []
  const nodeObjs = data.nodes.map((n) => n.__oidsee ?? n)
  const edgeObjs = data.edges.map((e) => e.__oidsee ?? e)

  for (const c of clauses) {
    const pool = c.target === 'node' ? nodeObjs : c.target === 'edge' ? edgeObjs : nodeObjs.concat(edgeObjs)

    const anyHas = pool.some((o) => getPath(o, c.path) !== undefined)
    if (!anyHas) {
      warns.push(`No matches for path "${c.path}" (${c.target}). Possible typo or field not present in this export.`)
      continue
    }

    if (isNumericOp(c.op)) {
      const samples = pool
        .map((o) => getPath(o, c.path))
        .filter((v) => v !== undefined && v !== null)
        .slice(0, 25)
      const nonNum = samples.some((v) => typeof v !== 'number' && Number.isNaN(Number(v)))
      if (nonNum) {
        warns.push(`Numeric operator used on non-numeric values at "${c.path}". This clause may filter out everything.`)
      }
    }
  }

  return warns
}

function applyQuery(data: VisData, query: string, lens: Lens, pathAware: boolean) {
  console.log('[OID-See] 🔍 Applying filter/lens:', { query, lens, pathAware, nodeCount: data.nodes.length, edgeCount: data.edges.length })
  const filterStartTime = performance.now()
  
  const parsed = parseQuery(query)
  const clauses = parsed.clauses

  const nodeClauses = clauses.filter((c) => c.target === 'node' || c.target === 'both')
  const edgeClauses = clauses.filter((c) => c.target === 'edge' || c.target === 'both')

  // Step 1: Determine which nodes pass the node filter
  console.log('[OID-See] 📝 Step 1: Filtering nodes...')
  const step1StartTime = performance.now()
  const nodePass = new Set<string>()
  if (nodeClauses.length > 0) {
    // If there are node filters, only include nodes that match
    for (const n of data.nodes) {
      const raw = n.__oidsee ?? n
      const ok = nodeClauses.every((c) => evalClause(raw, c))
      if (ok) nodePass.add(n.id)
    }
  } else {
    // If no node filters, include all nodes initially
    for (const n of data.nodes) {
      nodePass.add(n.id)
    }
  }
  console.log('[OID-See] ✅ Node filtering complete:', { duration: `${(performance.now() - step1StartTime).toFixed(0)}ms`, passedNodes: nodePass.size })

  const edgeById = new Map<string, any>()
  for (const e of data.edges) edgeById.set(e.id, e)

  // Step 2: Filter edges based on edge clauses and lens
  console.log('[OID-See] 📝 Step 2: Filtering edges...')
  const step2StartTime = performance.now()
  const edgesOut: any[] = []
  const edgesKept = new Set<string>()

  for (const e of data.edges) {
    const raw = e.__oidsee ?? e
    const edgeType = raw.type ?? e.label ?? ''
    
    // Check lens filtering
    if (!lensEdgeAllowed(lens, edgeType)) continue

    // Check edge clauses
    const ok = edgeClauses.every((c) => evalClause(raw, c))
    if (!ok) continue

    // Check if both endpoints pass explicit node filter clauses
    if (!nodePass.has(e.from) || !nodePass.has(e.to)) continue

    if (!edgesKept.has(e.id)) {
      edgesOut.push(e)
      edgesKept.add(e.id)
    }

    // Handle path-aware mode: include input edges for derived edges
    if (pathAware && raw?.derived?.isDerived && Array.isArray(raw.derived.inputs)) {
      for (const id of raw.derived.inputs) {
        const inp = edgeById.get(id)
        if (inp && !edgesKept.has(inp.id)) {
          // Only include input edge if both its endpoints are in nodePass
          // AND if the input edge type is allowed in the current lens
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
  console.log('[OID-See] ✅ Edge filtering complete:', { duration: `${(performance.now() - step2StartTime).toFixed(0)}ms`, keptEdges: edgesOut.length })

  // Step 3: Determine final nodes based on visible edges and lens settings
  console.log('[OID-See] 📝 Step 3: Finalizing nodes...')
  const step3StartTime = performance.now()
  const nodesWithEdges = new Set<string>()
  for (const e of edgesOut) {
    nodesWithEdges.add(e.from)
    nodesWithEdges.add(e.to)
  }

  // Filter nodes based on lens and filter settings:
  // - Must pass explicit node filter clauses (if any)
  // - In Full lens: show all nodes that pass node filters
  // - In Risk/Structure lens: only show nodes connected by visible edges (even with node filters)
  const nodesOut = data.nodes.filter((n) => {
    // Must pass explicit node filters
    if (!nodePass.has(n.id)) return false
    
    // In Full lens, show all nodes that pass node filters
    if (lens === 'full') return true
    
    // In Risk/Structure lens, only show nodes connected by visible edges
    // This applies even when there are explicit node filters
    return nodesWithEdges.has(n.id)
  })
  console.log('[OID-See] ✅ Final nodes determined:', { duration: `${(performance.now() - step3StartTime).toFixed(0)}ms`, finalNodes: nodesOut.length })
  
  const edgesFinal = edgesOut
  
  const totalFilterTime = performance.now() - filterStartTime
  console.log('[OID-See] 🎉 Filter/lens application complete:', {
    totalDuration: `${totalFilterTime.toFixed(0)}ms`,
    result: { nodes: nodesOut.length, edges: edgesFinal.length }
  })

  return { nodes: nodesOut, edges: edgesFinal, parsed }
}

export default function App() {
  const [raw, setRaw] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [graphError, setGraphError] = useState<string | null>(null)
  const [data, setData] = useState<VisData | null>(null)
  const [originalData, setOriginalData] = useState<VisData | null>(null) // Full untruncated data for alternative views
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
  const [showCancelButton, setShowCancelButton] = useState<boolean>(false)
  const graphRef = useRef<GraphCanvasHandle>(null)
  const detailsPanelRef = useRef<HTMLElement>(null)
  const graphConversionTimeoutRef = useRef<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const cancelButtonTimeoutRef = useRef<number | null>(null)

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
  }, [data, lens, pathAware])

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
    console.log('[OID-See] 📁 File upload started:', {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.type
    })
    const startTime = performance.now()
    
    // Show loading overlay immediately
    setLoading(true)
    setError(null)
    
    try {
      console.log('[OID-See] 📖 Reading file content...')
      const text = await file.text()
      const readTime = performance.now() - startTime
      console.log('[OID-See] ✅ File read complete:', {
        duration: `${readTime.toFixed(0)}ms`,
        contentSize: `${(text.length / 1024 / 1024).toFixed(2)} MB`
      })
      
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

  // Cancel handler for long-running operations
  function handleCancelLoading() {
    console.log('[OID-See] 🚫 User cancelled loading operation')
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    // Clear the cancel button timeout
    if (cancelButtonTimeoutRef.current !== null) {
      clearTimeout(cancelButtonTimeoutRef.current)
      cancelButtonTimeoutRef.current = null
    }
    setLoading(false)
    setLoadingProgress('')
    setShowCancelButton(false)
    setError('Loading cancelled by user')
  }

  async function render(input: string) {
    console.log('[OID-See] 🔄 Starting render process...')
    const renderStartTime = performance.now()
    
    // Cancel any pending graph conversion from previous render
    if (graphConversionTimeoutRef.current !== null) {
      clearTimeout(graphConversionTimeoutRef.current)
      graphConversionTimeoutRef.current = null
      console.log('[OID-See] 🚫 Cancelled previous graph conversion')
    }
    
    // Cancel any previous abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller for this render
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal
    
    setLoading(true)
    setLoadingProgress('Initializing...')
    setError(null)
    setSelection(null)
    setLargeGraphWarning(null)
    setShowCancelButton(false)
    
    // Show cancel button after 5 seconds for large datasets
    if (cancelButtonTimeoutRef.current !== null) {
      clearTimeout(cancelButtonTimeoutRef.current)
    }
    cancelButtonTimeoutRef.current = window.setTimeout(() => {
      console.log('[OID-See] ⏱️ Showing cancel button (processing > 5 seconds)')
      setShowCancelButton(true)
    }, 5000)
    
    try {
      // Use setTimeout to allow the loading overlay to render before heavy processing
      console.log(`[OID-See] ⏱️  Waiting ${RENDER_DELAY_MS}ms for UI to update...`)
      await new Promise(resolve => setTimeout(resolve, RENDER_DELAY_MS))
      
      setLoadingProgress('Parsing JSON data...')
      console.log('[OID-See] 🔍 Parsing JSON...')
      // Yield to allow progress message to render
      await yieldToEventLoop()
      
      const parseStartTime = performance.now()
      const parsed = JSON.parse(input)
      const parseTime = performance.now() - parseStartTime
      console.log('[OID-See] ✅ JSON parse complete:', `${parseTime.toFixed(0)}ms`)
      
      // Yield to event loop after parsing large JSON
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // Check if this is a large graph
      const nodeCount = parsed?.nodes?.length || 0
      const edgeCount = parsed?.edges?.length || 0
      console.log('[OID-See] 📊 Graph size:', {
        nodes: nodeCount.toLocaleString(),
        edges: edgeCount.toLocaleString()
      })
      
      const isLargeGraph = nodeCount >= LARGE_GRAPH_THRESHOLD || edgeCount >= LARGE_GRAPH_THRESHOLD
      console.log('[OID-See] 🎯 Large graph detection:', {
        isLarge: isLargeGraph,
        threshold: LARGE_GRAPH_THRESHOLD
      })
      
      // Check if graph exceeds renderable limits
      const exceedsLimits = nodeCount > MAX_RENDERABLE_NODES || edgeCount > MAX_RENDERABLE_EDGES
      console.log('[OID-See] 🚧 Render limit check:', {
        exceedsLimits,
        maxNodes: MAX_RENDERABLE_NODES,
        maxEdges: MAX_RENDERABLE_EDGES
      })
      
      // IMPORTANT: Do NOT truncate here! Dashboard needs full data immediately.
      // Truncation will happen in background when converting for graph view.
      
      if (exceedsLimits) {
        console.log('[OID-See] ℹ️  Graph exceeds limits - will truncate ONLY for graph view in background')
        console.log('[OID-See] ℹ️  Alternative views (Table, Tree, Matrix, Dashboard) will use full dataset')
        
        // Warn user about truncation for graph view only
        setLargeGraphWarning(
          `⚠️ Graph view will be truncated to ${MAX_RENDERABLE_NODES.toLocaleString()} highest-risk nodes (dataset: ${nodeCount.toLocaleString()} nodes, ${edgeCount.toLocaleString()} edges). ` +
          `Use Table, Tree, Matrix, or Dashboard views to see the full dataset. Physics disabled for performance.`
        )
        
        // Disable physics for truncated graphs
        console.log('[OID-See] ⚙️  Disabling physics for large graph...')
        const physicsDisabled = createDisabledPhysicsConfig()
        setPhysicsConfig(physicsDisabled)
        savePhysicsConfig(physicsDisabled)
      } else if (isLargeGraph) {
        console.log('[OID-See] ⚙️  Disabling physics for large graph...')
        // For large graphs, disable physics by default to prevent UI blocking
        const physicsDisabled = createDisabledPhysicsConfig()
        setPhysicsConfig(physicsDisabled)
        savePhysicsConfig(physicsDisabled)
        setLargeGraphWarning(
          `Large graph detected (${nodeCount.toLocaleString()} nodes, ${edgeCount.toLocaleString()} edges). ` +
          `Physics disabled by default for better performance. You can enable physics in the graph controls if needed.`
        )
      }
      
      // PRIORITY 1: Convert full dataset for alternative views (dashboard, table, tree, matrix)
      // These views don't need vis-network format, they work directly with OidSee format
      console.log('[OID-See] 🎨 Preparing data for dashboard and alternative views...')
      setLoadingProgress('Preparing dashboard view...')
      await yieldToEventLoop()
      
      const originalVisStartTime = performance.now()
      const originalVis = isLargeGraph 
        ? await toVisDataAsync(parsed, (progress) => setLoadingProgress(progress), signal) 
        : toVisData(parsed)
      const originalVisTime = performance.now() - originalVisStartTime
      console.log('[OID-See] ✅ Alternative views data ready:', {
        duration: `${originalVisTime.toFixed(0)}ms`,
        nodes: originalVis.nodes.length.toLocaleString(),
        edges: originalVis.edges.length.toLocaleString()
      })
      
      // Set original data immediately for dashboard/table/tree/matrix views
      setOriginalData(originalVis)
      setViewsReady(new Set(['dashboard', 'table', 'tree', 'matrix']))
      
      console.log('[OID-See] ✅ Dashboard and alternative views ready!')
      
      const dashboardTime = performance.now() - renderStartTime
      console.log('[OID-See] 🎉 Dashboard ready in:', `${dashboardTime.toFixed(0)}ms`)
      
      // HIDE LOADING DIALOG NOW - Dashboard is ready and user can interact
      setLoading(false)
      setLoadingProgress('')
      setShowCancelButton(false)
      
      // Clear cancel button timeout since we're done with the main loading
      if (cancelButtonTimeoutRef.current !== null) {
        clearTimeout(cancelButtonTimeoutRef.current)
        cancelButtonTimeoutRef.current = null
      }
      
      // PRIORITY 2: Truncate and convert data for graph view in TRUE BACKGROUND
      // Use setTimeout to move this completely off the main render flow
      // Store timeout ID for cleanup
      // Capture the start time for accurate background task measurement
      const graphConversionStartTime = performance.now()
      graphConversionTimeoutRef.current = window.setTimeout(async () => {
        try {
          console.log('[OID-See] 🎨 Starting background graph view preparation...')
          
          // Truncate if needed (do this in background, not in main render flow!)
          let graphParsed = parsed
          if (exceedsLimits) {
            console.log('[OID-See] ✂️  Truncating data for graph view (background)...')
            const truncateStartTime = performance.now()
            
            // Clone to avoid mutating original
            graphParsed = { ...parsed, nodes: [...parsed.nodes], edges: [...(parsed.edges || [])] }
            
            // Create indices array for sorting
            console.log('[OID-See] 📋 Creating index array for sorting...')
            const indices = Array.from({ length: graphParsed.nodes.length }, (_, i) => i)
            
            // Sort indices by risk score (highest first)
            console.log('[OID-See] 📋 Sorting nodes by risk score...')
            indices.sort((aIdx, bIdx) => {
              const a = graphParsed.nodes[aIdx]
              const b = graphParsed.nodes[bIdx]
              const scoreA = a?.risk?.score ?? 0
              const scoreB = b?.risk?.score ?? 0
              return scoreB - scoreA
            })
            const sortTime = performance.now() - truncateStartTime
            console.log('[OID-See] ✅ Sort complete:', `${sortTime.toFixed(0)}ms`)
            
            // Take top N highest-risk nodes
            console.log(`[OID-See] ✂️  Selecting top ${MAX_RENDERABLE_NODES.toLocaleString()} risk nodes...`)
            const truncatedNodes = indices.slice(0, MAX_RENDERABLE_NODES).map(i => graphParsed.nodes[i])
            const nodeIds = new Set(truncatedNodes.map((n: OidSeeNode) => n.id))
            
            // Filter edges
            console.log('[OID-See] 🔗 Filtering edges...')
            const truncatedEdges = (graphParsed.edges || [])
              .filter((e: OidSeeEdge) => nodeIds.has(e.from) && nodeIds.has(e.to))
              .slice(0, MAX_RENDERABLE_EDGES)
            
            graphParsed.nodes = truncatedNodes
            graphParsed.edges = truncatedEdges
            
            const truncateTime = performance.now() - truncateStartTime
            console.log('[OID-See] ✅ Truncation complete:', {
              duration: `${truncateTime.toFixed(0)}ms`,
              graphViewNodes: truncatedNodes.length.toLocaleString(),
              graphViewEdges: truncatedEdges.length.toLocaleString()
            })
          }
          
          console.log('[OID-See] 🎨 Converting data to vis-network format for graph view...')
          const visStartTime = performance.now()
          // Use async version for large graphs to prevent UI blocking
          // Note: Background task - progress updates won't show in UI but will log to console
          const vis = isLargeGraph 
            ? await toVisDataAsync(graphParsed, (progress) => console.log(`[OID-See] ${progress}`)) 
            : toVisData(graphParsed)
          const visTime = performance.now() - visStartTime
          console.log('[OID-See] ✅ Graph view data ready:', {
            duration: `${visTime.toFixed(0)}ms`,
            nodes: vis.nodes.length.toLocaleString(),
            edges: vis.edges.length.toLocaleString()
          })
          
          // Set graph data
          setData(vis)
          setViewsReady(prev => new Set([...prev, 'graph']))
          
          const totalTime = performance.now() - renderStartTime
          const graphTaskTime = performance.now() - graphConversionStartTime
          console.log(`[OID-See] ✅ All views ready! Dashboard: ${dashboardTime.toFixed(0)}ms, Graph: ${graphTaskTime.toFixed(0)}ms, Total: ${totalTime.toFixed(0)}ms`)
        } catch (e: any) {
          console.error('[OID-See] ❌ Background graph conversion error:', e)
          // Graph view fails silently - other views still work
        }
      }, 100) // Small delay to ensure dashboard renders first
      
    } catch (e: any) {
      console.error('[OID-See] ❌ Render error:', e)
      setData(null)
      setOriginalData(null)
      setViewsReady(new Set())
      setSelection(null)
      // Don't show error if it was a user cancellation
      if (e?.message !== 'Processing cancelled') {
        setError(e?.message ?? String(e))
      }
      // Only set loading false if it hasn't been set already
      setLoading(false)
      setLoadingProgress('')
      setShowCancelButton(false)
    } finally {
      // Clean up cancel button timeout
      if (cancelButtonTimeoutRef.current !== null) {
        clearTimeout(cancelButtonTimeoutRef.current)
        cancelButtonTimeoutRef.current = null
      }
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) void readFile(file)
  }

  // Filtered data for graph view (uses truncated data)
  const filtered = useMemo(() => {
    if (!data) return null
    try {
      return applyQuery(data, query.trim(), lens, pathAware)
    } catch (e) {
      console.error('Error applying query/lens filter:', e)
      // Return unfiltered data on error to prevent complete failure
      return data
    }
  }, [data, query, lens, pathAware])

  // Filtered data for alternative views (uses full originalData)
  const filteredOriginal = useMemo(() => {
    if (!originalData) return null
    try {
      return applyQuery(originalData, query.trim(), lens, pathAware)
    } catch (e) {
      console.error('Error applying query/lens filter to original data:', e)
      // Return unfiltered data on error to prevent complete failure
      return originalData
    }
  }, [originalData, query, lens, pathAware])

  const counts = useMemo(() => {
    if (!data || !filtered) return undefined
    return {
      nodes: filtered.nodes.length,
      edges: filtered.edges.length,
      totalNodes: originalData?.nodes.length ?? data?.nodes.length ?? 0,
      totalEdges: originalData?.edges.length ?? data?.edges.length ?? 0,
    }
  }, [data, filtered, originalData])

  const warnings = useMemo(() => {
    if (!data) return []
    const p = parseQuery(query)
    if (p.errors.length) return []
    return computeWarnings(data, p.clauses)
  }, [data, query])

  // Memoized Maps for fast lookups in handleFocus
  const nodeMap = useMemo(() => {
    if (!data) return new Map()
    return new Map(data.nodes.map(n => [n.id, n]))
  }, [data])

  const edgeMap = useMemo(() => {
    if (!data) return new Map()
    return new Map(data.edges.map(e => [e.id, e]))
  }, [data])

  // Extract original nodes and edges from full dataset for alternative views
  const originalNodes = useMemo(() => {
    if (!originalData) return []
    return originalData.nodes.map(n => n.__oidsee ?? n as OidSeeNode).filter((n): n is OidSeeNode => !!n)
  }, [originalData])

  const originalEdges = useMemo(() => {
    if (!originalData) return []
    return originalData.edges.map(e => e.__oidsee ?? e as OidSeeEdge).filter((e): e is OidSeeEdge => !!e)
  }, [originalData])

  // Filtered nodes and edges for alternative views (from full dataset)
  const filteredNodes = useMemo(() => {
    if (!filteredOriginal) return []
    return filteredOriginal.nodes.map(n => n.__oidsee ?? n as OidSeeNode).filter((n): n is OidSeeNode => !!n)
  }, [filteredOriginal])

  const filteredEdges = useMemo(() => {
    if (!filteredOriginal) return []
    return filteredOriginal.edges.map(e => e.__oidsee ?? e as OidSeeEdge).filter((e): e is OidSeeEdge => !!e)
  }, [filteredOriginal])

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
    // Find the full data object with oidsee properties using memoized Maps
    let fullSelection: Selection = sel
    if (sel.kind === 'node') {
      const node = nodeMap.get(sel.id)
      if (node) {
        fullSelection = { kind: 'node', id: sel.id, oidsee: node.__oidsee ?? node }
      }
    } else if (sel.kind === 'edge') {
      const edge = edgeMap.get(sel.id)
      if (edge) {
        fullSelection = { kind: 'edge', id: sel.id, oidsee: edge.__oidsee ?? edge }
      }
    }
    
    // Update selection to load details
    setSelection(fullSelection)
    
    // Focus the item in the graph
    if (sel.kind === 'node') {
      graphRef.current?.focusNode(sel.id)
    } else if (sel.kind === 'edge') {
      graphRef.current?.focusEdge(sel.id)
    }
  }

  function handlePhysicsChange(config: PhysicsConfig) {
    setPhysicsConfig(config)
    savePhysicsConfig(config)
  }

  function handlePhysicsReset() {
    setPhysicsConfig(DEFAULT_PHYSICS)
    savePhysicsConfig(DEFAULT_PHYSICS)
  }

  // Handle visualization of selected node subset
  function handleVisualizeNodes(nodeIds: string[]) {
    if (nodeIds.length === 0) return
    
    // Check size constraints
    if (nodeIds.length > MAX_SUBSET_VISUALIZATION_NODES) {
      alert(`Selection too large (${nodeIds.length} nodes). Please select ${MAX_SUBSET_VISUALIZATION_NODES} or fewer nodes for visualization.`)
      return
    }
    
    // Create a filter query for the selected nodes
    const idQuery = nodeIds.map(id => `n.id="${id}"`).join(' ')
    setQuery(idQuery)
    setViewMode('graph')
    
    // Show info message
    setLargeGraphWarning(
      `Visualizing ${nodeIds.length} selected node${nodeIds.length !== 1 ? 's' : ''}. ` +
      `Use the filter controls to adjust the view or return to previous mode.`
    )
  }

  // Handle visualization of table items (nodes or edges)
  function handleVisualizeTableItems(items: any[]) {
    if (items.length === 0) return
    
    const nodeItems = items.filter(item => item.__itemType === 'node')
    if (nodeItems.length > 0) {
      handleVisualizeNodes(nodeItems.map(item => item.id))
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
          <ViewModeSelector currentMode={viewMode} onChange={setViewMode} viewsReady={viewsReady} />
          
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
          {data && filtered ? (
            <>
              {viewMode === 'graph' && (
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
      
      <LoadingOverlay 
        visible={loading} 
        message="Loading data" 
        progress={loadingProgress}
        onCancel={handleCancelLoading}
        showCancel={showCancelButton}
      />
    </div>
  )
}

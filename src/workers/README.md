# OID-See Web Worker Architecture

## Overview

All heavy processing in the OID-See viewer runs in a single Web Worker (`dataWorker.ts`). The main thread is never blocked during JSON import, filter/lens evaluation, or graph conversion.

## File

| File | Purpose |
|------|---------|
| `dataWorker.ts` | Single worker: parses JSON, runs `applyFilter`, converts dataset to vis-network format |

## Why a Single Worker?

- **Simpler state**: the full parsed dataset lives in one place — no serialisation overhead or coordination between multiple workers
- **No inter-worker communication**: filter and graph conversion both operate on the same in-memory data
- **Easier cancellation**: a single `ABORT_GRAPH` message stops the current graph build

## Initialisation in App.tsx

The worker is created using Vite's module worker syntax so it can import project modules directly:

```ts
const worker = new Worker(
  new URL('./workers/dataWorker.ts', import.meta.url),
  { type: 'module' }
);
```

`App.tsx` wires up a `worker.onmessage` handler and sends messages to trigger each operation.

## Message Protocol

### Main → Worker

| Type | Payload | Description |
|------|---------|-------------|
| `LOAD` | `{ text: string }` | Raw JSON text to parse; worker builds the full node/edge dataset |
| `FILTER` | `{ id: number, query: string, lens: string, pathAware: boolean }` | Apply query and lens to the current dataset; `id` lets the main thread discard stale results |
| `LOAD_GRAPH` | `{ subsetNodeIds?: string[] }` | Convert the dataset (or a node-ID subset) to vis-network format |
| `ABORT_GRAPH` | — | Cancel an in-progress `LOAD_GRAPH` operation |

### Worker → Main

| Type | Payload | Description |
|------|---------|-------------|
| `PROGRESS` | `{ message: string }` | Human-readable status update shown in the loading overlay |
| `LOADED` | `{ nodeCount: number, edgeCount: number, exceedsGraphLimits: boolean }` | Parse complete; `exceedsGraphLimits` triggers the large-dataset warning dialog |
| `FILTERED` | `{ id: number, nodes: OidSeeNode[], edges: OidSeeEdge[], warnings: string[] }` | Filter result; main thread wraps the state update in `startTransition` |
| `GRAPH_READY` | `{ nodes: DataSet, edges: DataSet }` | vis-network-ready data; main thread hands this to `GraphCanvas` |
| `ERROR` | `{ message: string }` | Unrecoverable error; displayed in the error dialog |

## What Stays on the Main Thread

- React state management and UI rendering
- `applyQuery` for the graph view subset (≤ 3,000 nodes, fast enough to run inline)
- vis-network canvas rendering (must run on the main thread — no OffscreenCanvas)

## Large Dataset Limits

- **Graph View**: capped at 3,000 highest-risk nodes / 4,500 edges (worker selects the subset before sending `GRAPH_READY`)
- **All other views** (Table, Tree, Matrix, Dashboard): receive the full `FILTERED` dataset — no cap

## iOS Safari

Graph View is permanently disabled on all iOS devices. Apple requires every iOS browser to use the WebKit engine; WebKit runs out of memory when vis-network renders large canvases. The worker detects the iOS user-agent and `App.tsx` disables the Graph tab accordingly. All other views work normally on iOS.

## Related Files

- `src/filters/lens.ts` — exports `lensEdgeAllowed()` so the worker can import it directly
- `src/App.tsx` — creates the worker, sends messages, handles responses
- `docs/LARGE_GRAPH_ARCHITECTURE.md` — architectural background and historical design notes

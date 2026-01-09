# OID-See Web Workers

This directory contains web workers for offloading heavy computational tasks from the main UI thread, ensuring the application remains responsive even when processing large datasets.

## Architecture

### Message Protocol

All workers follow a standardized message protocol defined in `types.ts`:

```typescript
interface WorkerMessage {
  type: 'init' | 'execute' | 'cancel' | 'progress' | 'complete' | 'error'
  id: string  // Unique message ID for tracking
  payload?: any
}
```

#### Message Types:
- **execute**: Request to start a task
- **cancel**: Request to cancel a running task
- **progress**: Progress update from worker to main thread
- **complete**: Task completed successfully
- **error**: Task failed with error

### Worker Manager

The `WorkerManager` class (in `WorkerManager.ts`) provides a Promise-based API for worker communication:

```typescript
const manager = new WorkerManager({ 
  workerUrl: '...', 
  onProgress: (stage, progress, message) => {
    // Handle progress updates
  }
})

// Execute a task
const result = await manager.execute('taskType', payload, onProgress)

// Cancel a task
await manager.cancel(taskId)

// Terminate worker
manager.terminate()
```

### Worker Pool

For parallel processing, use the `WorkerPool` class:

```typescript
const pool = new WorkerPool(workerUrl, poolSize)
await pool.initialize()

// Tasks are distributed across workers using round-robin
const result = await pool.execute('taskType', payload, onProgress)

pool.terminate()
```

## Available Workers

**Active Workers (Currently Integrated):**
1. FileParser Worker - Handles file reading and JSON parsing
2. GraphProcessor Worker - Converts data and computes positions
3. Filter Worker - Asynchronous filtering of nodes and edges

**Available but Not Integrated:**
- Layout Worker - Advanced layout computation
- Analytics Worker - Graph statistics and risk analysis

### 1. FileParser Worker (`fileParser.worker.ts`)

Handles file reading and JSON parsing off the main thread.

**Task Types:**
- `parseFile`: Read and parse a File object
- `parseText`: Parse a JSON string

**Usage:**
```typescript
const parsed = await fileParserWorker.execute('parseFile', 
  { file: myFile },
  (stage, progress, message) => {
    console.log(`${stage}: ${message} (${progress}%)`)
  }
)
```

**Features:**
- Uses `FileReaderSync` for efficient file reading (worker-only API)
- Automatic selection between chunked and direct reading based on file size
- Progress tracking for read and parse stages
- Cancellation support

**Progress Stages:**
1. `reading` (0-50%): Reading file content
2. `parsing` (50-100%): Parsing JSON

### 2. Filter Worker (`filter.worker.ts`)

Handles filtering of nodes and edges asynchronously, preventing UI blocking for large datasets.

**Status: INTEGRATED** - Filtering operations now run off the main thread using this worker.

Filtering runs asynchronously via `filterWorkerRef.current.execute()` in a useEffect hook with debouncing (300ms) and version tracking to prevent race conditions. The implementation uses request versioning to discard stale results from outdated filter operations.

**Integration Details:**
- Debounced filter requests prevent excessive worker calls during typing
- Version tracking ensures only the latest filter results are applied
- Filters both truncated data (graph view) and full originalData (alternative views)
- Error handling falls back to unfiltered data
- Progress logged to console without UI flicker

**Task Types:**
- `applyQuery`: Filter nodes and edges based on query and lens

**Usage:**
```typescript
const result = await filterWorker.execute('applyQuery', {
  nodes,
  edges,
  query: 'n.risk.score>=70',
  lens: 'full',
  pathAware: false
})
```

**Features:**
- Batch processing with cancellation checkpoints
- Progress tracking for node and edge filtering
- Supports all query operators and lens types
- Path-aware filtering for derived edges
- Race condition prevention via version tracking

**Progress Stages:**
1. `parsing` (5%): Parsing query
2. `filtering_nodes` (10-40%): Filtering nodes
3. `filtering_edges` (45-75%): Filtering edges
4. `finalizing` (80-100%): Finalizing node set

### 3. GraphProcessor Worker (`graphProcessor.worker.ts`)

Performs graph processing operations (coordinate computation, risk calculations) off the main thread.

**Task Types:**
- `processGraph`: Convert parsed data to visualization-ready format with coordinates

**Features:**
- Handles conversion of OID-See data to vis.js format
- Computes initial node positions using clustering
- Progress tracking for processing stages
- Cancellation support
- Efficient processing for large graphs

**Progress Stages:**
1. `converting` (0-50%): Converting data format
2. `positioning` (50-100%): Computing node positions

### 4. Layout Worker (`layout.worker.ts`)

Computes graph layouts off the main thread.

**Task Types:**
- `computeLayout`: Calculate initial node positions using clustering

**Usage:**
```typescript
const positions = await layoutWorker.execute('computeLayout', {
  nodes,
  options: {
    maxClusterSize: 100,
    groupBy: ['type', 'riskLevel'],
    canvasWidth: 1920,
    canvasHeight: 1080
  }
})
// positions: Array<{ id: string, x: number, y: number }>
```

**Features:**
- Delegates to ClusteringLayoutEngine
- Progress tracking for layout stages
- Cancellation support
- Handles large graphs efficiently

**Progress Stages:**
1. `indexing` (10%): Indexing nodes
2. `clustering` (20-100%): Creating and positioning clusters

### 5. Analytics Worker (`analytics.worker.ts`)

Performs risk computation and graph analysis off the main thread.

**Task Types:**
- `computeStatistics`: Calculate comprehensive graph statistics

**Usage:**
```typescript
const stats = await analyticsWorker.execute('computeStatistics', {
  nodes,
  edges
})
// stats: { nodesByType, edgesByType, riskDistribution, ... }
```

**Features:**
- Batch processing for large datasets
- Progress tracking for analysis stages
- Cancellation support
- Tier exposure analysis
- Top risky nodes ranking

**Progress Stages:**
1. `indexing` (10-40%): Analyzing node and edge types
2. `scoring` (40-60%): Computing risk distribution
3. `ranking` (60-70%): Ranking risky nodes
4. `aggregating` (70-100%): Computing tier exposure

## Performance Considerations

### Batch Processing

All workers use batch processing to:
- Allow cancellation during long operations
- Yield control to browser for responsiveness
- Report progress at regular intervals

Typical batch sizes:
- Small datasets (<1000 items): 500 items/batch
- Medium datasets (1000-5000 items): 250 items/batch
- Large datasets (5000-15000 items): 150 items/batch
- Very large datasets (>15000 items): 100 items/batch

### Memory Management

- Workers operate on structured clones of data (no shared memory)
- Large results are transferred back using structured cloning
- Consider using Transferable objects for very large ArrayBuffers (future enhancement)

### Progress Updates

Progress callbacks are throttled to avoid excessive re-renders:
- Minimum interval: 150ms between UI updates
- Console logs: Every batch for detailed tracking
- UI updates: Throttled for performance

## Integration Guide

### Basic Integration

```typescript
import FileParserWorker from './workers/fileParser.worker?worker'
import { WorkerManager } from './workers/WorkerManager'

// Create worker manager
const fileParserWorker = new WorkerManager({
  workerUrl: '',
  onProgress: (stage, progress, message) => {
    setLoadingProgress(message)
  }
})

// Initialize with Vite worker
fileParserWorker['worker'] = new FileParserWorker()
fileParserWorker['worker'].onmessage = (event) => {
  fileParserWorker['handleMessage'](event.data)
}

// Use the worker
try {
  const result = await fileParserWorker.execute('parseFile', { file })
} catch (error) {
  console.error('Worker error:', error)
}

// Cleanup
fileParserWorker.terminate()
```

### Vite Configuration

Workers are automatically bundled by Vite with the `?worker` suffix:

```typescript
import MyWorker from './workers/my.worker?worker'

const worker = new MyWorker()
```

Vite configuration (`vite.config.ts`):
```typescript
export default defineConfig({
  worker: {
    format: 'es',
    plugins: () => []
  }
})
```

## Error Handling

### Cancellation

Tasks can be cancelled using the worker manager:

```typescript
const taskId = 'task-123'
await workerManager.cancel(taskId)
```

Workers check for cancellation at strategic points:
- Between batches
- Before expensive operations
- After yielding to event loop

### Error Recovery

Workers send structured error messages:

```typescript
{
  type: 'error',
  id: taskId,
  payload: {
    message: 'Error message',
    stack: 'Stack trace'
  }
}
```

Main thread receives errors as rejected promises:

```typescript
try {
  await worker.execute('task', data)
} catch (error) {
  // Handle error
}
```

## Future Enhancements

1. **Shared Array Buffers**: For zero-copy data transfer
2. **Worker Pool Auto-Scaling**: Adjust pool size based on workload
3. **Persistent Workers**: Keep workers alive for subsequent operations
4. **Streaming Results**: Stream partial results back progressively
5. **WebAssembly Integration**: For compute-intensive algorithms
6. **IndexedDB Integration**: For caching large datasets in workers

## Debugging

### Console Logging

Workers log detailed progress to console:

```
[FileParserWorker] Worker initialized
[FileParserWorker] Starting parseFile task
[FileParserWorker] Reading file (2.5 MB)...
[FileParserWorker] File read complete (145ms)
[FileParserWorker] Parsing JSON...
[FileParserWorker] Parsing complete (89ms)
```

### Performance Monitoring

Use `performance.now()` to measure worker execution time:

```typescript
const start = performance.now()
const result = await worker.execute('task', data)
console.log(`Task completed in ${performance.now() - start}ms`)
```

### Browser DevTools

- Worker threads appear in the Sources/Threads panel
- Set breakpoints in worker code
- Monitor worker performance in Performance panel
- View worker memory usage in Memory panel

## Best Practices

1. **Keep Workers Lightweight**: Don't bundle unnecessary dependencies
2. **Batch Data Transfer**: Send large datasets in chunks if possible
3. **Progress Updates**: Report progress at meaningful intervals
4. **Error Messages**: Provide clear, actionable error messages
5. **Cancellation**: Always support task cancellation for long operations
6. **Memory Cleanup**: Terminate workers when no longer needed
7. **Test with Large Data**: Ensure workers handle edge cases
8. **Document Task Types**: Clearly document expected input/output

## Testing

### Unit Testing

Test worker logic separately:

```typescript
import { applyQuery } from './filter.worker'

test('applyQuery filters nodes correctly', () => {
  const result = applyQuery(taskId, {
    nodes: [...],
    edges: [...],
    query: 'n.risk.score>=70',
    lens: 'full',
    pathAware: false
  })
  expect(result.nodes.length).toBe(5)
})
```

### Integration Testing

Test worker communication:

```typescript
test('FileParser worker parses file', async () => {
  const worker = new WorkerManager({ workerUrl: '...' })
  const file = new File(['{"test": true}'], 'test.json')
  const result = await worker.execute('parseFile', { file })
  expect(result).toEqual({ test: true })
  worker.terminate()
})
```

## License

See project LICENSE file.

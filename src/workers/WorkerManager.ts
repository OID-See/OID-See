/**
 * Worker Manager - Utility for managing web worker lifecycle and communication
 */

import { 
  WorkerMessage, 
  WorkerTask, 
  ProgressMessage, 
  CompleteMessage, 
  ErrorMessage,
  isProgressMessage,
  isCompleteMessage,
  isErrorMessage
} from './types'

export type ProgressCallback = (stage: string, progress: number, message: string) => void

export interface WorkerManagerOptions {
  workerUrl: string
  onProgress?: ProgressCallback
}

/**
 * Manages a single web worker instance with promise-based API
 */
export class WorkerManager {
  private worker: Worker | null = null
  private tasks: Map<string, WorkerTask> = new Map()
  private callbacks: Map<string, {
    resolve: (result: any) => void
    reject: (error: Error) => void
    onProgress?: ProgressCallback
  }> = new Map()
  private taskIdCounter = 0
  private workerUrl: string
  private globalProgressCallback?: ProgressCallback

  constructor(options: WorkerManagerOptions) {
    this.workerUrl = options.workerUrl
    this.globalProgressCallback = options.onProgress
  }

  /**
   * Initialize the worker
   */
  async initialize(): Promise<void> {
    if (this.worker) {
      return // Already initialized
    }

    return new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(this.workerUrl, { type: 'module' })
        
        this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
          this.handleMessage(event.data)
        }

        this.worker.onerror = (error) => {
          console.error('[WorkerManager] Worker error:', error)
          reject(new Error(`Worker error: ${error.message}`))
        }

        // Worker is ready after creation
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Execute a task in the worker
   */
  async execute<T = any>(
    taskType: string, 
    payload: any, 
    onProgress?: ProgressCallback
  ): Promise<T> {
    if (!this.worker) {
      await this.initialize()
    }

    const taskId = this.generateTaskId()
    
    return new Promise((resolve, reject) => {
      // Store callbacks
      this.callbacks.set(taskId, {
        resolve,
        reject,
        onProgress: onProgress || this.globalProgressCallback
      })

      // Create task
      const task: WorkerTask = {
        id: taskId,
        status: 'pending'
      }
      this.tasks.set(taskId, task)

      // Send execute message
      const message: WorkerMessage = {
        type: 'execute',
        id: taskId,
        payload: {
          taskType,
          data: payload
        }
      }

      this.worker!.postMessage(message)
      
      // Update task status
      task.status = 'running'
    })
  }

  /**
   * Cancel a running task
   */
  async cancel(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task || task.status !== 'running') {
      return
    }

    // Send cancel message
    const message: WorkerMessage = {
      type: 'cancel',
      id: taskId
    }
    this.worker?.postMessage(message)

    // Update task status
    task.status = 'cancelled'
    
    // Reject the promise
    const callbacks = this.callbacks.get(taskId)
    if (callbacks) {
      callbacks.reject(new Error('Task cancelled'))
      this.callbacks.delete(taskId)
    }
  }

  /**
   * Terminate the worker and clean up
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }

    // Reject all pending tasks
    for (const [taskId, callbacks] of this.callbacks.entries()) {
      callbacks.reject(new Error('Worker terminated'))
    }

    this.callbacks.clear()
    this.tasks.clear()
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): WorkerTask | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * Handle messages from worker
   */
  private handleMessage(message: WorkerMessage): void {
    const taskId = message.id
    const task = this.tasks.get(taskId)
    const callbacks = this.callbacks.get(taskId)

    if (!task || !callbacks) {
      console.warn('[WorkerManager] Received message for unknown task:', taskId)
      return
    }

    if (isProgressMessage(message)) {
      // Update task progress
      task.progress = {
        stage: message.payload.stage,
        progress: message.payload.progress,
        message: message.payload.message
      }

      // Call progress callback
      if (callbacks.onProgress) {
        callbacks.onProgress(
          message.payload.stage,
          message.payload.progress,
          message.payload.message
        )
      }
    } else if (isCompleteMessage(message)) {
      // Task completed successfully
      task.status = 'completed'
      task.result = message.payload
      
      callbacks.resolve(message.payload)
      this.callbacks.delete(taskId)
    } else if (isErrorMessage(message)) {
      // Task failed
      task.status = 'error'
      task.error = message.payload.message
      
      callbacks.reject(new Error(message.payload.message))
      this.callbacks.delete(taskId)
    }
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${this.taskIdCounter++}`
  }
}

/**
 * Pool of workers for parallel processing
 */
export class WorkerPool {
  private workers: WorkerManager[] = []
  private workerUrl: string
  private poolSize: number
  private nextWorkerIndex = 0

  constructor(workerUrl: string, poolSize: number = navigator.hardwareConcurrency || 4) {
    this.workerUrl = workerUrl
    this.poolSize = Math.min(poolSize, 8) // Cap at 8 workers
  }

  /**
   * Initialize the worker pool
   */
  async initialize(): Promise<void> {
    const initPromises: Promise<void>[] = []
    
    for (let i = 0; i < this.poolSize; i++) {
      const manager = new WorkerManager({ workerUrl: this.workerUrl })
      this.workers.push(manager)
      initPromises.push(manager.initialize())
    }

    await Promise.all(initPromises)
  }

  /**
   * Execute a task using round-robin worker selection
   */
  async execute<T = any>(
    taskType: string,
    payload: any,
    onProgress?: ProgressCallback
  ): Promise<T> {
    if (this.workers.length === 0) {
      await this.initialize()
    }

    // Round-robin selection
    const worker = this.workers[this.nextWorkerIndex]
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length

    return worker.execute<T>(taskType, payload, onProgress)
  }

  /**
   * Terminate all workers
   */
  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate()
    }
    this.workers = []
  }
}

/**
 * File Parser Worker - Handles file reading and JSON parsing off the main thread
 * Uses FileReaderSync for synchronous reading in worker context
 */

import { WorkerMessage, ProgressMessage, CompleteMessage, ErrorMessage } from './types'

// Task types this worker can handle
type FileParserTaskType = 'parseFile' | 'parseText'

interface ParseFilePayload {
  file: File
}

interface ParseTextPayload {
  text: string
}

// Active cancellation tokens
const cancellationTokens = new Set<string>()

/**
 * Check if task is cancelled
 */
function isCancelled(taskId: string): boolean {
  return cancellationTokens.has(taskId)
}

/**
 * Send progress update to main thread
 */
function sendProgress(taskId: string, stage: string, progress: number, message: string): void {
  const progressMsg: ProgressMessage = {
    type: 'progress',
    id: taskId,
    payload: { stage, progress, message }
  }
  self.postMessage(progressMsg)
}

/**
 * Send completion message to main thread
 */
function sendComplete<T>(taskId: string, result: T): void {
  const completeMsg: CompleteMessage<T> = {
    type: 'complete',
    id: taskId,
    payload: result
  }
  self.postMessage(completeMsg)
}

/**
 * Send error message to main thread
 */
function sendError(taskId: string, error: Error): void {
  const errorMsg: ErrorMessage = {
    type: 'error',
    id: taskId,
    payload: {
      message: error.message,
      stack: error.stack
    }
  }
  self.postMessage(errorMsg)
}

/**
 * Parse a file using FileReaderSync (only available in workers)
 */
async function parseFile(taskId: string, file: File): Promise<any> {
  try {
    const fileSize = file.size
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2)
    
    // Stage 1: Reading file
    sendProgress(taskId, 'reading', 0, `Reading file (${fileSizeMB} MB)...`)
    
    // Check cancellation
    if (isCancelled(taskId)) {
      throw new Error('Task cancelled')
    }

    // Use FileReaderSync for synchronous reading in worker
    // This is much faster than async FileReader
    const startReadTime = performance.now()
    let text: string
    
    // For small files, use text() method
    // For large files, use FileReaderSync with chunking
    if (fileSize < 50 * 1024 * 1024) { // 50MB threshold
      text = await file.text()
    } else {
      // Use FileReaderSync for very large files
      // Note: FileReaderSync is only available in workers
      const reader = new FileReaderSync()
      const buffer = reader.readAsArrayBuffer(file)
      const decoder = new TextDecoder('utf-8')
      text = decoder.decode(buffer)
    }
    
    const readDuration = performance.now() - startReadTime
    sendProgress(taskId, 'reading', 50, `File read complete (${readDuration.toFixed(0)}ms)`)

    // Check cancellation
    if (isCancelled(taskId)) {
      throw new Error('Task cancelled')
    }

    // Stage 2: Parsing JSON
    sendProgress(taskId, 'parsing', 50, `Parsing JSON (${(text.length / 1024 / 1024).toFixed(2)} MB)...`)
    
    const startParseTime = performance.now()
    const parsed = JSON.parse(text)
    const parseDuration = performance.now() - startParseTime
    
    sendProgress(taskId, 'parsing', 100, `Parsing complete (${parseDuration.toFixed(0)}ms)`)

    // Check cancellation
    if (isCancelled(taskId)) {
      throw new Error('Task cancelled')
    }

    return parsed
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(String(error))
  }
}

/**
 * Parse text directly (for when text is already in memory)
 */
async function parseText(taskId: string, text: string): Promise<any> {
  try {
    // Stage 1: Parsing JSON
    const textSizeMB = (text.length / 1024 / 1024).toFixed(2)
    sendProgress(taskId, 'parsing', 0, `Parsing JSON (${textSizeMB} MB)...`)
    
    // Check cancellation
    if (isCancelled(taskId)) {
      throw new Error('Task cancelled')
    }

    const startTime = performance.now()
    const parsed = JSON.parse(text)
    const duration = performance.now() - startTime
    
    sendProgress(taskId, 'parsing', 100, `Parsing complete (${duration.toFixed(0)}ms)`)

    // Check cancellation
    if (isCancelled(taskId)) {
      throw new Error('Task cancelled')
    }

    return parsed
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(String(error))
  }
}

/**
 * Handle incoming messages from main thread
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data
  const taskId = message.id

  try {
    if (message.type === 'execute') {
      const { taskType, data } = message.payload
      
      let result: any
      
      switch (taskType as FileParserTaskType) {
        case 'parseFile':
          result = await parseFile(taskId, (data as ParseFilePayload).file)
          break
        case 'parseText':
          result = await parseText(taskId, (data as ParseTextPayload).text)
          break
        default:
          throw new Error(`Unknown task type: ${taskType}`)
      }

      // Remove cancellation token
      cancellationTokens.delete(taskId)
      
      // Send result
      sendComplete(taskId, result)
      
    } else if (message.type === 'cancel') {
      // Mark task as cancelled
      cancellationTokens.add(taskId)
      console.log('[FileParserWorker] Task cancelled:', taskId)
    }
  } catch (error) {
    // Remove cancellation token
    cancellationTokens.delete(taskId)
    
    // Send error
    if (error instanceof Error) {
      sendError(taskId, error)
    } else {
      sendError(taskId, new Error(String(error)))
    }
  }
}

// Log worker initialization
console.log('[FileParserWorker] Worker initialized')

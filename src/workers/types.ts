/**
 * Base types for worker communication protocol
 */

// Base message types
export type WorkerMessageType = 
  | 'init'
  | 'execute'
  | 'cancel'
  | 'progress'
  | 'complete'
  | 'error'

// Base worker message structure
export interface WorkerMessage<T = unknown> {
  type: WorkerMessageType
  id: string // unique message ID for tracking requests/responses
  payload?: T
}

// Progress update message
export interface ProgressMessage {
  type: 'progress'
  id: string
  payload: {
    stage: string
    progress: number // 0-100
    message: string
    details?: any
  }
}

// Complete message
export interface CompleteMessage<T = unknown> {
  type: 'complete'
  id: string
  payload: T
}

// Error message
export interface ErrorMessage {
  type: 'error'
  id: string
  payload: {
    message: string
    stack?: string
  }
}

// Type guards
export function isProgressMessage(msg: WorkerMessage): msg is ProgressMessage {
  return msg.type === 'progress'
}

export function isCompleteMessage(msg: WorkerMessage): msg is CompleteMessage {
  return msg.type === 'complete'
}

export function isErrorMessage(msg: WorkerMessage): msg is ErrorMessage {
  return msg.type === 'error'
}

// Worker task status
export type WorkerTaskStatus = 'pending' | 'running' | 'completed' | 'error' | 'cancelled'

// Worker task
export interface WorkerTask<T = unknown> {
  id: string
  status: WorkerTaskStatus
  result?: T
  error?: string
  progress?: {
    stage: string
    progress: number
    message: string
  }
}

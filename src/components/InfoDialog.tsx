import { useEffect } from 'react'

export interface InfoDialogProps {
  message: string
  onDismiss: () => void
}

export function InfoDialog({ message, onDismiss }: InfoDialogProps) {
  // Allow dismissing with Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onDismiss])

  return (
    <div className="error-dialog-overlay" onClick={onDismiss}>
      <div className="error-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="error-dialog-header">
          <h2>ℹ️ Information</h2>
          <button
            className="error-dialog-close"
            onClick={onDismiss}
            aria-label="Close information dialog"
          >
            ✕
          </button>
        </div>
        <div className="error-dialog-body">
          <p>{message}</p>
        </div>
        <div className="error-dialog-footer">
          <button className="error-dialog-button" onClick={onDismiss}>
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

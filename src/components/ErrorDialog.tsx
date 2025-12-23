import { useEffect } from 'react'

export interface ErrorDialogProps {
  message: string
  onDismiss: () => void
}

export function ErrorDialog({ message, onDismiss }: ErrorDialogProps) {
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
          <h2>⚠️ Error Loading Graph</h2>
          <button
            className="error-dialog-close"
            onClick={onDismiss}
            aria-label="Close error dialog"
          >
            ✕
          </button>
        </div>
        <div className="error-dialog-body">
          <p>{message}</p>
          <p className="error-dialog-hint">
            This error typically occurs when the exported JSON contains duplicate IDs.
            If you're using the scanner, try updating to the latest version which includes
            duplicate ID fixes.
          </p>
        </div>
        <div className="error-dialog-footer">
          <button className="error-dialog-button" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

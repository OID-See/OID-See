import { useEffect, useState } from 'react'

interface LoadingOverlayProps {
  visible: boolean
  message?: string
  progress?: string // Progress status message
  onCancel?: () => void // Optional cancel callback
  showCancel?: boolean // Whether to show cancel button (default: false for first 5 seconds)
}

export function LoadingOverlay({ visible, message = 'Loading...', progress, onCancel, showCancel = false }: LoadingOverlayProps) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (!visible) return

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 500)

    return () => clearInterval(interval)
  }, [visible])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(30, 30, 40, 0.95)',
          padding: '2rem 3rem',
          borderRadius: '12px',
          border: '1px solid rgba(155, 92, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          textAlign: 'center',
          minWidth: '320px',
        }}
      >
        <div
          style={{
            fontSize: '1.2rem',
            color: '#EAF2FF',
            marginBottom: '1rem',
            fontWeight: 500,
          }}
        >
          {message}
          <span aria-hidden="true">{dots}</span>
        </div>
        <div
          style={{
            fontSize: '0.9rem',
            color: 'rgba(234, 242, 255, 0.7)',
            minHeight: '1.5rem',
            marginBottom: showCancel && onCancel ? '1rem' : '0',
          }}
        >
          {progress || 'Processing large dataset...'}
        </div>
        {showCancel && onCancel && (
          <button
            onClick={onCancel}
            style={{
              padding: '0.5rem 1.5rem',
              fontSize: '0.9rem',
              backgroundColor: 'rgba(255, 107, 107, 0.2)',
              color: '#ff6b6b',
              border: '1px solid rgba(255, 107, 107, 0.5)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 107, 107, 0.3)'
              e.currentTarget.style.borderColor = 'rgba(255, 107, 107, 0.8)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 107, 107, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(255, 107, 107, 0.5)'
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

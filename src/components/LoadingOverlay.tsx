import { useEffect, useState } from 'react'

interface LoadingOverlayProps {
  visible: boolean
  message?: string
}

export function LoadingOverlay({ visible, message = 'Loading...' }: LoadingOverlayProps) {
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
          {dots}
        </div>
        <div
          style={{
            fontSize: '0.9rem',
            color: 'rgba(234, 242, 255, 0.7)',
          }}
        >
          Processing large dataset...
        </div>
      </div>
    </div>
  )
}

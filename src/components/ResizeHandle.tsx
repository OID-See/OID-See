import { useEffect, useRef } from 'react'

interface ResizeHandleProps {
  onResize: (delta: number) => void
  orientation?: 'horizontal' | 'vertical'
}

export function ResizeHandle({ onResize, orientation = 'horizontal' }: ResizeHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const handle = handleRef.current
    if (!handle) return

    let startX = 0
    let startY = 0
    let isDragging = false
    let animationFrameId: number | null = null

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true
      startX = e.clientX
      startY = e.clientY
      e.preventDefault()
      document.body.style.cursor = orientation === 'horizontal' ? 'ew-resize' : 'ns-resize'
      document.body.style.userSelect = 'none'
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      // Throttle using requestAnimationFrame to avoid excessive re-renders
      if (animationFrameId !== null) return
      
      animationFrameId = requestAnimationFrame(() => {
        const delta = orientation === 'horizontal' ? e.clientX - startX : e.clientY - startY
        onResize(delta)
        
        if (orientation === 'horizontal') {
          startX = e.clientX
        } else {
          startY = e.clientY
        }
        
        animationFrameId = null
      })
    }

    const handleMouseUp = () => {
      isDragging = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
    }

    handle.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      handle.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [onResize, orientation])

  return (
    <div 
      ref={handleRef}
      className={`resize-handle resize-handle--${orientation}`}
      title={orientation === 'horizontal' ? 'Drag to resize horizontally' : 'Drag to resize vertically'}
    />
  )
}

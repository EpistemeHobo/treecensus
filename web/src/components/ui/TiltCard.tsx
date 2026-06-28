'use client'

import { useRef, ReactNode, MouseEvent } from 'react'
import clsx from 'clsx'

interface TiltCardProps {
  children: ReactNode
  className?: string
  gradient?: boolean
  maxTilt?: number     // max degrees of rotation (default 8)
  glare?: boolean      // subtle glare overlay (default true)
}

// Wraps content in a card that softly rotates in 3D toward the mouse cursor.
// Uses CSS perspective transform driven by mousemove — no rAF needed.

export function TiltCard({
  children,
  className,
  gradient = false,
  maxTilt = 8,
  glare = true,
}: TiltCardProps) {
  const cardRef  = useRef<HTMLDivElement>(null)
  const glareRef = useRef<HTMLDivElement>(null)

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width  - 0.5  // -0.5 … 0.5
    const y = (e.clientY - rect.top)  / rect.height - 0.5

    const rotX = -y * maxTilt  // positive y → tilt top toward viewer
    const rotY =  x * maxTilt

    el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.015,1.015,1.015)`

    if (glareRef.current) {
      // Glare follows the "light source" angle
      const angle  = Math.atan2(y, x) * (180 / Math.PI) + 90
      const dist   = Math.hypot(x, y) * 2   // 0 … 1
      glareRef.current.style.opacity  = String(dist * 0.18)
      glareRef.current.style.transform = `rotate(${angle}deg)`
    }
  }

  function onLeave() {
    const el = cardRef.current
    if (!el) return
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)'
    if (glareRef.current) glareRef.current.style.opacity = '0'
  }

  const inner = (
    <div
      ref={cardRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={clsx(
        'relative overflow-hidden',
        'bg-white/35 dark:bg-surface backdrop-blur-sm border border-dim rounded-lg p-6',
        'transition-transform duration-200 ease-out',
        'will-change-transform',
        className
      )}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}

      {/* Glare layer */}
      {glare && (
        <div
          ref={glareRef}
          className="absolute inset-0 pointer-events-none rounded-lg opacity-0 transition-opacity duration-150"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 60%)',
            transformOrigin: '50% 0%',
          }}
        />
      )}
    </div>
  )

  if (gradient) {
    return (
      <div
        className="rounded-lg p-px"
        style={{
          background: 'linear-gradient(135deg, rgba(168,204,58,0.75), rgba(196,149,106,0.75), rgba(134,163,46,0.5))',
        }}
      >
        {/* replace rounded-lg on inner when gradient shell is present */}
        <div
          ref={cardRef}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          className={clsx(
            'relative overflow-hidden bg-white/5 dark:bg-surface backdrop-blur-sm rounded-[15px] p-6',
            'transition-transform duration-200 ease-out will-change-transform',
            className
          )}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {children}
          {glare && (
            <div
              ref={glareRef}
              className="absolute inset-0 pointer-events-none rounded-[15px] opacity-0 transition-opacity duration-150"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 60%)',
                transformOrigin: '50% 0%',
              }}
            />
          )}
        </div>
      </div>
    )
  }

  return inner
}

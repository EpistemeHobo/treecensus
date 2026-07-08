'use client'

import { useEffect, useRef } from 'react'
import { useI18n } from '@/context/LanguageContext'

interface LightningTextProps {
  line1?: string
  line2?: string
}

// Ported from auth_page_effect_example.html — SVG text with an animated
// skewed light-band that sweeps left → right on a loop, revealing a
// white highlight layer through a vector mask.

export function LightningText({
  line1,
  line2,
}: LightningTextProps) {
  const { t } = useI18n()
  const displayLine1 = line1 || t('login.headline1')
  const displayLine2 = line2 || t('login.headline2')
  const pathRef  = useRef<SVGPathElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)

  // ── Lightning sweep loop ───────────────────────────────────────────────────
  useEffect(() => {
    const band = pathRef.current
    if (!band) return

    const startX    = -350
    const endX      = 1150
    const speed     = 4.5
    const waveWidth = 140
    const skewOff   = 120
    let   currentX  = startX
    let   raf: number

    function loop() {
      currentX += speed
      if (currentX > endX) currentX = startX

      const xTL = currentX
      const xTR = currentX + waveWidth
      const xBR = currentX + waveWidth - skewOff
      const xBL = currentX - skewOff

      band?.setAttribute('d', `M ${xBL},270 L ${xTL},-50 L ${xTR},-50 L ${xBR},270 Z`)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ── Mouse parallax tilt (same as example) ─────────────────────────────────
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    let tx = 0, ty = 0, cx = 0, cy = 0
    const factor = 0.06

    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth  - 0.5) * 22
      ty = (e.clientY / window.innerHeight - 0.5) * -22
    }
    window.addEventListener('mousemove', onMove)

    let raf: number
    function tick() {
      cx += (tx - cx) * factor
      cy += (ty - cy) * factor
      if (layer) layer.style.transform = `perspective(800px) rotateY(${cx}deg) rotateX(${cy}deg)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={layerRef} className="w-full flex flex-col items-center pointer-events-none select-none"
      style={{ willChange: 'transform' }}
    >
      <svg
        viewBox="0 0 900 220"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: '100%',
          maxWidth: 'clamp(340px, 72vw, 860px)',
          height: 'auto',
          overflow: 'visible',
          filter: 'drop-shadow(0px 12px 36px rgba(0,0,0,0.65))',
          marginBottom: '2rem',
        }}
      >
        <defs>
          {/* Base gradient text */}
          <linearGradient id="tc-base-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#f4f1ea" />
            <stop offset="28%"  stopColor="#c8e060" />
            <stop offset="52%"  stopColor="#A8CC3A" />
            <stop offset="78%"  stopColor="#C4956A" />
            <stop offset="100%" stopColor="#d4b898" />
          </linearGradient>

          {/* Energy wave gradient */}
          <linearGradient id="tc-wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#A8CC3A" stopOpacity="0"   />
            <stop offset="25%"  stopColor="#c8e060" stopOpacity="0.4" />
            <stop offset="50%"  stopColor="#ffffff" stopOpacity="1"   />
            <stop offset="75%"  stopColor="#C4956A" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#C4956A" stopOpacity="0"   />
          </linearGradient>

          {/* Sweep mask */}
          <mask id="tc-lightning-mask">
            <path
              ref={pathRef}
              d="M -200,-50 L -100,-50 L 0,270 L -100,270 Z"
              fill="url(#tc-wave-grad)"
            />
          </mask>
        </defs>

        {/* Layer 1 — gradient base text */}
        <g fontFamily="'Fredericka the Great', serif" fontWeight="400" fontSize="76" letterSpacing="1">
          <text x="50%" y="82"  textAnchor="middle" fill="url(#tc-base-grad)">{displayLine1}</text>
          <text x="50%" y="178" textAnchor="middle" fill="url(#tc-base-grad)">{displayLine2}</text>
        </g>

        {/* Layer 2 — white highlight revealed by sweep mask */}
        <g mask="url(#tc-lightning-mask)" fontFamily="'Fredericka the Great', serif" fontWeight="400" fontSize="76" letterSpacing="1">
          <text x="50%" y="82"  textAnchor="middle" fill="#ffffff">{displayLine1}</text>
          <text x="50%" y="178" textAnchor="middle" fill="#ffffff">{displayLine2}</text>
        </g>
      </svg>
    </div>
  )
}

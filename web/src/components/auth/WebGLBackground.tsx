'use client'

import { useEffect, useRef } from 'react'

// Moving net background — adapted from the project's fragment shader pattern.
// Uses UV-space grid lines + anchor dots + wave displacement to create an
// undulating wireframe net. Pointer causes subtle drift. DOM fallback preserved.

const VERT = `
  attribute vec2 a_pos;
  varying vec2 vScreenUV;
  void main() {
    vScreenUV = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`

const FRAG = `
  precision highp float;

  uniform float uBaseAlpha;
  uniform float uTime;
  uniform vec2  uMouse;       // normalised 0-1
  uniform vec2  uResolution;

  varying vec2 vScreenUV;

  // ── Helpers ────────────────────────────────────────────────────────────────
  float hash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }

  void main() {
    float GRID = 20.0;

    // ── 1. Wave-warp the UV before tiling ──────────────────────────────────
    // This makes the grid lines themselves undulate — the "moving net" effect.
    float t  = uTime * 0.38;
    vec2  uv = vScreenUV;

    // Gentle spatial sine waves in both axes (low amplitude so lines stay crisp)
    uv.x += sin(vScreenUV.y * 5.5 + t * 1.1)  * 0.009;
    uv.y += sin(vScreenUV.x * 4.8 + t * 0.95) * 0.009;

    // Pointer drift — same direction as the original parallax
    vec2 drift = (uMouse - 0.5) * 0.030;
    uv += drift;

    // ── 2. Cell UV (0-1 within each cell) — exactly as in the source shader ─
    vec2 cellUV = fract(uv * GRID);
    vec2 cellId = floor(uv * GRID);

    // ── 3. Per-cell wave (simulates vWave from vertex shader) ─────────────
    float h     = hash21(cellId);
    float vWave = sin(cellId.x * 0.75 + cellId.y * 0.62 + uTime * 1.1 + h * 6.28) * 0.5 + 0.5;

    // ── 4. Fragment shader logic — direct port from provided source ─────────
    float thickness = 0.025;
    float gridX  = smoothstep(thickness, 0.0, abs(cellUV.x - 0.5));
    float gridY  = smoothstep(thickness, 0.0, abs(cellUV.y - 0.5));
    float anchor = smoothstep(0.06, 0.0, distance(cellUV, vec2(0.5)));

    float alphaChannel = (max(gridX, gridY) * uBaseAlpha)
                       + (anchor * (0.25 + vWave));

    if (alphaChannel < 0.01) discard;

    // ── 5. Colour — project palette (violet-leaning wireframe) ────────────
    // Base: vec3(0.22, 0.24, 0.35) from source — subtle violet tinge
    // Anchors pulse toward coral on wave peak
    vec3 lineColor   = vec3(0.20, 0.26, 0.14);   // deep forest green
    vec3 anchorColor = mix(vec3(0.66, 0.80, 0.23), vec3(0.77, 0.58, 0.42), vWave); // yellow-green → pastel brown
    float isAnchor   = anchor / max(anchor + max(gridX, gridY), 0.001);
    vec3  col        = mix(lineColor, anchorColor, isAnchor * 0.6);

    // Vignette — fade hard corners
    float vig = 1.0 - smoothstep(0.30, 0.82, length(vScreenUV - 0.5) * 1.3);
    alphaChannel *= vig;

    gl_FragColor = vec4(col, alphaChannel);
  }
`

export function WebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    })
    if (!gl) return // CSS gradient fallback via parent background-color

    // ── Compile ──────────────────────────────────────────────────────────────
    function compileShader(type: number, src: string) {
      const s = gl!.createShader(type)!
      gl!.shaderSource(s, src)
      gl!.compileShader(s)
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
        console.error('[WebGL]', gl!.getShaderInfoLog(s))
      }
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, compileShader(gl.VERTEX_SHADER,   VERT))
    gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    // Full-screen quad
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uBaseAlpha  = gl.getUniformLocation(prog, 'uBaseAlpha')
    const uTime       = gl.getUniformLocation(prog, 'uTime')
    const uMouse      = gl.getUniformLocation(prog, 'uMouse')
    const uResolution = gl.getUniformLocation(prog, 'uResolution')

    // ── Resize ───────────────────────────────────────────────────────────────
    function resize() {
      canvas!.width  = window.innerWidth
      canvas!.height = window.innerHeight
      gl!.viewport(0, 0, canvas!.width, canvas!.height)
    }
    resize()
    window.addEventListener('resize', resize)

    // ── Mouse (smoothly lerped) ──────────────────────────────────────────────
    let mx = 0.5, my = 0.5   // current (lerped)
    let tx = 0.5, ty = 0.5   // target

    window.addEventListener('mousemove', e => {
      tx = e.clientX / window.innerWidth
      ty = 1.0 - e.clientY / window.innerHeight
    })

    // ── Blend ────────────────────────────────────────────────────────────────
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    // ── Render loop ──────────────────────────────────────────────────────────
    let raf: number
    const t0 = performance.now()

    function draw() {
      // Lerp mouse at 5 % per frame for slow drift
      mx += (tx - mx) * 0.05
      my += (ty - my) * 0.05

      const elapsed = (performance.now() - t0) / 1000

      // Breathing alpha: 0.55 → 0.85 over ~4 s period
      const alpha = 0.55 + 0.30 * (0.5 + 0.5 * Math.sin(elapsed * 0.55))

      gl!.clearColor(0, 0, 0, 0)
      gl!.clear(gl!.COLOR_BUFFER_BIT)

      gl!.uniform1f(uBaseAlpha,  alpha)
      gl!.uniform1f(uTime,       elapsed)
      gl!.uniform2f(uMouse,      mx, my)
      gl!.uniform2f(uResolution, canvas!.width, canvas!.height)

      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  )
}

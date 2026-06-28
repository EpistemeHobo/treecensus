'use client'

import { useEffect, useRef } from 'react'

// Same moving-net shader as the auth page, tuned for the portal:
// — lower base alpha so it doesn't compete with data content
// — slightly coarser grid (16 cells) for a cleaner look behind UI
// — slower wave speed for a calmer, less distracting feel

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
  uniform vec2  uMouse;

  varying vec2 vScreenUV;

  float hash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }

  void main() {
    float GRID = 16.0;

    float t  = uTime * 0.22;   // slower than auth
    vec2  uv = vScreenUV;

    uv.x += sin(vScreenUV.y * 5.0 + t * 1.0) * 0.007;
    uv.y += sin(vScreenUV.x * 4.5 + t * 0.9) * 0.007;
    uv   += (uMouse - 0.5) * 0.018;

    vec2 cellUV = fract(uv * GRID);
    vec2 cellId = floor(uv * GRID);

    float h     = hash21(cellId);
    float vWave = sin(cellId.x * 0.75 + cellId.y * 0.62 + uTime * 0.7 + h * 6.28) * 0.5 + 0.5;

    float thickness  = 0.025;
    float gridX  = smoothstep(thickness, 0.0, abs(cellUV.x - 0.5));
    float gridY  = smoothstep(thickness, 0.0, abs(cellUV.y - 0.5));
    float anchor = smoothstep(0.06, 0.0, distance(cellUV, vec2(0.5)));

    float alphaChannel = (max(gridX, gridY) * uBaseAlpha)
                       + (anchor * (0.18 + vWave * 0.18));

    if (alphaChannel < 0.01) discard;

    vec3 lineColor   = vec3(0.22, 0.62, 0.32);   // soft green
    vec3 anchorColor = mix(vec3(0.50, 0.88, 0.45), vec3(0.35, 0.78, 0.55), vWave); // bright green → soft mint
    float isAnchor   = anchor / max(anchor + max(gridX, gridY), 0.001);
    vec3  col        = mix(lineColor, anchorColor, isAnchor * 0.55);

    float vig = 1.0 - smoothstep(0.30, 0.90, length(vScreenUV - 0.5) * 1.2);
    alphaChannel *= vig;

    gl_FragColor = vec4(col, alphaChannel);
  }
`

export function PortalBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    })
    if (!gl) return

    function compileShader(type: number, src: string) {
      const s = gl!.createShader(type)!
      gl!.shaderSource(s, src)
      gl!.compileShader(s)
      return s
    }

    const prog = gl.createProgram()!
    gl.attachShader(prog, compileShader(gl.VERTEX_SHADER,   VERT))
    gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uBaseAlpha = gl.getUniformLocation(prog, 'uBaseAlpha')
    const uTime      = gl.getUniformLocation(prog, 'uTime')
    const uMouse     = gl.getUniformLocation(prog, 'uMouse')

    function resize() {
      canvas!.width  = window.innerWidth
      canvas!.height = window.innerHeight
      gl!.viewport(0, 0, canvas!.width, canvas!.height)
    }
    resize()
    window.addEventListener('resize', resize)

    let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5
    const onMove = (e: MouseEvent) => {
      tx = e.clientX / window.innerWidth
      ty = 1.0 - e.clientY / window.innerHeight
    }
    window.addEventListener('mousemove', onMove)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    let raf: number
    const t0 = performance.now()

    function draw() {
      mx += (tx - mx) * 0.04
      my += (ty - my) * 0.04

      const elapsed = (performance.now() - t0) / 1000
      const alpha   = 0.30 + 0.12 * (0.5 + 0.5 * Math.sin(elapsed * 0.45))

      gl!.clearColor(0, 0, 0, 0)
      gl!.clear(gl!.COLOR_BUFFER_BIT)
      gl!.uniform1f(uBaseAlpha, alpha)
      gl!.uniform1f(uTime,      elapsed)
      gl!.uniform2f(uMouse,     mx, my)
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden
    />
  )
}

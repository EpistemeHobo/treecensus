'use client'

import { useEffect, useRef } from 'react'

// Subtle, quiet falling leaves rendered by a single fragment shader.
// ~28 leaves drift down with a soft sway; small greens/ambers on transparent bg.
// The whole thing runs behind the portal UI so cards float above it.

const VERT = `
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG = `
  precision highp float;

  uniform float uTime;
  uniform vec2  uResolution;
  uniform vec2  uMouse;         // 0..1 in screen space (y = 0 at top)
  uniform float uMouseStrength; // ramps up on mouse movement, decays when idle

  float hash11(float n) { return fract(sin(n * 43758.5453) * 12345.6789); }

  // HSV → RGB helper for the dark-rainbow color drift.
  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  // 5 leaf-shape presets (× 5 sizes = 25 distinct silhouettes).
  // \`pr\` is pre-rotated leaf-local space; \`r\` is a size scalar.
  float leafShape(vec2 pr, float r, int shapeIdx) {
    if (shapeIdx == 0) {
      // Classic tapered — narrower at the tip (top).
      float taper = 1.0 + pr.y * 0.9 / r;
      return length(vec2(pr.x / (r * 0.42 * taper), pr.y / r));
    } else if (shapeIdx == 1) {
      // Inverted teardrop — narrower at the base (bottom).
      float taper = 1.0 - pr.y * 0.9 / r;
      return length(vec2(pr.x / (r * 0.42 * taper), pr.y / r));
    } else if (shapeIdx == 2) {
      // Almond — symmetric taper both ends.
      float taper = 1.0 - abs(pr.y) * 0.7 / r;
      return length(vec2(pr.x / (r * 0.45 * taper), pr.y / r));
    } else if (shapeIdx == 3) {
      // Maple leaf — 5 lobes via a polar cos ridge; slight stem notch at bottom.
      float theta = atan(pr.y, pr.x);
      float rho   = length(pr);
      float lobes = 0.58 + 0.42 * abs(cos(2.5 * theta - 1.5708));   // 5 peaks
      // Small notch at the base so the leaf sits on a stem.
      float stem  = smoothstep(-1.3, -1.7, theta) * 0.18;
      return rho / (r * (lobes - stem));
    } else {
      // Narrow blade (bamboo-like).
      return length(vec2(pr.x / (r * 0.22), pr.y / (r * 1.15)));
    }
  }

  void main() {
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
    vec2 uv = gl_FragCoord.xy / uResolution.y;
    uv.y = (uResolution.y - gl_FragCoord.y) / uResolution.y;

    vec3 accum = vec3(0.0);
    float alpha = 0.0;

    const int N = 42;
    for (int i = 0; i < N; i++) {
      float fi = float(i);

      float lane   = hash11(fi * 7.13);
      float phase  = hash11(fi * 3.19) * 6.2831;
      float swayF  = 0.6   + hash11(fi * 2.51) * 0.9;
      float swayA  = 0.04  + hash11(fi * 5.11) * 0.06;
      float tint   = hash11(fi * 4.11);

      // 5 discrete sizes × 5 shapes = 25 combinations.
      int shapeIdx = int(floor(hash11(fi * 8.31) * 5.0));
      int sizeIdx  = int(floor(hash11(fi * 12.7) * 5.0));
      float sizeN  = 0.009 + float(sizeIdx) * 0.0045;   // 0.009 .. 0.027

      // CONTINUOUS FALL — each leaf is always somewhere on its trajectory.
      // Phase is (fi/N + jitter) so leaves are pre-distributed evenly across
      // the fall cycle: at any moment ≈ N/period leaves are active per unit
      // height, and no "burst" occurs when the animation loops.
      float period = 32.0 + hash11(fi * 13.9) * 60.0;                 // 32..92 s per crossing
      float phaseFall = fract(fi / float(N) + hash11(fi * 17.3) * 0.6);
      float relT = fract(uTime / period + phaseFall);                 // 0..1, always defined

      float y     = mix(-0.08, 1.12, relT);
      float x     = lane * aspect.x + sin(uTime * swayF + phase) * swayA;
      float angle = sin(uTime * (swayF * 0.9) + phase) * 0.9 + hash11(fi * 6.7) * 0.6;

      // Wind toward the mouse: soft radial pull. Larger (foreground) leaves get
      // dragged more, farther (smaller) leaves resist — feels like real wind.
      vec2  leafPos = vec2(x, y);
      vec2  mouseUV = vec2(uMouse.x * aspect.x, uMouse.y);
      vec2  toMouse = mouseUV - leafPos;
      float mDist   = length(toMouse);
      float falloff = smoothstep(0.55, 0.05, mDist);
      float depth   = smoothstep(0.009, 0.027, sizeN);
      vec2  pull    = normalize(toMouse + vec2(0.0001, 0.0)) * falloff * 0.08 * uMouseStrength * (0.4 + depth * 0.6);
      leafPos      += pull;
      // Slight rotation nudge so leaves visibly turn into the "wind".
      angle        += atan(pull.y, pull.x + 0.0001) * falloff * 0.2;

      float c = cos(angle), s = sin(angle);
      vec2  pr = mat2(c, -s, s, c) * (uv - leafPos);
      float d  = leafShape(pr, sizeN, shapeIdx);
      float m  = smoothstep(1.0, 0.78, d);

      // Only fade at the top/bottom edges of the screen — soft entry/exit.
      m *= smoothstep(-0.05, 0.05, y) * smoothstep(1.10, 0.95, y);

      // Dark-rainbow drift: each leaf starts at a random hue and shifts across
      // roughly a third of the wheel as it falls. Saturation/value kept low so
      // the field reads as muted rainbow rather than neon.
      float baseHue  = tint;                                    // 0..1
      float hueDrift = 0.28 + hash11(fi * 30.1) * 0.35;         // 0.28..0.63 wheel span
      float hue      = fract(baseHue + relT * hueDrift);
      vec3  leafCol  = hsv2rgb(vec3(hue, 0.70, 0.78));

      // Additive color, straight alpha — no normalization (that was dimming everything).
      accum += leafCol * m * depth;
      alpha += m * depth * 0.55;
    }

    alpha = clamp(alpha, 0.0, 0.75);
    if (alpha < 0.005) discard;

    vec2 centered = gl_FragCoord.xy / uResolution.xy - 0.5;
    float vig = 1.0 - smoothstep(0.35, 0.95, length(centered) * 1.15);
    alpha *= vig;

    gl_FragColor = vec4(clamp(accum, 0.0, 1.0), alpha);
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

    function compile(type: number, src: string) {
      const s = gl!.createShader(type)!
      gl!.shaderSource(s, src)
      gl!.compileShader(s)
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
        console.error('shader compile:', gl!.getShaderInfoLog(s))
      }
      return s
    }

    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER,   VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uTime     = gl.getUniformLocation(prog, 'uTime')
    const uRes      = gl.getUniformLocation(prog, 'uResolution')
    const uMouse    = gl.getUniformLocation(prog, 'uMouse')
    const uStrength = gl.getUniformLocation(prog, 'uMouseStrength')

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas!.width  = Math.floor(window.innerWidth  * dpr)
      canvas!.height = Math.floor(window.innerHeight * dpr)
      canvas!.style.width  = window.innerWidth + 'px'
      canvas!.style.height = window.innerHeight + 'px'
      gl!.viewport(0, 0, canvas!.width, canvas!.height)
    }
    resize()
    window.addEventListener('resize', resize)

    // Mouse tracking: `tx/ty` is the target, `mx/my` is a smoothed pursuer.
    // `strength` ramps up while the mouse is moving and decays back to a low
    // ambient level when the pointer stops — so wind feels like a gust.
    let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5
    let lastMove = -1000
    const onMove = (e: MouseEvent) => {
      tx = e.clientX / window.innerWidth
      ty = e.clientY / window.innerHeight
      lastMove = performance.now()
    }
    window.addEventListener('mousemove', onMove)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    let raf = 0
    const t0 = performance.now()
    function draw() {
      const now = performance.now()
      const t   = (now - t0) / 1000
      // Ease mouse position — faster than smoothstep but smooth enough.
      mx += (tx - mx) * 0.06
      my += (ty - my) * 0.06
      // Strength: 1.0 while moving, decays over ~1.4s of stillness to 0.25 baseline.
      const sinceMove = (now - lastMove) / 1000
      const strength  = 0.25 + 0.75 * Math.exp(-sinceMove / 0.55)

      gl!.clearColor(0, 0, 0, 0)
      gl!.clear(gl!.COLOR_BUFFER_BIT)
      gl!.uniform1f(uTime, t)
      gl!.uniform2f(uRes,  canvas!.width, canvas!.height)
      gl!.uniform2f(uMouse, mx, my)
      gl!.uniform1f(uStrength, strength)
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

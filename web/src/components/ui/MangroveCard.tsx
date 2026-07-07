import { ReactNode } from 'react'

function seededRand(seed: number, salt: number) {
  const x = Math.sin(seed * 9301 + salt * 49297) * 233280
  return x - Math.floor(x)
}

// Static mangrove-root texture — same palette as the sidebar but scattered across
// a wide viewBox (no animation). The `seed` prop shifts/rotates/flips the whole
// cluster so each card instance looks distinct.
const ROOT_PATHS: [string, string, number, number][] = [
  // [ d, stroke, opacity, width ]
  ['M20 500 C30 460 12 420 28 380 C42 344 22 306 34 268 C46 232 24 194 36 156 C48 118 30 82 42 44', '#CAF546', 0.22, 2.2],
  ['M60 500 C70 466 52 430 66 396 C82 358 62 322 74 288 C86 254 68 222 78 190', '#EBB37F', 0.18, 1.4],
  ['M40 480 C24 448 8 412 18 378 C28 344 12 312 22 280 C32 250 16 218 26 188', '#CAF546', 0.16, 1.1],
  ['M90 500 C104 460 86 424 100 388 C118 348 96 312 108 276', '#EBB37F', 0.14, 0.9],
  ['M0 340 C40 320 74 296 110 278 C142 262 168 240 200 224', '#CAF546', 0.16, 1.0],
  ['M0 260 C36 240 68 218 100 200 C132 184 156 158 190 138', '#EBB37F', 0.14, 0.8],
  ['M20 400 C58 372 88 344 118 314', '#CAF546', 0.13, 0.9],
  ['M380 500 C376 460 372 420 380 380 C388 344 380 306 388 268 C396 232 388 194 396 156 C404 118 396 82 404 44', '#CAF546', 0.24, 2.4],
  ['M420 500 C424 456 414 412 424 372 C434 336 420 300 430 264 C440 230 424 194 434 160', '#EBB37F', 0.18, 1.6],
  ['M340 500 C336 458 328 418 336 380 C344 344 332 308 340 272 C348 238 332 204 340 170', '#CAF546', 0.16, 1.2],
  ['M360 500 C354 460 342 422 350 386 C358 352 344 316 352 282 C360 250 346 218 354 188', '#EBB37F', 0.14, 0.9],
  ['M400 260 C420 232 448 214 476 200 C504 186 528 166 548 144', '#CAF546', 0.14, 0.9],
  ['M388 340 C412 316 442 300 470 288 C500 274 526 254 550 232', '#EBB37F', 0.13, 0.8],
  ['M780 500 C770 460 788 420 772 380 C758 344 778 306 766 268 C754 232 776 194 764 156 C752 118 770 82 758 44', '#CAF546', 0.22, 2.2],
  ['M740 500 C730 466 748 430 734 396 C718 358 738 322 726 288 C714 254 732 222 722 190', '#EBB37F', 0.18, 1.4],
  ['M760 480 C776 448 792 412 782 378 C772 344 788 312 778 280 C768 250 784 218 774 188', '#CAF546', 0.16, 1.1],
  ['M710 500 C696 460 714 424 700 388 C682 348 704 312 692 276', '#EBB37F', 0.14, 0.9],
  ['M800 340 C760 320 726 296 690 278 C658 262 632 240 600 224', '#CAF546', 0.16, 1.0],
  ['M800 260 C764 240 732 218 700 200 C668 184 644 158 610 138', '#EBB37F', 0.14, 0.8],
  ['M780 400 C742 372 712 344 682 314', '#CAF546', 0.13, 0.9],
  ['M200 40 C220 68 244 90 268 108 C296 128 320 150 336 176', '#EBB37F', 0.13, 0.9],
  ['M560 30 C542 60 520 84 494 106 C468 128 448 152 432 178', '#CAF546', 0.14, 1.0],
  ['M120 20 C144 46 172 66 200 84', '#EBB37F', 0.12, 0.8],
  ['M660 20 C636 46 606 66 578 84', '#CAF546', 0.12, 0.8],
  ['M120 500 C160 470 200 440 244 420 C284 402 320 380 360 358', '#EBB37F', 0.14, 0.9],
  ['M680 500 C640 470 600 440 556 420 C516 402 480 380 440 358', '#CAF546', 0.14, 0.9],
  ['M240 500 C280 460 322 432 366 408', '#CAF546', 0.12, 0.8],
  ['M560 500 C520 460 478 432 434 408', '#EBB37F', 0.12, 0.8],
]

export function MangroveRoots({ seed = 1, subtle = false }: { seed?: number; subtle?: boolean }) {
  // On tall/wide cards the default weights read as busy; `subtle` thins strokes
  // and drops opacity so the pattern stays a texture rather than a subject.
  const wScale = subtle ? 0.55 : 1
  const oScale = subtle ? 0.45 : 1
  const flipX  = seededRand(seed, 1) > 0.5 ? -1 : 1
  const flipY  = seededRand(seed, 2) > 0.7 ? -1 : 1
  const rotate = (seededRand(seed, 3) - 0.5) * 24
  const dx     = (seededRand(seed, 4) - 0.5) * 260
  const dy     = (seededRand(seed, 5) - 0.5) * 160
  const scale  = 0.9 + seededRand(seed, 6) * 0.45
  const transform = `translate(${400 + dx} ${250 + dy}) rotate(${rotate}) scale(${flipX * scale} ${flipY * scale}) translate(-400 -250)`

  return (
    <svg
      aria-hidden
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none select-none absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" transform={transform}>
        {ROOT_PATHS.map(([d, stroke, op, w], i) => (
          <path
            key={i}
            d={d}
            stroke={stroke}
            strokeOpacity={op * oScale}
            strokeWidth={w * wScale}
          />
        ))}
      </g>
    </svg>
  )
}

interface MangroveCardProps {
  children: ReactNode
  className?: string
  // green = mangrove-roots dark green with root overlay
  // sand  = flat surface (dark #0A0A10 / light #FCFDF9), no roots — matches the sidebar
  variant?: 'green' | 'sand'
  seed?: number
  // Thin the roots + drop opacity — for large cards where the default pattern is too busy.
  subtle?: boolean
  // 'dark' (default) keeps the app's dark surfaces; 'light' switches the sand
  // variant to the light-mode palette (day mode on the data table).
  theme?: 'dark' | 'light'
}

export function MangroveCard({ children, className = '', variant = 'green', seed = 1, subtle = false, theme = 'dark' }: MangroveCardProps) {
  const isSand = variant === 'sand'
  const isDark = theme !== 'light'
  const bg = isSand
    ? (isDark ? '#0A0A10' : '#FCFDF9')
    : 'radial-gradient(120% 100% at 0% 0%, #12362a 0%, #0d2c22 40%, #08201a 100%)'
  const border = isSand
    ? (isDark ? 'border-[rgba(255,255,255,0.08)]' : 'border-[rgba(0,0,0,0.09)]')
    : 'border-[#1f4b36]/70'
  return (
    <div
      className={`${isDark ? 'dark ' : ''}relative overflow-hidden rounded-lg border ${border} p-6 ${className}`}
      style={{ background: bg }}
    >
      {!isSand && <MangroveRoots seed={seed} subtle={subtle} />}
      <div className="relative" style={{ zIndex: 1 }}>{children}</div>
    </div>
  )
}

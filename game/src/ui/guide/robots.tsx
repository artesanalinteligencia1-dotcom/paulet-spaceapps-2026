// The robot guide, Kuntur: an SVG drawn in code (no image files) with five expressions. Chosen by the owner on
// 2026-11-14 over two other looks (a sphere with an orbit halo, a CubeSat); redrawn the same day as a geometric Andean condor. Our own design: inspired by the idea of
// a helpful mission robot, not by any existing character.
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { useRef, type CSSProperties, type ReactNode } from 'react'

export type GuideMood = 'idle' | 'happy' | 'thinking' | 'worried' | 'explaining'
export const GUIDE_MOODS: GuideMood[] = ['idle', 'happy', 'thinking', 'worried', 'explaining']

export interface RobotProps {
  mood: GuideMood
  /** The mouth moves while a line is being said. */
  talking?: boolean
  size?: number
  /** Still picture (reduced motion, small icons). */
  still?: boolean
  title?: string
}

/** Rotation about a hinge point, in the SVG's own units, eased when the mood changes. */
const hinge = (x: number, y: number, deg: number): CSSProperties => ({
  transformOrigin: `${x}px ${y}px`,
  transform: `rotate(${deg}deg)`,
  transition: 'transform 0.45s cubic-bezier(.3,1.4,.5,1)',
})

/** Two eyes and a mouth, shared by the three robots so the expressions read the same whichever look is chosen. */
function Face({ mood, talking, x1, x2, y, r, color, still, mouthY }: { mood: GuideMood; talking?: boolean; x1: number; x2: number; y: number; r: number; color: string; still?: boolean; mouthY: number }) {
  const worried = mood === 'worried'
  const eyeColor = worried ? '#fbbf24' : color
  const blink = still ? undefined : 'guide-blink'
  const eye = (x: number, i: number) => {
    if (mood === 'happy') return <path key={i} d={`M${x - r} ${y + r * 0.4} Q${x} ${y - r * 1.3} ${x + r} ${y + r * 0.4}`} fill="none" stroke={eyeColor} strokeWidth={r * 0.55} strokeLinecap="round" />
    if (worried) return <circle key={i} cx={x} cy={y} r={r * 1.15} fill={eyeColor} className={blink} />
    if (mood === 'thinking') {
      const h = i === 0 ? r * 1.2 : r * 2
      return <rect key={i} x={x - r + r * 0.5} y={y - h / 2 - r * 0.5} width={r * 2} height={h} rx={r} fill={eyeColor} className={blink} />
    }
    return <rect key={i} x={x - r} y={y - r * 1.2} width={r * 2} height={r * 2.4} rx={r} fill={eyeColor} className={blink} />
  }
  const w = (x2 - x1) * 0.42
  const cx = (x1 + x2) / 2
  let mouth: ReactNode
  if (talking) mouth = <rect x={cx - w / 2} y={mouthY - 1.5} width={w} height={3} rx={1.5} fill={eyeColor} className={still ? undefined : 'guide-talk'} />
  else if (mood === 'happy') mouth = <path d={`M${cx - w / 2} ${mouthY - 2} Q${cx} ${mouthY + 5} ${cx + w / 2} ${mouthY - 2}`} fill="none" stroke={eyeColor} strokeWidth={2.4} strokeLinecap="round" />
  else if (worried) mouth = <ellipse cx={cx} cy={mouthY} rx={w * 0.16} ry={3.2} fill="none" stroke={eyeColor} strokeWidth={2} />
  else if (mood === 'thinking') mouth = <rect x={cx} y={mouthY - 1} width={w * 0.45} height={2.4} rx={1.2} fill={eyeColor} opacity={0.8} />
  else mouth = <rect x={cx - w * 0.3} y={mouthY - 1} width={w * 0.6} height={2.4} rx={1.2} fill={eyeColor} opacity={0.8} />
  return (
    <g>
      {[x1, x2].map(eye)}
      {mouth}
    </g>
  )
}

/** Three dots over the head while thinking; an exclamation mark when worried. */
function Thought({ mood, x, y, color, still }: { mood: GuideMood; x: number; y: number; color: string; still?: boolean }) {
  if (mood === 'thinking')
    return (
      <g fill={color}>
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={x + i * 9} cy={y - i * 4} r={2.6 + i * 0.6} className={still ? undefined : 'guide-dot'} style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </g>
    )
  if (mood === 'worried')
    return (
      <g fill="#fbbf24">
        <rect x={x + 6} y={y - 18} width={5} height={14} rx={2.5} />
        <circle cx={x + 8.5} cy={y + 2} r={3} />
      </g>
    )
  return null
}

function Svg({ size, title, still, mood, children }: { size: number; title?: string; still?: boolean; mood: GuideMood; children: ReactNode }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={title} className="overflow-visible">
      {title && <title>{title}</title>}
      <g className={still ? undefined : mood === 'worried' ? 'guide-shake' : 'guide-bob'}>{children}</g>
    </svg>
  )
}

/** Kuntur, a geometric Andean condor (chosen by the owner on 2026-11-14): flat stepped shapes after Andean textile
 * and stone patterns — stepped wing feathers, the white collar as a zigzag, a stepped crest — around a small screen
 * face that keeps the five expressions. GSAP glides the wings while idle and flaps them when the mood changes. */
export function Kuntur({ mood, talking, size = 200, still, title }: RobotProps) {
  const left = useRef<SVGGElement>(null)
  const right = useRef<SVGGElement>(null)
  const head = useRef<SVGGElement>(null)
  const wing = { idle: 0, happy: -18, thinking: 14, worried: -26, explaining: -6 }[mood]
  useGSAP(() => {
    if (still || !left.current || !right.current) return
    const glide = gsap.timeline({ repeat: -1, yoyo: true, defaults: { duration: 1.7, ease: 'sine.inOut' } })
    glide.to(left.current, { rotation: 5, svgOrigin: '80 104' }, 0).to(right.current, { rotation: -5, svgOrigin: '120 104' }, 0)
    return () => glide.kill()
  }, [still])
  useGSAP(() => {
    if (still || !left.current || !right.current) return
    gsap.fromTo(left.current, { rotation: -28 }, { rotation: 0, svgOrigin: '80 104', duration: 0.6, ease: 'back.out(2.4)' })
    gsap.fromTo(right.current, { rotation: 28 }, { rotation: 0, svgOrigin: '120 104', duration: 0.6, ease: 'back.out(2.4)' })
  }, [mood, still])
  useGSAP(() => {
    if (still || !head.current) return
    if (!talking) return void gsap.to(head.current, { rotation: 0, svgOrigin: '100 92', duration: 0.3 })
    const nod = gsap.to(head.current, { rotation: 4, svgOrigin: '100 92', duration: 0.32, repeat: -1, yoyo: true, ease: 'sine.inOut' })
    return () => nod.kill()
  }, [talking, still])
  // a wing: dark upper edge, stepped trailing edge (the Andean step), a white band of secondary feathers
  const wingShape = (side: 1 | -1) => {
    const x = (d: number) => 100 + side * d
    const outline = [[20, 96], [56, 84], [92, 88], [90, 96], [80, 96], [80, 103], [68, 103], [68, 110], [54, 110], [54, 117], [40, 117], [40, 122], [20, 122]]
    const band = [[24, 104], [64, 100], [64, 106], [52, 106], [52, 112], [38, 112], [38, 116], [24, 116]]
    const pts = (p: number[][]) => p.map(([dx, y]) => `${x(dx)},${y}`).join(' ')
    return (
      <g style={hinge(x(20), 104, side * wing)}>
        <g ref={side === -1 ? left : right}>
          <polygon points={pts(outline)} fill="#111827" stroke="#7dd3fc" strokeWidth={1.4} strokeLinejoin="round" />
          <polygon points={pts(band)} fill="#e5e7eb" />
          <polygon points={pts([[56, 84], [92, 88], [88, 91], [58, 89]])} fill="#fb923c" opacity={0.85} />
        </g>
      </g>
    )
  }
  return (
    <Svg size={size} title={title} still={still} mood={mood}>
      <polygon points="100,172 92,160 108,160" fill="#fb923c" opacity={0.75} className={still ? undefined : 'guide-glow'} />
      {wingShape(-1)}
      {wingShape(1)}
      {/* body and stepped tail */}
      <polygon points="82,104 118,104 114,136 106,146 94,146 86,136" fill="#111827" stroke="#7dd3fc" strokeWidth={1.4} strokeLinejoin="round" />
      <polygon points="90,146 110,146 110,152 104,152 104,158 96,158 96,152 90,152" fill="#1f2937" stroke="#7dd3fc" strokeWidth={1.2} />
      <path d="M94 116 L100 110 L106 116 L100 122 Z M94 128 L100 122 L106 128 L100 134 Z" fill="#fb923c" opacity={0.9} />
      {/* the white collar, as a zigzag */}
      <polygon points="76,104 82,96 88,102 94,96 100,102 106,96 112,102 118,96 124,104 118,110 82,110" fill="#f8fafc" />
      <g ref={head}>
        {/* stepped crest */}
        <polygon points="88,48 88,42 94,42 94,36 106,36 106,42 112,42 112,48" fill="#ea580c" />
        <polygon points="80,58 88,48 112,48 120,58 120,82 112,92 88,92 80,82" fill="#0f172a" stroke="#7dd3fc" strokeWidth={2} strokeLinejoin="round" />
        <rect x={86} y={55} width={28} height={27} rx={5} fill="#020617" />
        <Face mood={mood} talking={talking} x1={94} x2={106} y={65} r={3.4} color="#7dd3fc" still={still} mouthY={75} />
        {/* hooked beak */}
        <polygon points="95,88 105,88 103,96 100,99 97,96" fill="#fde68a" />
      </g>
      <Thought mood={mood} x={128} y={40} color="#7dd3fc" still={still} />
    </Svg>
  )
}

/** Kuntur's colour, for its speech bubble. */
export const GUIDE_ACCENT = '#7dd3fc'

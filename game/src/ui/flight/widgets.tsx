// Building blocks of the flight deck. Live values are written straight into the DOM by the deck's frame loop
// (elements marked data-k / data-arc / data-bar / data-chart / data-tape / data-ladder), so nothing re-renders at 60 fps.
import type { CSSProperties, ReactNode } from 'react'

export function Panel({ title, right, children, className = '', bodyClass = 'p-3' }: { title: string; right?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={`deck-panel flex flex-col overflow-hidden ${className}`}>
      <header className="deck-head shrink-0">
        <h2>{title}</h2>
        {right}
      </header>
      <div className={`min-h-0 flex-1 ${bodyClass}`}>{children}</div>
    </section>
  )
}

/** A live value. */
export const V = ({ k, className = '', style }: { k: string; className?: string; style?: CSSProperties }) => <span data-k={k} className={`tabular-nums ${className}`} style={style} />

/** A 270° gauge filled by the loop through [data-arc] (fraction 0..1 in telemetry `${k}Frac`). */
export function Arc({ k, label }: { k: string; label: string }) {
  return (
    <div className="relative grid h-[84px] w-[84px] place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#2c3036" strokeWidth="10" strokeDasharray="188.5 251.3" transform="rotate(135 50 50)" />
        <circle data-arc={k} cx="50" cy="50" r="40" fill="none" stroke="#d9b46a" strokeWidth="10" strokeDasharray="188.5 251.3" strokeDashoffset="0" transform="rotate(135 50 50)" />
      </svg>
      <div className="text-center leading-none">
        <div className="text-[22px] text-[#e8e0cc]">Δv</div>
        <div className="mt-1 text-[11px] tracking-wider text-[#8a8f98]">{label}</div>
      </div>
    </div>
  )
}

export function Chart({ id, color, label, unit }: { id: string; color: string; label: string; unit: string }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col">
      <div className="flex shrink-0 justify-between gap-2 text-[12px] uppercase tracking-wider text-[#8a8f98]">
        <span className="truncate">{label}</span>
        <span className="shrink-0">
          <V k={id + 'Live'} style={{ color }} /> {unit}
        </span>
      </div>
      <canvas data-chart={id} data-color={color} width={320} height={84} className="mt-1 block max-h-[42px] min-h-0 w-full flex-1" />
    </div>
  )
}

/** Draw a filled sparkline of the last samples. */
export function drawChart(cv: HTMLCanvasElement, data: number[], max = 160) {
  const g = cv.getContext('2d')
  if (!g) return
  const { width: w, height: h } = cv
  g.clearRect(0, 0, w, h)
  g.strokeStyle = '#2c3036'
  g.lineWidth = 1
  for (let i = 1; i < 4; i++) {
    g.beginPath()
    g.moveTo(0, (h * i) / 4)
    g.lineTo(w, (h * i) / 4)
    g.stroke()
  }
  if (data.length < 2) return
  const top = Math.max(1e-6, ...data)
  const color = cv.dataset.color!
  g.beginPath()
  data.forEach((v, i) => {
    const x = (i / (max - 1)) * w
    const y = h - 4 - (v / top) * (h - 10)
    if (i) g.lineTo(x, y)
    else g.moveTo(x, y)
  })
  g.strokeStyle = color
  g.lineWidth = 3
  g.stroke()
  g.lineTo(((data.length - 1) / (max - 1)) * w, h)
  g.lineTo(0, h)
  g.closePath()
  g.fillStyle = color + '33'
  g.fill()
}

/** A heat bar (cyan → amber → magenta), filled through [data-bar] with telemetry `${k}Frac`. */
export function HeatBar({ k, label }: { k: string; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-[12px] uppercase tracking-wider text-[#8a8f98]">
        <span>{label}</span>
        <V k={k + 'Pct'} className="text-[#e8e0cc]" />
      </div>
      <div className="relative mt-1 h-3.5 overflow-hidden border border-[#3a3f47] bg-[#1b1e23]">
        <div data-bar={k} className="deck-heat absolute inset-y-0 left-0" style={{ width: '0%' }} />
      </div>
    </div>
  )
}

export function Tape({ k, label, unit }: { k: string; label: string; unit: string }) {
  return (
    <div className="w-[78px] text-center">
      <div className="text-[12px] uppercase tracking-wider text-[#8a8f98]">{label}</div>
      <div className="relative mx-auto mt-1 h-[96px] w-[64px] overflow-hidden border-x border-[#3a3f47]">
        <div data-tape={k} className="absolute inset-x-0" style={{ top: 0, height: 2000, backgroundImage: 'repeating-linear-gradient(transparent 0 19px, #8a8f98 19px 20px)' }} />
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border border-[#d9b46a] bg-[#0d0f12] px-1 py-0.5 text-[15px] text-[#e8e0cc]">
          <V k={k} />
        </div>
      </div>
      <div className="mt-0.5 text-[11px] text-[#8a8f98]">{unit}</div>
    </div>
  )
}

/** Pitch ladder between a speed tape and an altitude tape; the loop moves [data-ladder]. */
export function Attitude() {
  const rungs: number[] = []
  for (let d = -20; d <= 90; d += 10) rungs.push(d)
  return (
    <div className="deck-panel flex items-center gap-3 px-4 py-2">
      <Tape k="tapeV" label="Speed" unit="m/s" />
      <div className="relative h-[136px] w-[250px] overflow-hidden">
        <svg viewBox="-125 -68 250 136" className="absolute inset-0 h-full w-full">
          <g data-ladder>
            {rungs.map((d) => (
              <g key={d} transform={`translate(0 ${-d * 4})`}>
                <line x1={d === 0 ? -118 : -48} x2={-14} y1={0} y2={0} stroke={d === 0 ? '#f08a3c' : '#e8e0cc'} strokeWidth={d === 0 ? 2 : 1.2} strokeDasharray={d < 0 ? '5 4' : undefined} />
                <line x1={14} x2={d === 0 ? 118 : 48} y1={0} y2={0} stroke={d === 0 ? '#f08a3c' : '#e8e0cc'} strokeWidth={d === 0 ? 2 : 1.2} strokeDasharray={d < 0 ? '5 4' : undefined} />
                {d !== 0 && (
                  <text x={54} y={4} fontSize={10} fill="#8a8f98" className="deck-font">
                    {d}
                  </text>
                )}
              </g>
            ))}
          </g>
          <path d="M-40 0 H-12 L0 10 L12 0 H40" stroke="#d9b46a" strokeWidth={2.5} fill="none" />
          <circle r={3} fill="#d9b46a" />
        </svg>
        <div className="absolute inset-x-0 top-0 bg-[#0d0f12] pb-0.5 text-center text-[12px] tracking-widest text-[#8a8f98]">
          PITCH <V k="pitchDeg" className="text-[#e8e0cc]" />°
        </div>
      </div>
      <Tape k="tapeA" label="Altitude" unit="km" />
    </div>
  )
}

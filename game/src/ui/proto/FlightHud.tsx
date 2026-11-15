// Prototype of the new flight HUD (owner's references, 2026-11-14): `?proto=flight`. Graphite mission-control frame with
// the PAULET wordmark, orbital telemetry and propulsion panels, live charts, heat bars and an alert log at the sides,
// an attitude display at the bottom, and live cameras the player switches between (ground, chase, onboard, map) plus a
// second camera in a small window. Not part of the game flow until the owner approves it.
import '@fontsource/barlow-condensed/400.css'
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { getScenario } from '../../engine/catalog'
import { PauletLogo } from '../brand/PauletLogo'
import { makeTimeline } from '../launch/LaunchSequence'
import type { CamView, CameraViews } from '../launch/three/LaunchScene3D'
import { spacecraftVisual } from '../spacecraft/visual'
import { telemetryAt, EVENTS, type Telemetry } from './flightTelemetry'

const LaunchScene3D = lazy(() => import('../launch/three/LaunchScene3D'))

type MainView = CamView | 'map'
const VIEWS: { id: MainView; label: string; key: string }[] = [
  { id: 'ground', label: 'Ground', key: '1' },
  { id: 'chase', label: 'Chase', key: '2' },
  { id: 'onboard', label: 'Onboard', key: '3' },
  { id: 'map', label: 'Map', key: '4' },
]
const SPEEDS = [0.25, 0.5, 1]

const C = { panel: 'rgba(20,23,28,0.86)', line: '#3a3f47', head: '#23272e', cream: '#e8e0cc', gold: '#d9b46a', orange: '#f08a3c', pink: '#ff3d7f', cyan: '#36d1ff', dim: '#8a8f98' }

function Panel({ title, children, className = '', right }: { title: string; children: React.ReactNode; className?: string; right?: React.ReactNode }) {
  return (
    <section className={`pointer-events-auto border ${className}`} style={{ background: C.panel, borderColor: C.line, backdropFilter: 'blur(6px)' }}>
      <header className="flex items-center justify-between border-b px-3 py-1.5" style={{ background: C.head, borderColor: C.line }}>
        <h2 className="text-[15px] font-medium uppercase tracking-[0.08em]" style={{ color: C.cream }}>{title}</h2>
        {right}
      </header>
      <div className="p-3">{children}</div>
    </section>
  )
}

/** A live number: the HUD loop writes into elements with `data-k`, so React never re-renders at 60 fps. */
const V = ({ k, className = '', style }: { k: keyof Telemetry | string; className?: string; style?: React.CSSProperties }) => <span data-k={k} className={`tabular-nums ${className}`} style={style} />

function Arc({ k, label }: { k: string; label: string }) {
  // a 270° gauge; the loop sets the stroke-dashoffset of [data-arc]
  return (
    <div className="relative grid h-[92px] w-[92px] place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#2c3036" strokeWidth="10" strokeDasharray="188.5 251.3" transform="rotate(135 50 50)" />
        <circle data-arc={k} cx="50" cy="50" r="40" fill="none" stroke={C.gold} strokeWidth="10" strokeDasharray="188.5 251.3" strokeDashoffset="0" transform="rotate(135 50 50)" />
      </svg>
      <div className="text-center leading-none">
        <div className="text-2xl" style={{ color: C.cream }}>Δv</div>
        <div className="mt-1 text-[11px]" style={{ color: C.dim }}>{label}</div>
      </div>
    </div>
  )
}

function Chart({ id, color, label, unit }: { id: string; color: string; label: string; unit: string }) {
  return (
    <div>
      <div className="flex justify-between text-[12px] uppercase tracking-wider" style={{ color: C.dim }}>
        <span>{label}</span>
        <span><V k={id} style={{ color }} /> {unit}</span>
      </div>
      <canvas data-chart={id} data-color={color} width={300} height={70} className="mt-1 h-[58px] w-full" />
    </div>
  )
}

function HeatBar({ k, label }: { k: string; label: string }) {
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[12px] uppercase tracking-wider" style={{ color: C.dim }}>
        <span>{label}</span>
        <V k={k + 'Pct'} style={{ color: C.cream }} />
      </div>
      <div className="relative mt-1 h-4 overflow-hidden" style={{ background: '#1b1e23', border: `1px solid ${C.line}` }}>
        <div data-bar={k} className="absolute inset-y-0 left-0" style={{ width: '0%', background: 'linear-gradient(90deg,#36d1ff,#f0b26a 55%,#f06a3c 80%,#ff3d7f)' }} />
      </div>
    </div>
  )
}

/** Wireframe globe with Arequipa, the ascent ground track and the target orbit (map view and the telemetry inset). */
function Globe({ size, spin = true }: { size: number; spin?: boolean }) {
  const r = size * 0.42
  const c = size / 2
  const lines = useMemo(() => {
    const out: string[] = []
    const tilt = (23 * Math.PI) / 180
    const proj = (lat: number, lon: number) => {
      const x = Math.cos(lat) * Math.sin(lon)
      const y = Math.sin(lat)
      const z = Math.cos(lat) * Math.cos(lon)
      const y2 = y * Math.cos(tilt) - z * Math.sin(tilt)
      const z2 = y * Math.sin(tilt) + z * Math.cos(tilt)
      return { x: c + r * x, y: c - r * y2, front: z2 > 0 }
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      let d = ''
      for (let lon = -90; lon <= 90; lon += 6) {
        const p = proj((lat * Math.PI) / 180, (lon * Math.PI) / 180)
        d += `${d ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      }
      out.push(d)
    }
    for (let lon = -90; lon <= 90; lon += 20) {
      let d = ''
      for (let lat = -90; lat <= 90; lat += 6) {
        const p = proj((lat * Math.PI) / 180, (lon * Math.PI) / 180)
        d += `${d ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      }
      out.push(d)
    }
    const site = proj((-16.4 * Math.PI) / 180, (-20 * Math.PI) / 180)
    let track = ''
    for (let i = 0; i <= 30; i++) {
      const p = proj(((-16.4 + i * 0.25) * Math.PI) / 180, ((-20 + i * 2.2) * Math.PI) / 180)
      track += `${track ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    }
    return { grid: out, site, track }
  }, [c, r])
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="overflow-visible">
      <defs>
        <radialGradient id={`g${size}`} cx="40%" cy="35%">
          <stop offset="0" stopColor="#2a2f37" />
          <stop offset="1" stopColor="#0d0f12" />
        </radialGradient>
      </defs>
      <circle cx={c} cy={c} r={r} fill={`url(#g${size})`} stroke="#4a505a" strokeWidth={1} />
      <g stroke="#3d434c" strokeWidth={0.8} fill="none">{lines.grid.map((d, i) => <path key={i} d={d} />)}</g>
      <g className={spin ? 'hud-orbit-spin' : undefined} style={{ transformOrigin: `${c}px ${c}px` }}>
        <ellipse cx={c} cy={c} rx={r * 1.55} ry={r * 0.5} fill="none" stroke={C.gold} strokeWidth={1.2} transform={`rotate(-14 ${c} ${c})`} />
        <ellipse cx={c} cy={c} rx={r * 1.28} ry={r * 0.36} fill="none" stroke={C.orange} strokeWidth={1.2} transform={`rotate(8 ${c} ${c})`} opacity={0.9} />
      </g>
      <path d={lines.track} stroke={C.orange} strokeWidth={2} fill="none" strokeDasharray="4 3" />
      <path data-track d={lines.track} stroke={C.gold} strokeWidth={2.4} fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} />
      <circle cx={lines.site.x} cy={lines.site.y} r={3.5} fill={C.orange} />
      <text x={lines.site.x - 6} y={lines.site.y + 16} fontSize={11} fill={C.cream} textAnchor="end">AREQUIPA</text>
    </svg>
  )
}

function Attitude() {
  // pitch ladder in the middle, speed and altitude tapes at the sides; the loop moves [data-ladder] and the tapes
  const rungs = []
  for (let d = -30; d <= 90; d += 10) rungs.push(d)
  return (
    <div className="pointer-events-auto relative flex items-center gap-4 border px-4 py-2" style={{ background: C.panel, borderColor: C.line }}>
      <Tape k="tapeV" label="Speed" unit="m/s" />
      <div className="relative h-[150px] w-[260px] overflow-hidden">
        <svg viewBox="-130 -75 260 150" className="absolute inset-0 h-full w-full">
          <g data-ladder>
            {rungs.map((d) => (
              <g key={d} transform={`translate(0 ${-d * 4})`}>
                <line x1={d === 0 ? -120 : -50} x2={d === 0 ? -14 : -16} y1={0} y2={0} stroke={d === 0 ? C.orange : C.cream} strokeWidth={d === 0 ? 2 : 1.2} strokeDasharray={d < 0 ? '5 4' : undefined} />
                <line x1={d === 0 ? 14 : 16} x2={d === 0 ? 120 : 50} y1={0} y2={0} stroke={d === 0 ? C.orange : C.cream} strokeWidth={d === 0 ? 2 : 1.2} strokeDasharray={d < 0 ? '5 4' : undefined} />
                {d !== 0 && <text x={56} y={4} fontSize={10} fill={C.dim}>{d}</text>}
              </g>
            ))}
          </g>
          <path d="M-40 0 H-12 L0 10 L12 0 H40" stroke={C.gold} strokeWidth={2.5} fill="none" />
          <circle r={3} fill={C.gold} />
          <path d="M-70 -62 A90 90 0 0 1 70 -62" stroke={C.dim} fill="none" />
        </svg>
        <div className="absolute inset-x-0 top-0 text-center text-[12px] tracking-widest" style={{ color: C.dim }}>
          PITCH <V k="pitchDeg" style={{ color: C.cream }} />°
        </div>
      </div>
      <Tape k="tapeA" label="Altitude" unit="km" />
    </div>
  )
}

function Tape({ k, label, unit }: { k: string; label: string; unit: string }) {
  return (
    <div className="w-[86px] text-center">
      <div className="text-[12px] uppercase tracking-wider" style={{ color: C.dim }}>{label}</div>
      <div className="relative mx-auto mt-1 h-[100px] w-[56px] overflow-hidden border-x" style={{ borderColor: C.line }}>
        <div data-tape={k} className="absolute inset-x-0" style={{ top: 0, height: 2000, backgroundImage: `repeating-linear-gradient(transparent 0 19px, ${C.dim} 19px 20px)` }} />
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border px-1 py-0.5 text-[15px]" style={{ background: '#0d0f12', borderColor: C.gold, color: C.cream }}>
          <V k={k} />
        </div>
      </div>
      <div className="mt-0.5 text-[11px]" style={{ color: C.dim }}>{unit}</div>
    </div>
  )
}

export default function FlightHud() {
  const scenario = getScenario('earth_watch')
  const design = scenario.baseDesign
  const visual = useMemo(() => spacecraftVisual(design), [design])
  const T = useMemo(() => makeTimeline(10), [])
  const params = new URLSearchParams(window.location.search)
  const tRef = useRef(Number(params.get('t') ?? 7))
  const [view, setView] = useState<MainView>((params.get('view') as MainView) ?? 'chase')
  const [pip, setPip] = useState<CamView | null>('ground')
  const [speed, setSpeed] = useState(0.5)
  const [paused, setPaused] = useState(params.has('pause'))
  const root = useRef<HTMLDivElement>(null)
  const views = useMemo<CameraViews>(() => ({ main: { current: 'chase' }, pip: { current: 'ground' }, pipRect: { right: 24, bottom: 24, widthFrac: 0.22, aspect: 0.58 } }), [])
  views.main.current = view === 'map' ? 'chase' : view
  views.pip!.current = view === 'map' ? 'chase' : pip

  // keyboard: 1–4 cameras, space pause
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const v = VIEWS.find((x) => x.key === e.key)
      if (v) setView(v.id)
      if (e.key === ' ') setPaused((p) => !p)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  // the HUD loop: advances the clock and writes every live value straight into the DOM
  useEffect(() => {
    const el = root.current!
    let raf = 0
    let prev = performance.now()
    const hist: Record<string, number[]> = { alt: [], vel: [], q: [], g: [] }
    let sample = 0
    let lastEvent = -1
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      if (!pausedRef.current) tRef.current += dt * speedRef.current
      if (tRef.current > T.end + 3) {
        tRef.current = 7
        for (const k in hist) hist[k] = []
        lastEvent = -1
        el.querySelector('[data-log]')!.innerHTML = ''
      }
      const tm = telemetryAt(tRef.current, T)
      el.querySelectorAll<HTMLElement>('[data-k]').forEach((n) => {
        const v = (tm as unknown as Record<string, string | number>)[n.dataset.k!]
        if (v !== undefined) n.textContent = String(v)
      })
      el.querySelectorAll<SVGCircleElement>('[data-arc]').forEach((n) => n.setAttribute('stroke-dashoffset', String(188.5 * (1 - (tm as unknown as Record<string, number>)[n.dataset.arc! + 'Frac']))))
      el.querySelectorAll<HTMLElement>('[data-bar]').forEach((n) => (n.style.width = `${(tm as unknown as Record<string, number>)[n.dataset.bar! + 'Frac'] * 100}%`))
      const ladder = el.querySelector('[data-ladder]')
      ladder?.setAttribute('transform', `translate(0 ${(tm.pitchDegNum - 45) * 4}) rotate(${Math.sin(tRef.current * 0.7) * 1.5})`)
      el.querySelectorAll<HTMLElement>('[data-tape]').forEach((n) => (n.style.transform = `translateY(${-((n.dataset.tape === 'tapeV' ? tm.velNum / 20 : tm.altNum * 4) % 20) - 900}px)`))
      el.querySelectorAll<SVGPathElement>('[data-track]').forEach((n) => n.setAttribute('stroke-dashoffset', String(1 - tm.progress)))
      // charts: 10 samples a second of real flight
      sample += dt
      if (sample > 0.05 && !pausedRef.current) {
        sample = 0
        hist.alt.push(tm.altNum)
        hist.vel.push(tm.velNum)
        hist.q.push(tm.qNum)
        hist.g.push(tm.gNum)
        for (const k in hist) if (hist[k].length > 160) hist[k].shift()
        el.querySelectorAll<HTMLCanvasElement>('[data-chart]').forEach((cv) => draw(cv, hist[cv.dataset.chart!] ?? []))
      }
      // alert log
      const idx = EVENTS.findLastIndex((e) => tRef.current >= e.at(T))
      if (idx > lastEvent) {
        const log = el.querySelector('[data-log]')!
        for (let i = lastEvent + 1; i <= idx; i++) {
          const e = EVENTS[i]
          const li = document.createElement('li')
          li.className = 'hud-log-in flex justify-between gap-3 border-l-2 pl-2'
          li.style.borderColor = e.tone === 'warn' ? C.pink : e.tone === 'good' ? C.gold : C.cyan
          li.innerHTML = `<span style="color:${e.tone === 'warn' ? C.pink : C.cream}">${e.label}</span><span style="color:${C.dim}">${telemetryAt(e.at(T), T).met}</span>`
          log.prepend(li)
        }
        lastEvent = idx
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [T])
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const speedRef = useRef(speed)
  speedRef.current = speed

  return (
    <div ref={root} className="fixed inset-0 overflow-hidden bg-[#0b0d10] text-[14px]" style={{ fontFamily: "'Barlow Condensed', 'Inter Variable', sans-serif", color: C.cream }}>
      <style>{`
        @keyframes hud-spin { to { transform: rotate(360deg) } }
        .hud-orbit-spin { animation: hud-spin 60s linear infinite }
        @keyframes hud-log-in { from { opacity: 0; transform: translateX(14px) } to { opacity: 1; transform: none } }
        .hud-log-in { animation: hud-log-in .4s ease-out }
        .hud-btn { border: 1px solid ${C.line}; background: #1b1e23; color: ${C.cream}; padding: 6px 12px; text-transform: uppercase; letter-spacing: .08em }
        .hud-btn[aria-pressed='true'] { background: ${C.gold}; color: #14171c; border-color: ${C.gold} }
        .hud-btn:hover { border-color: ${C.gold} }
      `}</style>
      {/* live 3D: full screen behind the HUD */}
      <div className="absolute inset-0">
        <Suspense fallback={null}>
          <LaunchScene3D launcherId={design.launcherId} light="dawn" T={T} tRef={tRef} failAt={null} visual={visual} views={views} />
        </Suspense>
      </div>
      {view === 'map' && (
        <div className="absolute inset-0 grid place-items-center bg-[#0b0d10]/90">
          <Globe size={560} />
        </div>
      )}
      {/* frame */}
      <div className="pointer-events-none absolute inset-0">
        <header className="pointer-events-auto flex h-[72px] items-center gap-6 border-b px-8" style={{ background: 'rgba(14,16,19,0.92)', borderColor: C.line }}>
          <PauletLogo height={34} />
          <div className="h-10 w-px" style={{ background: C.line }} />
          <div>
            <div className="text-2xl leading-none">MET: <V k="met" style={{ color: C.cream }} /></div>
            <div className="text-[15px] uppercase tracking-wider" style={{ color: C.gold }}><V k="phase" /></div>
          </div>
          <div className="mx-auto flex gap-1.5">
            <button type="button" className="hud-btn" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? '▶ Resume' : '❚❚ Pause'}</button>
            {SPEEDS.map((s) => (
              <button key={s} type="button" className="hud-btn" aria-pressed={speed === s} onClick={() => setSpeed(s)}>{s}×</button>
            ))}
            <button type="button" className="hud-btn" onClick={() => (tRef.current = 7)}>↺ Restart</button>
          </div>
          <div className="text-right text-[15px] uppercase leading-tight tracking-wider" style={{ color: C.dim }}>
            <div>Network <span style={{ color: C.cream }}>Ground station · Lurín</span></div>
            <div>Uplink <V k="link" style={{ color: C.gold }} /></div>
          </div>
        </header>

        {/* left column */}
        <div className="absolute left-6 top-[92px] flex max-h-[calc(100vh-92px-200px)] w-[400px] flex-col gap-3 overflow-hidden">
          <Panel title="Orbital telemetry">
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[17px] uppercase">
                <dt style={{ color: C.dim }}>Altitude</dt><dd className="text-right"><V k="alt" /></dd>
                <dt style={{ color: C.dim }}>Apoapsis</dt><dd className="text-right"><V k="apo" /></dd>
                <dt style={{ color: C.dim }}>Periapsis</dt><dd className="text-right"><V k="peri" /></dd>
                <dt style={{ color: C.dim }}>Inclination</dt><dd className="text-right"><V k="inc" /></dd>
                <dt style={{ color: C.dim }}>Velocity</dt><dd className="text-right"><V k="vel" /></dd>
                <dt style={{ color: C.dim }}>Downrange</dt><dd className="text-right"><V k="down" /></dd>
              </dl>
              <div className="grid place-items-center"><Globe size={120} /></div>
            </div>
          </Panel>
          <Panel title="Ascent loads" right={<span className="text-[12px]" style={{ color: C.pink }}><V k="loadFlag" /></span>}>
            <HeatBar k="q" label="Dynamic pressure" />
            <HeatBar k="heat" label="Fairing heating" />
            <HeatBar k="gload" label="Acceleration" />
          </Panel>
          <Panel title="Live charts">
            <div className="grid grid-cols-2 gap-3">
              <Chart id="alt" color={C.gold} label="Altitude" unit="km" />
              <Chart id="vel" color={C.cyan} label="Velocity" unit="m/s" />
              <Chart id="q" color={C.pink} label="Max-Q" unit="kPa" />
              <Chart id="g" color={C.orange} label="G-load" unit="g" />
            </div>
          </Panel>
        </div>

        {/* right column */}
        <div className="absolute right-6 top-[92px] flex max-h-[calc(100vh-92px-22vw*0.58-48px)] w-[340px] flex-col gap-3 overflow-hidden">
          <Panel title="Propulsion & staging">
            <div className="flex items-center justify-around">
              <div className="text-center"><Arc k="dv1" label="STAGE 01" /><div className="text-[13px]"><V k="dv1" /> m/s</div></div>
              <div className="text-center"><Arc k="dv2" label="STAGE 02" /><div className="text-[13px]"><V k="dv2" /> m/s</div></div>
            </div>
            <div className="mt-3 border-t pt-2" style={{ borderColor: C.line }}>
              <div className="text-[13px] uppercase tracking-wider" style={{ color: C.dim }}>Total Δv left</div>
              <div className="text-4xl"><V k="dvTotal" /> m/s</div>
            </div>
            <HeatBar k="lox" label="Liquid oxygen" />
            <HeatBar k="fuel" label="Kerosene" />
          </Panel>
          <Panel title="Flight events">
            <ul data-log className="max-h-[220px] space-y-1.5 overflow-hidden text-[15px] uppercase tracking-wide" />
          </Panel>
        </div>

        {/* bottom left: cameras */}
        <div className="pointer-events-auto absolute bottom-6 left-6 w-[400px] border p-3" style={{ background: C.panel, borderColor: C.line }}>
          <div className="mb-2 flex items-center justify-between text-[13px] uppercase tracking-[0.12em]" style={{ color: C.dim }}>
            <span>Main camera</span><span>keys 1–4</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {VIEWS.map((v) => (
              <button key={v.id} type="button" className="hud-btn" aria-pressed={view === v.id} onClick={() => setView(v.id)}>{v.key} · {v.label}</button>
            ))}
          </div>
          <div className="mb-2 mt-3 text-[13px] uppercase tracking-[0.12em]" style={{ color: C.dim }}>Second camera</div>
          <div className="grid grid-cols-4 gap-1.5">
            {(['ground', 'chase', 'onboard', null] as const).map((v) => (
              <button key={String(v)} type="button" className="hud-btn" aria-pressed={pip === v} onClick={() => setPip(v)}>{v ?? 'Off'}</button>
            ))}
          </div>
        </div>

        {/* bottom center: attitude */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2"><Attitude /></div>

        {/* bottom right: the second camera's frame (the 3D scene draws into this box) */}
        {(pip || view === 'map') && (
          <div className="absolute bottom-6 right-6" style={{ width: '22vw', height: 'calc(22vw * 0.58)' }}>
            <div className="absolute inset-0 border-2" style={{ borderColor: C.gold }} />
            <span className="absolute left-2 top-1 text-[12px] uppercase tracking-widest" style={{ color: C.gold }}>● Live · {view === 'map' ? 'chase' : pip}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function draw(cv: HTMLCanvasElement, data: number[]) {
  const g = cv.getContext('2d')!
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
  const max = Math.max(1e-6, ...data)
  const color = cv.dataset.color!
  g.beginPath()
  data.forEach((v, i) => {
    const x = (i / 159) * w
    const y = h - 4 - (v / max) * (h - 10)
    if (i) g.lineTo(x, y)
    else g.moveTo(x, y)
  })
  g.strokeStyle = color
  g.lineWidth = 2
  g.stroke()
  g.lineTo(((data.length - 1) / 159) * w, h)
  g.lineTo(0, h)
  g.closePath()
  g.fillStyle = color + '33'
  g.fill()
}

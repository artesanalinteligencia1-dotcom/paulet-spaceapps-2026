// The flight deck around the live launch (owner's references, 2026-11-14): the PAULET wordmark, mission elapsed time
// and phase on top; orbital telemetry, ascent loads and live charts on the left; propulsion, the flight events and a
// second live camera on the right; attitude tapes at the bottom; live cameras (ground, chase, onboard) and a map of the
// whole route over NASA imagery. A fixed grid on the 1440 × 810 stage: panels never overlap by construction.
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useGame } from '../../store/game'
import { useReducedMotion } from '../../store/settings'
import { SoundToggle } from '../SoundToggle'
import { PauletLogo } from '../brand/PauletLogo'
import type { Timeline } from '../launch/LaunchSequence'
import type { CamView, CameraViews } from '../launch/three/LaunchScene3D'
import { EarthGlobe, type GlobeLive } from './EarthGlobe'
import { flightEvents, fmtNum, telemetryAt, type FlightTarget } from './telemetry'
import { Arc, Attitude, Chart, HeatBar, Panel, V, drawChart } from './widgets'

export type DeckView = CamView | 'map'

const CAMS: { id: DeckView; label: string; key: string }[] = [
  { id: 'ground', label: 'Ground', key: '1' },
  { id: 'chase', label: 'Chase', key: '2' },
  { id: 'onboard', label: 'Onboard', key: '3' },
  { id: 'map', label: 'Map', key: '4' },
]
const SPEEDS = [1, 2, 4]
const CHART_SAMPLES = 160

export interface FlightDeckProps {
  T: Timeline
  tRef: { current: number }
  running: boolean
  use3D: boolean
  views: CameraViews
  target: FlightTarget
  light: 'dawn' | 'day' | 'night'
  launcherName: string
  orbitName: string
  failAt: number | null
  failText: string | null
  boosterLanded: boolean | null
  caption: string
  farewell: string | null
  /** countdown digit, or null */
  countdown: number | null
  ignition: boolean
  speed: number
  canWarp: boolean
  onSpeed: (s: number) => void
  onSkip?: () => void
  onBack?: () => void
  /** shown in the bottom slot before launch (readiness card) */
  prelaunch?: ReactNode
  /** shown in the bottom slot when the flight is over */
  outcome?: ReactNode
}

export function FlightDeck(p: FlightDeckProps) {
  const { T, tRef, target } = p
  const reduce = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const fx = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<DeckView>('chase')
  const [pip, setPip] = useState<CamView | null>('ground')
  const pipRef = useRef(pip)
  pipRef.current = pip
  const viewRef = useRef(view)
  viewRef.current = view
  const live = useRef<GlobeLive>({ down: 0, progress: 0 })
  const [eventIdx, setEventIdx] = useState(-1)
  const [alarm, setAlarm] = useState(false)
  const alarmRef = useRef(false)
  const events = useMemo(() => flightEvents(T, target, p.failAt, p.failText, p.boosterLanded), [T, target, p.failAt, p.failText, p.boosterLanded])
  const cams = p.use3D ? CAMS : CAMS.filter((c) => c.id === 'map' || c.id === 'chase')

  // the 3D scene reads the chosen cameras from `views`
  p.views.main.current = view === 'map' || !p.use3D ? 'chase' : view
  // on the map (the far view) the small window keeps the rocket itself in sight
  if (p.views.pip) p.views.pip.current = !p.use3D ? null : view === 'map' ? 'chase' : pip

  // keys 1–4 switch the main camera
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const c = cams.find((x) => x.key === e.key)
      if (c) setView(c.id)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [cams])

  // a camera switch reads like a broadcast cut: a short burst of interference, then the new feed with its name
  const shownView = useRef(view)
  useGSAP(
    () => {
      // only a real change of camera (not the first mount, nor React's double mount in development)
      if (shownView.current === view) return
      shownView.current = view
      if (reduce || !fx.current) return
      const tl = gsap.timeline()
      tl.fromTo('[data-fx-noise]', { opacity: 0 }, { opacity: 0.9, duration: 0.07, ease: 'none' })
        .to('[data-fx-noise]', { opacity: 0, duration: 0.38, ease: 'power2.out' }, '+=0.06')
        .fromTo('[data-fx-noise]', { backgroundPosition: '0px 0px' }, { backgroundPosition: '37px 91px', duration: 0.5, ease: 'steps(8)' }, 0)
        .fromTo('[data-fx-label]', { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: 0.25, ease: 'power3.out' }, 0.1)
        .to('[data-fx-label]', { opacity: 0, duration: 0.4 }, '+=1.1')
      if (view === 'map') tl.fromTo('[data-map]', { scale: 1.6, opacity: 0, filter: 'blur(8px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out' }, 0)
    },
    { scope: root, dependencies: [view] },
  )

  // countdown digits land like a broadcast graphic
  useGSAP(
    () => {
      if (reduce || p.countdown === null) return
      gsap.fromTo('[data-count]', { scale: 1.35, opacity: 0, filter: 'blur(6px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.35, ease: 'power3.out' })
    },
    { scope: root, dependencies: [p.countdown, p.ignition] },
  )

  // the frame loop: telemetry into the DOM, charts, events, the globe marker
  useEffect(() => {
    const el = root.current!
    const hist: Record<string, number[]> = { alt: [], vel: [], q: [], g: [] }
    let lastSample = -1
    let lastIdx = -2
    let raf = 0
    const loop = () => {
      const t = tRef.current
      const tm = telemetryAt(t, T, target, p.failAt)
      live.current = { down: tm.downNum, progress: tm.progress }
      const landingT = t - T.meco - 0.4
      const landing = target.landing && p.boosterLanded !== null && !tm.lost && landingT >= 0 && landingT < 6.1
      const pipName = pipRef.current
      const rec: Record<string, string> = {
        ...(tm as unknown as Record<string, string>),
        altLive: tm.tapeA,
        velLive: tm.tapeV,
        qLive: fmtNum(tm.qNum, 1),
        gLive: fmtNum(tm.gNum, 1),
        pipLabel: landing ? 'Booster recovery' : viewRef.current === 'map' ? 'chase' : (pipName ?? ''),
        pipStatus: landing ? (landingT < 3.2 ? (landingT > 1.4 ? 'Landing burn' : 'Descending') : p.boosterLanded ? 'Landed on the drone ship' : 'Booster lost') : '',
      }
      el.querySelectorAll<HTMLElement>('[data-k]').forEach((n) => {
        const v = rec[n.dataset.k!]
        if (v !== undefined && n.textContent !== String(v)) n.textContent = String(v)
      })
      const num = tm as unknown as Record<string, number>
      el.querySelectorAll<SVGCircleElement>('[data-arc]').forEach((n) => n.setAttribute('stroke-dashoffset', String(188.5 * (1 - num[n.dataset.arc! + 'Frac']))))
      el.querySelectorAll<HTMLElement>('[data-bar]').forEach((n) => (n.style.width = `${Math.max(0, Math.min(1, num[n.dataset.bar! + 'Frac'])) * 100}%`))
      el.querySelector('[data-ladder]')?.setAttribute('transform', `translate(0 ${(tm.pitchDegNum - 45) * 4})`)
      el.querySelectorAll<HTMLElement>('[data-tape]').forEach((n) => (n.style.transform = `translateY(${-((n.dataset.tape === 'tapeV' ? tm.velNum / 20 : tm.altNum * 4) % 20) - 900}px)`))
      // charts: ten samples per second of launch clock
      if (t < lastSample - 0.01) for (const k in hist) hist[k] = []
      if (t - lastSample >= 0.1 && t > T.ignition) {
        lastSample = t
        hist.alt.push(tm.altNum)
        hist.vel.push(tm.velNum)
        hist.q.push(tm.qNum)
        hist.g.push(tm.gNum)
        for (const k in hist) if (hist[k].length > CHART_SAMPLES) hist[k].shift()
        el.querySelectorAll<HTMLCanvasElement>('[data-chart]').forEach((cv) => drawChart(cv, hist[cv.dataset.chart!] ?? [], CHART_SAMPLES))
      }
      let idx = -1
      for (let i = 0; i < events.length; i++) if (t >= events[i].at) idx = i
      if (idx !== lastIdx) {
        lastIdx = idx
        setEventIdx(idx)
      }
      if (tm.lost !== alarmRef.current) {
        alarmRef.current = tm.lost
        setAlarm(tm.lost)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [T, target, events, p.failAt, p.boosterLanded])

  const shown = events.slice(0, eventIdx + 1).reverse()
  const done = !!p.outcome
  const bottom = !p.running && p.prelaunch ? p.prelaunch : done ? p.outcome : <Attitude />

  return (
    <div ref={root} className="deck deck-font pointer-events-none absolute inset-0 z-10 text-[#e8e0cc]" data-alarm={alarm || undefined}>
      {/* map view: the far camera; the live 3D dims behind the globe */}
      <div className={`absolute inset-0 bg-[#090b0e] transition-opacity duration-500 ${view === 'map' ? 'opacity-90' : 'opacity-0'}`} />
      {/* camera-switch interference and the new feed's name */}
      <div ref={fx} className="absolute inset-0">
        <div data-fx-noise className="deck-noise absolute inset-0 opacity-0" />
      </div>

      <div className="relative grid h-full" style={{ gridTemplateRows: '64px minmax(0, 1fr)' }}>
        <header className="deck-bar pointer-events-auto flex items-center gap-5 px-6">
          <PauletLogo height={26} />
          <div className="h-9 w-px bg-[#3a3f47]" />
          <div className="min-w-[190px]">
            <div className="text-[22px] leading-none">
              MET <V k="met" />
            </div>
            <div className={`text-[13px] uppercase tracking-[0.14em] ${alarm ? 'text-[#ff3d7f]' : 'text-[#d9b46a]'}`}>
              <V k="phase" />
            </div>
          </div>
          {alarm && <span className="deck-warn px-2 py-0.5 text-[15px] font-semibold tracking-widest">WARN</span>}
          <div className="min-w-0 text-[13px] uppercase leading-tight tracking-[0.1em] text-[#8a8f98]">
            <div className="truncate text-[#e8e0cc]">{p.launcherName}</div>
            <div className="truncate">→ {p.orbitName}</div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {p.onBack && (
              <button type="button" data-sound="back" className="deck-btn" onClick={p.onBack}>
                ← Design
              </button>
            )}
            {p.running && !done && (
              <>
                {SPEEDS.map((s) => (
                  <button key={s} type="button" className="deck-btn" aria-pressed={p.speed === s} disabled={!p.canWarp && s !== p.speed} onClick={() => p.onSpeed(s)}>
                    {s}×
                  </button>
                ))}
                {p.onSkip && (
                  <button type="button" className="deck-btn" onClick={p.onSkip}>
                    Skip ▸▸
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <SoundToggle />
            <button type="button" className="deck-btn" onClick={() => useGame.getState().openSettings(true)} aria-label="Settings">
              ⚙
            </button>
          </div>
          <div className="w-[200px] text-right text-[13px] uppercase leading-tight tracking-[0.1em] text-[#8a8f98]">
            <div>
              Station <span className="text-[#e8e0cc]">Arequipa</span>
            </div>
            <div>
              Uplink <V k="link" className={alarm ? 'text-[#ff3d7f]' : 'text-[#d9b46a]'} />
            </div>
          </div>
        </header>

        <div className="grid min-h-0 gap-4 p-4" style={{ gridTemplateColumns: '360px minmax(0, 1fr) 340px' }}>
          {/* left */}
          <aside className="flex min-h-0 flex-col gap-3">
            <Panel title="Orbital telemetry" bodyClass="flex items-center gap-2 px-3 py-2">
              <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[16px] uppercase">
                <dt className="text-[#8a8f98]">Altitude</dt>
                <dd className="text-right"><V k="alt" /></dd>
                <dt className="text-[#8a8f98]">Apoapsis</dt>
                <dd className="text-right"><V k="apo" /></dd>
                <dt className="text-[#8a8f98]">Periapsis</dt>
                <dd className="text-right"><V k="peri" /></dd>
                <dt className="text-[#8a8f98]">Inclination</dt>
                <dd className="text-right"><V k="inc" /></dd>
                <dt className="text-[#8a8f98]">Velocity</dt>
                <dd className="text-right"><V k="vel" /></dd>
                <dt className="text-[#8a8f98]">Downrange</dt>
                <dd className="text-right"><V k="down" /></dd>
              </dl>
              <EarthGlobe size={84} target={target} light={p.light} live={live} labels={false} />
            </Panel>
            <Panel title="Ascent loads" right={<V k="loadFlag" className="text-[13px] font-semibold tracking-widest text-[#ff3d7f]" />} bodyClass="space-y-2 px-3 py-2">
              <HeatBar k="q" label="Dynamic pressure" />
              <HeatBar k="heat" label="Fairing heating" />
              <HeatBar k="gload" label="Acceleration" />
            </Panel>
            <Panel title="Live charts" className="min-h-0 flex-1" bodyClass="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-2">
              <Chart id="alt" color="#d9b46a" label="Altitude" unit="km" />
              <Chart id="vel" color="#36d1ff" label="Velocity" unit="m/s" />
              <Chart id="q" color="#ff3d7f" label="Max-Q" unit="kPa" />
              <Chart id="g" color="#f08a3c" label="G-load" unit="g" />
            </Panel>
            <section className="deck-panel pointer-events-auto shrink-0 px-3 py-2.5">
              <div className="mb-1.5 flex justify-between text-[12px] uppercase tracking-[0.14em] text-[#8a8f98]">
                <span>Main camera</span>
                <span>keys 1–{cams.length}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {cams.map((c) => (
                  <button key={c.id} type="button" className="deck-btn" aria-pressed={view === c.id} onClick={() => setView(c.id)}>
                    {c.label}
                  </button>
                ))}
              </div>
              {p.use3D && (
                <>
                  <div className="mb-1.5 mt-2 text-[12px] uppercase tracking-[0.14em] text-[#8a8f98]">Second camera</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['ground', 'chase', 'onboard', null] as const).map((c) => (
                      <button key={String(c)} type="button" className="deck-btn" aria-pressed={pip === c} onClick={() => setPip(c)}>
                        {c ?? 'Off'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>
          </aside>

          {/* centre: comms on top, the live view (or the map) in the middle, attitude / readiness / outcome below */}
          <section className="flex min-h-0 flex-col gap-3">
            <div className="deck-panel shrink-0 px-4 py-2.5" aria-live="polite">
              <div className="flex items-baseline gap-3">
                <span className="text-[12px] uppercase tracking-[0.2em] text-[#d9b46a]">Capcom</span>
                <span className={`text-[17px] leading-snug ${alarm ? 'text-[#ff8fb1]' : ''}`}>{p.caption}</span>
              </div>
              {p.farewell && <div className="mt-1 text-[16px] italic text-[#f1d9a6]">“{p.farewell}” — Mission control</div>}
            </div>
            <div className="relative grid min-h-0 flex-1 place-items-center">
              {view === 'map' && (
                <div data-map className="pointer-events-none">
                  <EarthGlobe size={300} target={target} light={p.light} live={live} />
                  <p className="mt-1 text-center text-[12px] uppercase tracking-wider text-[#8a8f98]">NASA Blue Marble · Black Marble · orbit height exaggerated</p>
                </div>
              )}
              {p.countdown !== null && (
                <div data-count key={p.countdown} className="deck-count absolute text-[150px] leading-none">
                  {p.countdown}
                </div>
              )}
              {p.ignition && (
                <div data-count key="ign" className="deck-count absolute text-[78px] leading-none tracking-[0.12em] text-[#f0b26a]">
                  IGNITION
                </div>
              )}
              <div data-fx-label className="absolute left-0 top-0 opacity-0">
                <span className="deck-chip">● CAM {String(CAMS.findIndex((c) => c.id === view) + 1).padStart(2, '0')} · {view.toUpperCase()}</span>
              </div>
            </div>
            <div className="pointer-events-auto flex shrink-0 justify-center">{bottom}</div>
          </section>

          {/* right */}
          <aside className="flex min-h-0 flex-col gap-3">
            <Panel title="Propulsion & staging" bodyClass="px-3 py-2">
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <Arc k="dv1" label="STAGE 1" />
                  <div className="text-[13px]">
                    <V k="dv1" /> m/s
                  </div>
                </div>
                <div className="text-center">
                  <Arc k="dv2" label="STAGE 2" />
                  <div className="text-[13px]">
                    <V k="dv2" /> m/s
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between border-t border-[#3a3f47] pt-1.5">
                <span className="text-[12px] uppercase tracking-wider text-[#8a8f98]">Total Δv left</span>
                <span className="text-[28px] leading-none">
                  <V k="dvTotal" /> <span className="text-[15px] text-[#8a8f98]">m/s</span>
                </span>
              </div>
              <div className="mt-2 space-y-2">
                <HeatBar k="lox" label="Liquid oxygen" />
                <HeatBar k="fuel" label="Fuel" />
              </div>
            </Panel>
            <Panel title="Flight events" className="min-h-0 flex-1" bodyClass="overflow-hidden px-3 py-2">
              <ul className="space-y-1 text-[15px] uppercase tracking-wide">
                {shown.map((e) => (
                  <li key={e.id} className={`deck-log flex justify-between gap-3 border-l-2 pl-2 deck-tone-${e.tone}`}>
                    <span className="truncate">{e.label}</span>
                    <span className="shrink-0 text-[#8a8f98]">{telemetryAt(e.at, T, target).met}</span>
                  </li>
                ))}
                {shown.length === 0 && <li className="text-[#8a8f98]">Awaiting ignition</li>}
              </ul>
            </Panel>
            {p.use3D && (
              <div
                ref={(n) => {
                  if (p.views.pipEl) p.views.pipEl.current = n
                }}
                className={`deck-pip relative shrink-0 ${pip || view === 'map' ? '' : 'invisible'}`}
                style={{ height: 191 }}
              >
                <span className="deck-chip absolute left-2 top-2">
                  ● LIVE · <V k="pipLabel" />
                </span>
                <span className="absolute bottom-2 left-2 text-[13px] uppercase tracking-wider text-[#f1d9a6]">
                  <V k="pipStatus" />
                </span>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

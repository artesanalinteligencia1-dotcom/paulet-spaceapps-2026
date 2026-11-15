// Mission operations, made visible: what the spacecraft sees (NASA Blue Marble / Black Marble under its ground track),
// what each instrument is doing, where the data goes, and short answers from Kuntur. Visual only: nothing here changes
// the seeded simulation, so replays and challenge links stay identical.
import { useEffect, useRef, useState } from 'react'
import dayUrl from '../../assets/textures/earth-day-4k.jpg'
import nightUrl from '../../assets/textures/earth-night-4k.jpg'
import { getInstrument, getOrbit, getScenario } from '../../engine/catalog'
import { eclipseFraction, orbitalPeriodMin } from '../../engine/orbit'
import type { MissionState } from '../../engine/simulate'
import { fmt } from '../../i18n/en'
import { useT, useTx, type StringKey } from '../../i18n'

const DISC_COLOR = { astrobiologist: '#4ade80', astrophysicist: '#a78bfa' } as const

function loadImage(src: string) {
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  return img
}

/** A pushbroom view down at the Earth: the ground track always points up, the instrument swath glows in the middle. */
export function SatelliteCam({ mission, playing }: { mission: MissionState; playing: boolean }) {
  const t = useT()
  const cv = useRef<HTMLCanvasElement>(null)
  const [night, setNight] = useState(false)
  const [where, setWhere] = useState({ lat: 0, lon: 0 })
  const orbit = getOrbit(mission.design.orbitId)
  const scenario = getScenario(mission.scenarioId)
  const storms = scenario.id.includes('storm')
  const alt = mission.design.altitudeKm
  const periodMin = orbitalPeriodMin(orbit, alt)
  const ecl = eclipseFraction(orbit, alt)
  const incl = (orbit.id.startsWith('sso') ? 97.9 : orbit.id === 'geo' ? 0.1 : orbit.id === 'meo' ? 55 : 51.6) * (Math.PI / 180)
  const fine = mission.design.instruments.some((i) => getInstrument(i.id).pointing === 'fine')
  const active = mission.phase === 'operations'
  const live = useRef({ playing, active })
  live.current = { playing, active }

  useEffect(() => {
    const canvas = cv.current
    if (!canvas) return
    const g = canvas.getContext('2d')
    if (!g) return
    const day = loadImage(dayUrl)
    const nite = loadImage(nightUrl)
    let raf = 0
    let simT = 0
    let last = performance.now()
    let lastUi = 0
    const W = canvas.width
    const H = canvas.height
    const geo = orbit.id.startsWith('geo')
    // one orbit every 16 s on screen; the Earth turns under it at the real ratio of periods
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (live.current.playing) simT += dt
      const phase = geo ? 0 : (simT / 16) % 1
      const u = phase * Math.PI * 2
      const lat = Math.asin(Math.sin(incl) * Math.sin(u))
      const lon = (Math.atan2(Math.cos(incl) * Math.sin(u), Math.cos(u)) - (geo ? 0 : ((simT / 16) * periodMin * 2 * Math.PI) / 1436) - 1.25) % (Math.PI * 2)
      // heading of the ground track (to keep it pointing up)
      const u2 = u + 0.01
      const lat2 = Math.asin(Math.sin(incl) * Math.sin(u2))
      const lon2 = Math.atan2(Math.cos(incl) * Math.sin(u2), Math.cos(u2)) - (geo ? 0 : (((simT + 0.0255) / 16) * periodMin * 2 * Math.PI) / 1436) - 1.25
      const heading = geo ? 0 : Math.atan2((lon2 - lon) * Math.cos(lat), lat2 - lat)
      const dark = ecl > 0 && phase > 0.5 - ecl / 2 && phase < 0.5 + ecl / 2
      const img = dark ? nite : day
      g.fillStyle = '#05070a'
      g.fillRect(0, 0, W, H)
      if (img.complete && img.naturalWidth) {
        // a window of the equirectangular map around the sub-satellite point; wider when higher
        const spanDeg = Math.min(150, 34 + alt / 22)
        const sw = (img.naturalWidth * spanDeg) / 360
        const sh = sw * (H / W)
        const cx = (((lon * 180) / Math.PI + 180) / 360) * img.naturalWidth
        const cy = ((90 - (lat * 180) / Math.PI) / 180) * img.naturalHeight
        g.save()
        g.translate(W / 2, H / 2)
        g.rotate(-heading)
        const scale = (W * 1.5) / sw
        for (const off of [-img.naturalWidth, 0, img.naturalWidth]) {
          g.drawImage(img, cx - sw * 0.75 + off, cy - sh * 0.75, sw * 1.5, sh * 1.5, (-sw * 0.75 * scale), (-sh * 0.75 * scale), sw * 1.5 * scale, sh * 1.5 * scale)
        }
        g.restore()
      }
      if (storms && !dark) {
        // spiral cloud bands of a tropical storm drifting through the view (illustrative)
        const sx = W * (0.5 + 0.35 * Math.sin(simT * 0.21)), sy = H * (((simT * 0.06) % 1.4) - 0.2)
        g.save()
        g.translate(sx, sy)
        g.rotate(simT * 0.4)
        for (let k = 0; k < 4; k++) {
          g.beginPath()
          for (let a = 0; a < 9; a += 0.15) {
            const r = 4 + a * 6
            g.lineTo(Math.cos(a + (k * Math.PI) / 2) * r, Math.sin(a + (k * Math.PI) / 2) * r)
          }
          g.strokeStyle = 'rgba(255,255,255,0.55)'
          g.lineWidth = 7
          g.stroke()
        }
        g.restore()
      }
      // the instrument swath and the crosshair
      const swath = W * (fine ? 0.16 : 0.34)
      if (live.current.active && !dark) {
        g.fillStyle = 'rgba(240,138,58,0.16)'
        g.fillRect(W / 2 - swath / 2, 0, swath, H)
        g.strokeStyle = 'rgba(240,138,58,0.85)'
        g.setLineDash([6, 5])
        g.lineWidth = 1.5
        g.strokeRect(W / 2 - swath / 2, -2, swath, H + 4)
        g.setLineDash([])
        // a scan line sweeping down the swath, like a pushbroom imager
        const yScan = ((simT * 90) % (H + 20)) - 10
        g.fillStyle = 'rgba(255,214,150,0.6)'
        g.fillRect(W / 2 - swath / 2, yScan, swath, 2)
      }
      g.strokeStyle = 'rgba(232,224,204,0.7)'
      g.lineWidth = 1
      g.beginPath()
      g.moveTo(W / 2 - 10, H / 2)
      g.lineTo(W / 2 + 10, H / 2)
      g.moveTo(W / 2, H / 2 - 10)
      g.lineTo(W / 2, H / 2 + 10)
      g.stroke()
      if (now - lastUi > 250) {
        lastUi = now
        setNight(dark)
        setWhere({ lat: (lat * 180) / Math.PI, lon: ((((lon * 180) / Math.PI + 540) % 360) - 180) })
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [orbit.id, alt, periodMin, ecl, incl, storms, fine])

  const ns = where.lat >= 0 ? 'N' : 'S'
  const ew = where.lon >= 0 ? 'E' : 'W'
  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-black">
      <canvas ref={cv} width={960} height={400} className="block h-auto w-full" aria-label={t('ops.cam.title')} />
      <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
        <span className="flex items-center gap-2 rounded bg-black/70 px-2 py-0.5 text-[11px] uppercase tracking-widest text-amber-200">
          <span className={`h-1.5 w-1.5 rounded-full ${mission.phase === 'ended' ? 'bg-slate-500' : 'bg-rose-500'}`} />
          {t('ops.cam.title')}
        </span>
        <span className="rounded bg-black/70 px-2 py-0.5 font-mono text-[11px] text-slate-200">
          {fmt(Math.abs(where.lat), 1)}°{ns} {fmt(Math.abs(where.lon), 1)}°{ew} · {Math.round(alt)} km
        </span>
      </div>
      <div className="pointer-events-none absolute inset-x-2 bottom-2 flex flex-wrap items-end justify-between gap-2 text-[11px]">
        <span className={`rounded bg-black/70 px-2 py-0.5 ${night ? 'text-sky-300' : 'text-amber-200'}`}>
          {mission.phase === 'transfer' ? t('ops.cam.cruise') : night ? t('ops.cam.night') : t('ops.cam.day')}
        </span>
        <span className="rounded bg-black/70 px-2 py-0.5 text-slate-400">{t('ops.cam.source')}</span>
      </div>
    </div>
  )
}

/** One card per instrument: what it measures, how long it is on, how much data it makes and its share of the science. */
export function InstrumentCards({ mission }: { mission: MissionState }) {
  const t = useT()
  const tx = useTx()
  const r = mission.report
  const total = r.science.byInstrument.reduce((a, b) => a + b.value, 0) || 1
  const status = mission.phase === 'operations' ? 'observing' : mission.phase === 'ended' ? 'done' : 'cruise'
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
      <h2 className="hud-label">{t('ops.inst.title')}</h2>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {mission.design.instruments.map((di) => {
          const inst = getInstrument(di.id)
          const gb = (inst.dataRateMbps * di.duty * 86400) / 8000
          const share = (r.science.byInstrument.find((b) => b.id === di.id)?.value ?? 0) / total
          return (
            <li key={di.id} className="min-w-0 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold" style={{ color: DISC_COLOR[inst.discipline as keyof typeof DISC_COLOR] ?? '#e2e8f0' }}>
                  {tx(`component.${inst.id}.name`, inst.name)}
                </span>
                <span className={`shrink-0 rounded px-1.5 text-[10px] uppercase tracking-wider ${status === 'observing' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700/40 text-slate-400'}`}>
                  {t(`ops.inst.status.${status}` as StringKey)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-snug text-slate-400">{tx(`component.${inst.id}.description`, inst.description)}</p>
              <div className="mt-2 grid grid-cols-3 gap-1 text-[11px] tabular-nums text-slate-300">
                <span>{t('ops.inst.duty', { pct: Math.round(di.duty * 100) })}</span>
                <span>{t('ops.inst.data', { gb: fmt(gb, 1) })}</span>
                <span>{t('ops.inst.science', { pct: Math.round(share * 100) })}</span>
              </div>
              <div className="mt-1 h-1 rounded bg-slate-800">
                <div className="h-1 rounded bg-violet-400" style={{ width: `${Math.round(share * 100)}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Where the data goes: produced on board vs what the radio can send home each day. */
export function DataFlow({ mission }: { mission: MissionState }) {
  const t = useT()
  const d = mission.report.data
  const produced = d.generatedGbDay
  const down = d.downlinkGbDay
  const max = Math.max(produced, down, 0.001)
  const over = produced - down
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
      <h2 className="hud-label">{t('ops.data.title')}</h2>
      <div className="mt-2 space-y-1.5 text-xs">
        {[
          { label: t('ops.data.produced'), v: produced, c: 'bg-violet-400' },
          { label: t('ops.data.downlink'), v: down, c: 'bg-sky-400' },
        ].map((b) => (
          <div key={b.label} className="grid grid-cols-[84px_1fr_74px] items-center gap-2">
            <span className="text-slate-400">{b.label}</span>
            <div className="h-2.5 rounded bg-slate-800">
              <div className={`h-2.5 rounded ${b.c}`} style={{ width: `${(b.v / max) * 100}%` }} />
            </div>
            <span className="text-right tabular-nums text-slate-200">{t('ops.inst.data', { gb: fmt(b.v, 1) })}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">{t('ops.data.contact', { min: Math.round(d.contactMinDay) })}</p>
      <p className={`mt-1 text-xs ${over > 0.05 ? 'text-amber-300' : 'text-emerald-300'}`}>
        {over > 0.05 ? t('ops.data.over', { gb: fmt(over, 1), store: fmt(d.storageGb, 0) }) : t('ops.data.ok')}
      </p>
    </div>
  )
}

const ASKS = ['eclipse', 'backlog', 'science', 'radiation'] as const

/** Short questions a student may have while the mission flies, answered by Kuntur. */
export function KunturAsks() {
  const t = useT()
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      <h2 className="hud-label">{t('ops.ask.title')}</h2>
      <ul className="mt-2 space-y-1.5">
        {ASKS.map((k) => (
          <li key={k}>
            <button
              type="button"
              onClick={() => setOpen(open === k ? null : k)}
              aria-expanded={open === k}
              className="w-full rounded border border-slate-700 px-2 py-1 text-left text-xs text-slate-200 hover:border-amber-300/60"
            >
              {t(`ops.ask.${k}.q` as StringKey)}
            </button>
            {open === k && <p className="mt-1 px-1 text-xs leading-snug text-slate-300">{t(`ops.ask.${k}.a` as StringKey)}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}

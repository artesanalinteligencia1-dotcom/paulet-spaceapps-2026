// The Earth as seen from high above Peru, painted from NASA Blue Marble / Black Marble, with the ascent ground track
// from Arequipa, the rocket's position and the target orbit ring (its height exaggerated so it reads at this scale).
import { useEffect, useMemo, useRef } from 'react'
import { SITE, type FlightTarget } from './telemetry'
import { greatCircle, loadEarthImages, paintEarth, project, subsolar, R_EARTH_KM, type View } from './globe'

const D2R = Math.PI / 180
export const ORBIT_EXAGGERATION = 2.5

export interface GlobeLive {
  /** downrange distance flown (km) */
  down: number
  /** 0..1 from liftoff to orbit insertion */
  progress: number
}

export function EarthGlobe({ size, target, light, live, labels = true }: { size: number; target: FlightTarget; light: 'dawn' | 'day' | 'night'; live: { current: GlobeLive }; labels?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const marker = useRef<SVGGElement>(null)
  const flown = useRef<SVGPathElement>(null)
  // frame the ascent: look down on the middle of the first 1700 km of ground track
  const view = useMemo<View>(() => {
    const mid = greatCircle(SITE.latDeg, SITE.lonDeg, target.azimuthDeg, 1100)
    return { lat0: mid.lat * 0.85, lon0: mid.lon }
  }, [target.azimuthDeg])
  const c = size / 2
  const R = size / 2 - 1
  const xy = (lat: number, lon: number, r = 1) => {
    const p = project(lat, lon, view, r)
    return { x: c + p.x * R, y: c - p.y * R, front: p.front, rr: Math.hypot(p.x, p.y) }
  }

  useEffect(() => {
    let alive = true
    void loadEarthImages().then((maps) => {
      const g = canvas.current?.getContext('2d')
      if (!alive || !g) return
      paintEarth(g, size, view, maps, subsolar(light, SITE.lonDeg))
    })
    return () => {
      alive = false
    }
  }, [size, view, light])

  const svg = useMemo(() => {
    const seg = (pts: { x: number; y: number; ok: boolean }[]) => {
      let d = ''
      let pen = false
      for (const p of pts) {
        if (!p.ok) {
          pen = false
          continue
        }
        d += `${pen ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`
        pen = true
      }
      return d
    }
    const grid: string[] = []
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = []
      for (let lon = -180; lon <= 180; lon += 4) {
        const p = xy(lat * D2R, lon * D2R)
        pts.push({ ...p, ok: p.front })
      }
      grid.push(seg(pts))
    }
    for (let lon = -180; lon < 180; lon += 30) {
      const pts = []
      for (let lat = -88; lat <= 88; lat += 4) {
        const p = xy(lat * D2R, lon * D2R)
        pts.push({ ...p, ok: p.front })
      }
      grid.push(seg(pts))
    }
    const track = []
    for (let k = 0; k <= 60; k++) {
      const g = greatCircle(SITE.latDeg, SITE.lonDeg, target.azimuthDeg, (1700 * k) / 60)
      const p = xy(g.lat, g.lon)
      track.push({ ...p, ok: true })
    }
    // the orbit: the same great circle all the way round, raised to the (exaggerated) orbit height
    const s = 1 + Math.max(0.05, (Math.min(target.parkingKm, 2000) / R_EARTH_KM) * ORBIT_EXAGGERATION)
    const front = []
    const back = []
    for (let k = 0; k <= 360; k += 2) {
      const g = greatCircle(SITE.latDeg, SITE.lonDeg, target.azimuthDeg, (2 * Math.PI * R_EARTH_KM * k) / 360)
      const p = xy(g.lat, g.lon, s)
      const visible = p.front || p.rr > 1
      front.push({ ...p, ok: visible })
      back.push({ ...p, ok: !visible })
    }
    const site = xy(SITE.latDeg * D2R, SITE.lonDeg * D2R)
    return { grid, track: seg(track), orbitFront: seg(front), orbitBack: seg(back), site }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, size, target.azimuthDeg, target.parkingKm])

  // the rocket marker and the flown track follow the live telemetry
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const g = greatCircle(SITE.latDeg, SITE.lonDeg, target.azimuthDeg, live.current.down)
      const p = xy(g.lat, g.lon)
      marker.current?.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`)
      flown.current?.setAttribute('stroke-dashoffset', String(1 - Math.min(1, live.current.down / 1700)))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, size, target.azimuthDeg])

  // the box includes room for the orbit ring, so nothing ever spills over the panel around it
  const pad = Math.round(size * 0.2)
  const box = size + 2 * pad
  return (
    <div className="relative shrink-0 overflow-hidden" style={{ width: box, height: box }}>
      <canvas ref={canvas} width={size} height={size} className="absolute rounded-full" style={{ left: pad, top: pad, boxShadow: '0 0 0 1px #4a505a, 0 0 32px 4px rgb(80 150 255 / 0.25)' }} />
      <svg viewBox={`${-pad} ${-pad} ${box} ${box}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <g stroke="rgb(232 224 204 / 0.18)" strokeWidth={0.8} fill="none">{svg.grid.map((d, i) => <path key={i} d={d} />)}</g>
        <path d={svg.orbitBack} stroke="#d9b46a" strokeOpacity={0.35} strokeWidth={1.2} strokeDasharray="3 4" fill="none" />
        <path d={svg.orbitFront} stroke="#d9b46a" strokeWidth={1.6} fill="none" className="deck-orbit-flow" strokeDasharray="10 6" />
        <path d={svg.track} stroke="#f08a3c" strokeOpacity={0.45} strokeWidth={1.6} strokeDasharray="4 3" fill="none" />
        <path ref={flown} d={svg.track} stroke="#f08a3c" strokeWidth={2.6} fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} />
        <circle cx={svg.site.x} cy={svg.site.y} r={size > 200 ? 4 : 2.5} fill="#f08a3c" />
        <g ref={marker}>
          <circle r={size > 200 ? 9 : 5} fill="none" stroke="#e8e0cc" strokeWidth={1.4} className="deck-ping" />
          <circle r={size > 200 ? 3.5 : 2.2} fill="#e8e0cc" />
        </g>
        {labels && (
          <text x={svg.site.x - 8} y={svg.site.y + 4} fontSize={13} fill="#e8e0cc" textAnchor="end" className="deck-font">AREQUIPA</text>
        )}
      </svg>
    </div>
  )
}

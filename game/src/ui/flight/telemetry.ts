// Display telemetry for the flight deck. The game's launch clock is compressed (pace 1: 1 s ≈ 1 min after liftoff);
// these functions map it to a realistic two-stage ascent from Arequipa to the mission's parking orbit, so the panels
// read like a real flight: max-Q near 12 km, MECO near 70 km and 2 km/s, insertion at the target altitude and orbital
// speed (√(μ/r)). Inclination and launch azimuth follow the orbit family (spherical trigonometry from the site's
// latitude). Values for show; the mission outcome comes from the engine, not from here.
import type { LaunchTarget } from '../../engine/types'
import type { Timeline } from '../launch/LaunchSequence'

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x))
const pad2 = (n: number) => String(Math.floor(n)).padStart(2, '0')
export const fmtNum = (n: number, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })

export const SITE = { latDeg: -16.4, lonDeg: -71.5, name: 'Arequipa' }
const MU = 398600.4418
const RE = 6371
/** Real seconds of flight per game second after liftoff at pace 1 (SECO ≈ 8.5 min after liftoff). */
const REAL_PER_GAME_S = 67

export interface FlightTarget {
  launchTarget: LaunchTarget
  /** parking orbit altitude (km) */
  parkingKm: number
  /** the mission orbit's inclination (deg) */
  incDeg: number
  /** launch azimuth from Arequipa (deg from north) */
  azimuthDeg: number
  /** Δv of each stage (m/s), for the propulsion gauges */
  dv1: number
  dv2: number
  sideBoosters: boolean
  /** reusable first stage that tries to land */
  landing: boolean
}

/** Orbit family → inclination; azimuth from sin(az) = cos(i) / cos(latitude); retrograde orbits launch south-southwest. */
export function flightTarget(launchTarget: LaunchTarget, parkingKm: number, opts: { sideBoosters: boolean; landing: boolean }): FlightTarget {
  const lat = (Math.abs(SITE.latDeg) * Math.PI) / 180
  const inc = launchTarget === 'sso' ? 97.9 : launchTarget === 'leo' ? 51.6 : Math.abs(SITE.latDeg)
  const s = Math.cos((inc * Math.PI) / 180) / Math.cos(lat)
  const az = Math.abs(s) >= 1 ? 90 : (Math.asin(s) * 180) / Math.PI
  // retrograde (i > 90°): the southern launch branch, 180° − az, gives the classic south-southwest heading
  const azimuthDeg = inc > 90 ? 180 - az : az
  const vOrbit = Math.sqrt(MU / (RE + parkingKm)) * 1000
  const total = vOrbit + 1500 // gravity and drag losses
  return { launchTarget, parkingKm, incDeg: inc, azimuthDeg, dv1: Math.round(total * 0.42), dv2: Math.round(total * 0.58), ...opts }
}

export interface Telemetry {
  met: string
  phase: string
  link: string
  alt: string
  apo: string
  peri: string
  inc: string
  vel: string
  down: string
  pitchDeg: string
  tapeV: string
  tapeA: string
  dv1: string
  dv2: string
  dvTotal: string
  loadFlag: string
  qPct: string
  heatPct: string
  gloadPct: string
  loxPct: string
  fuelPct: string
  qFrac: number
  heatFrac: number
  gloadFrac: number
  loxFrac: number
  fuelFrac: number
  dv1Frac: number
  dv2Frac: number
  altNum: number
  velNum: number
  qNum: number
  gNum: number
  downNum: number
  pitchDegNum: number
  /** 0 at liftoff, 1 at orbit insertion */
  progress: number
  lost: boolean
}

/** Altitude (km) along the ascent: about 70 km at MECO, the parking altitude at SECO. */
function altitudeKm(p: number, parkingKm: number) {
  const pm = 0.47
  return p < pm ? 70 * (p / pm) ** 1.6 : 70 + (parkingKm - 70) * ((p - pm) / (1 - pm)) ** 0.8
}

/** Telemetry at time t of the launch clock (seconds after pressing Launch). After a failure it freezes at that instant. */
export function telemetryAt(tIn: number, T: Timeline, target: FlightTarget, failAt: number | null = null): Telemetry {
  const lost = failAt !== null && tIn >= failAt
  const t = lost ? failAt! : tIn
  const P = T.pace ?? 1
  const tf = t - T.liftoff
  const span = T.seco - T.liftoff
  const p = clamp(tf / span)
  const metS = (Math.max(0, tf) * REAL_PER_GAME_S) / P
  const vOrbit = Math.sqrt(MU / (RE + target.parkingKm)) * 1000
  const altKm = tf <= 0 ? 0 : altitudeKm(p, target.parkingKm)
  const vel = tf <= 0 ? 0 : vOrbit * p ** 1.9
  const down = tf <= 0 ? 0 : 1700 * p ** 2.2
  const q = tf <= 0 ? 0 : 35 * Math.exp(-(((t - T.maxQ) / (0.9 * P)) ** 2))
  const heat = clamp((q / 35) * 0.9 + (tf > 0 && t < T.fairing ? 0.08 : 0))
  const s1 = clamp((t - T.liftoff) / (T.meco - T.liftoff))
  const coast = 0.5 * P
  const s2 = clamp((t - T.meco - coast) / (T.seco - T.meco - coast))
  const g = t < T.liftoff ? 1 : t < T.meco ? 1.3 + 3.2 * s1 ** 2 : t < T.meco + coast ? 0 : t < T.seco ? 0.8 + 3 * s2 ** 2 : 0
  const apo = tf <= 0 ? 0 : Math.max(altKm, altKm + (target.parkingKm + 40 - altKm) * p ** 0.5)
  const peri = -RE + (RE + target.parkingKm) * p ** 3
  const pitchDeg = tf <= 0 ? 90 : Math.max(0, 90 - 88 * p ** 0.7)
  const dv1 = Math.round(target.dv1 * (1 - s1))
  const dv2 = Math.round(target.dv2 * (1 - 0.9 * s2))
  const phase = lost
    ? 'Vehicle lost'
    : t < T.ignition
      ? 'Terminal count'
      : t < T.liftoff
        ? 'Ignition'
        : t < T.maxQ + 0.4 * P
          ? 'Liftoff · max-Q'
          : t < T.meco
            ? 'First stage ascent'
            : t < T.meco + coast
              ? 'Stage separation'
              : t < T.seco
                ? 'Second stage burn'
                : t < T.deploy
                  ? 'Orbital insertion'
                  : 'Spacecraft separation'
  const met = tf < 0 ? `T−${pad2(Math.ceil(-tf))}s` : `${pad2(metS / 3600)}h ${pad2((metS % 3600) / 60)}m ${pad2(metS % 60)}s`
  const fuelFrac = t < T.meco ? 1 - s1 : 1 - 0.9 * s2
  return {
    met,
    phase,
    link: lost ? 'Loss of signal' : tf < 3 * P ? 'S-band · Arequipa' : 'S-band · via relay',
    alt: `${fmtNum(altKm, 1)} km`,
    apo: tf <= 0 ? '—' : `${fmtNum(apo, 1)} km`,
    peri: tf <= 0 ? '—' : peri < 0 ? 'Suborbital' : `${fmtNum(peri, 1)} km`,
    inc: `${fmtNum(target.incDeg, 1)}°`,
    vel: `${fmtNum(vel)} m/s`,
    down: `${fmtNum(down)} km`,
    pitchDeg: fmtNum(pitchDeg),
    tapeV: fmtNum(vel),
    tapeA: fmtNum(altKm, 1),
    dv1: fmtNum(dv1),
    dv2: fmtNum(dv2),
    dvTotal: fmtNum(dv1 + dv2),
    loadFlag: lost ? '▲ Anomaly' : q > 28 ? '▲ Max-Q' : g > 4 ? '▲ High g' : '',
    qPct: `${fmtNum(q, 1)} kPa`,
    heatPct: `${fmtNum(heat * 100)}%`,
    gloadPct: `${fmtNum(g, 1)} g`,
    loxPct: `${fmtNum(fuelFrac * 100)}%`,
    fuelPct: `${fmtNum(clamp(fuelFrac * 0.97) * 100)}%`,
    qFrac: q / 35,
    heatFrac: heat,
    gloadFrac: clamp(g / 5),
    loxFrac: fuelFrac,
    fuelFrac: clamp(fuelFrac * 0.97),
    dv1Frac: dv1 / target.dv1,
    dv2Frac: dv2 / target.dv2,
    altNum: altKm,
    velNum: vel,
    qNum: q,
    gNum: g,
    downNum: down,
    pitchDegNum: pitchDeg,
    progress: p,
    lost,
  }
}

export interface FlightEvent {
  id: string
  label: string
  at: number
  tone: 'info' | 'warn' | 'good' | 'alarm'
}

/** The events of this flight, in order (booster landing and failure included when they happen). */
export function flightEvents(T: Timeline, target: FlightTarget, failAt: number | null, failText: string | null, boosterLanded: boolean | null): FlightEvent[] {
  const P = T.pace ?? 1
  const list: FlightEvent[] = [
    { id: 'ignition', label: 'Ignition', at: T.ignition, tone: 'info' },
    { id: 'liftoff', label: 'Liftoff', at: T.liftoff, tone: 'good' },
    { id: 'maxq', label: 'Max-Q', at: T.maxQ, tone: 'warn' },
  ]
  if (target.sideBoosters) list.push({ id: 'boosters', label: 'Side boosters away', at: T.boosterSep, tone: 'info' })
  list.push({ id: 'meco', label: 'MECO', at: T.meco, tone: 'info' }, { id: 'sep', label: 'Stage separation', at: T.meco + 0.2 * P, tone: 'info' })
  if (target.landing && boosterLanded !== null) list.push({ id: 'landing', label: boosterLanded ? 'Booster landed' : 'Booster lost at sea', at: T.meco + 0.4 + 3.2, tone: boosterLanded ? 'good' : 'warn' })
  list.push({ id: 'fairing', label: 'Fairing jettison', at: T.fairing, tone: 'info' }, { id: 'seco', label: 'SECO · in orbit', at: T.seco, tone: 'good' }, { id: 'deploy', label: 'Spacecraft separation', at: T.deploy, tone: 'good' })
  const sorted = list.sort((a, b) => a.at - b.at)
  if (failAt === null) return sorted
  return [...sorted.filter((e) => e.at < failAt), { id: 'fail', label: failText ?? 'Vehicle lost', at: failAt, tone: 'alarm' }]
}

// Display telemetry for the flight HUD: the game's compressed launch clock (1 s ≈ 1 min) mapped to a realistic ascent
// to low Earth orbit, so the panels read like a real flight (orders of magnitude from typical two-stage launches to
// ~200 km: max-Q near 12 km, MECO near 70 km and 2.3 km/s, orbit at 7.8 km/s). Values for show, not for scoring.
import type { Timeline } from '../launch/LaunchSequence'

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x))
const pad = (n: number) => String(Math.floor(n)).padStart(2, '0')
const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })

/** Real seconds of flight per second of the game's launch clock after liftoff. */
export const REAL_PER_GAME_S = 67
const SITE_LAT = 16.4
const DV1 = 3400
const DV2 = 6300

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
  pitchDegNum: number
  /** 0 at liftoff, 1 at orbit insertion */
  progress: number
}

/** Telemetry at time t of the launch clock (seconds after pressing Launch). */
export function telemetryAt(t: number, T: Timeline): Telemetry {
  const tf = t - T.liftoff
  const span = T.seco - T.liftoff
  const p = clamp(tf / span)
  const metS = Math.max(0, tf) * REAL_PER_GAME_S + Math.max(0, t - T.seco) * 0
  const altKm = 210 * p ** 1.6
  const vel = tf <= 0 ? 0 : 7790 * p ** 1.9
  const down = 1700 * p ** 2.2
  const q = 35 * Math.exp(-(((tf - (T.maxQ - T.liftoff)) / 0.9) ** 2)) * (tf > 0 ? 1 : 0)
  const heat = clamp(q / 35 * 0.9 + (tf > 0 && t < T.fairing ? 0.08 : 0))
  // acceleration grows as the stage gets lighter, drops at staging
  const s1 = clamp((t - T.liftoff) / (T.meco - T.liftoff))
  const s2 = clamp((t - T.meco - 0.5) / (T.seco - T.meco - 0.5))
  const g = t < T.liftoff ? 1 : t < T.meco ? 1.3 + 3.2 * s1 ** 2 : t < T.meco + 0.5 ? 0 : t < T.seco ? 0.8 + 3 * s2 ** 2 : 0
  const apo = Math.max(altKm, altKm + (245 - altKm) * p ** 0.5)
  const peri = -6371 + (6371 + 182) * p ** 3
  const pitchDeg = 90 - (0.5 * clamp((tf - 1.5) / (span - 1.5)) ** 1.3 * 180) / Math.PI - 50 * clamp((t - T.meco) / span)
  const dv1 = Math.round(DV1 * (1 - s1))
  const dv2 = Math.round(DV2 * (1 - 0.88 * s2))
  const phase =
    t < T.ignition ? 'Terminal count' : t < T.liftoff ? 'Ignition' : t < T.maxQ + 0.4 ? 'Liftoff · max-Q' : t < T.meco ? 'First stage ascent' : t < T.meco + 0.5 ? 'Stage separation' : t < T.seco ? 'Second stage burn' : t < T.deploy ? 'Orbital insertion' : 'Spacecraft deploy'
  const met = tf < 0 ? `T−${pad(-tf)}s` : `${pad(metS / 3600)}h ${pad((metS % 3600) / 60)}m ${pad(metS % 60)}s`
  const fuelFrac = t < T.meco ? 1 - s1 : 1 - 0.88 * s2
  return {
    met,
    phase,
    link: tf < 6 ? 'S-band · strong' : 'S-band · via relay',
    alt: `${fmt(altKm, 1)} km`,
    apo: `${fmt(apo, 1)} km`,
    peri: peri < 0 ? 'suborbital' : `${fmt(peri, 1)} km`,
    inc: `${fmt(SITE_LAT + 81.6 * p ** 0.4, 1)}°`,
    vel: `${fmt(vel)} m/s`,
    down: `${fmt(down)} km`,
    pitchDeg: fmt(pitchDeg),
    tapeV: fmt(vel),
    tapeA: fmt(altKm, 1),
    dv1: fmt(dv1),
    dv2: fmt(dv2),
    dvTotal: fmt(dv1 + dv2),
    loadFlag: q > 28 ? '▲ MAX-Q' : g > 4 ? '▲ HIGH G' : '',
    qPct: `${fmt(q, 1)} kPa`,
    heatPct: `${fmt(heat * 100)}%`,
    gloadPct: `${fmt(g, 1)} g`,
    loxPct: `${fmt(fuelFrac * 100)}%`,
    fuelPct: `${fmt(fuelFrac * 100)}%`,
    qFrac: q / 35,
    heatFrac: heat,
    gloadFrac: clamp(g / 5),
    loxFrac: fuelFrac,
    fuelFrac: clamp(fuelFrac * 0.97),
    dv1Frac: dv1 / DV1,
    dv2Frac: dv2 / DV2,
    altNum: altKm,
    velNum: vel,
    qNum: q,
    gNum: g,
    pitchDegNum: pitchDeg,
    progress: p,
  }
}

export const EVENTS: { label: string; at: (T: Timeline) => number; tone: 'info' | 'warn' | 'good' }[] = [
  { label: 'Ignition', at: (T) => T.ignition, tone: 'info' },
  { label: 'Liftoff', at: (T) => T.liftoff, tone: 'good' },
  { label: 'Max-Q', at: (T) => T.maxQ, tone: 'warn' },
  { label: 'MECO', at: (T) => T.meco, tone: 'info' },
  { label: 'Stage separation', at: (T) => T.meco + 0.2, tone: 'info' },
  { label: 'Fairing jettison', at: (T) => T.fairing, tone: 'info' },
  { label: 'SECO · orbit', at: (T) => T.seco, tone: 'good' },
  { label: 'Spacecraft deploy', at: (T) => T.deploy, tone: 'good' },
]

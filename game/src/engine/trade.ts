// Trade study: two design options side by side, as a mission design lab compares alternatives before choosing.
// Pure: the numbers come from evaluateDesign; each metric says which direction is better.
import type { DesignReport } from './types'

export interface TradeMetric {
  key: 'cost' | 'launchMargin' | 'powerMargin' | 'data' | 'devMonths' | 'life' | 'science' | 'success' | 'requirements'
  better: 'high' | 'low'
  value: (r: DesignReport) => number
  digits: number
}

export const TRADE_METRICS: TradeMetric[] = [
  { key: 'requirements', better: 'high', digits: 0, value: (r) => r.requirements.filter((q) => !q.optional && q.met).length },
  { key: 'cost', better: 'low', digits: 1, value: (r) => r.cost.totalM },
  { key: 'launchMargin', better: 'high', digits: 0, value: (r) => (r.mass.capacityKg > 0 ? 100 * (1 - r.mass.wetKg / r.mass.capacityKg) : -100) },
  { key: 'powerMargin', better: 'high', digits: 0, value: (r) => 100 * r.power.marginEol },
  { key: 'data', better: 'high', digits: 1, value: (r) => r.data.deliveredGbDay },
  { key: 'devMonths', better: 'low', digits: 1, value: (r) => r.schedule.launchMonth ?? r.schedule.devMonths },
  { key: 'life', better: 'high', digits: 1, value: (r) => r.life.lifeYears },
  { key: 'science', better: 'high', digits: 0, value: (r) => r.science.perYear },
  { key: 'success', better: 'high', digits: 0, value: (r) => 100 * r.risk.successProbability },
]

/** The options that share the best value for a metric; none when every known option has the same value. */
export function bestOptions(values: (number | null)[], better: 'high' | 'low'): number[] {
  const known = values.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => x.v !== null && Number.isFinite(x.v))
  if (known.length < 2) return []
  const top = better === 'high' ? Math.max(...known.map((x) => x.v)) : Math.min(...known.map((x) => x.v))
  const winners = known.filter((x) => Math.abs(x.v - top) < 1e-9).map((x) => x.i)
  return winners.length === known.length ? [] : winners
}

/** How many metrics each option wins: a quick verdict for the team. */
export function tradeWins(reports: (DesignReport | null)[]): number[] {
  const wins = reports.map(() => 0)
  for (const m of TRADE_METRICS) {
    for (const i of bestOptions(reports.map((r) => (r ? m.value(r) : null)), m.better)) wins[i]++
  }
  return wins
}

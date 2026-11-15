// "Goicochea's values" (owner's decision, 2026-11-14): every design leans towards rigor, audacity or service to people.
// Each value is the mean of three simple, visible measures (0..1), so a player can see why a bar moved:
//   rigor    = launcher mass margin (25 % = full), end-of-life power margin (30 % = full), chance of success (60→95 %)
//   audacity = optional bonus goals met, science per year against twice the starting design, share of the budget used
//   service  = data delivered against twice the requirement, life against twice the requirement, share of budget saved
// Spending the whole budget is audacious; saving it serves more missions: the two pull against each other on purpose.
import { evaluateDesign } from './evaluate'
import type { Design, DesignReport, Scenario } from './types'

export type ValueId = 'rigor' | 'audacity' | 'service'
export const VALUE_IDS: ValueId[] = ['rigor', 'audacity', 'service']

export interface GoicocheaValues {
  rigor: number
  audacity: number
  service: number
  dominant: ValueId
}

const clamp = (x: number) => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0)
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

const baseScience = new Map<string, number>()
function startingScience(scenario: Scenario): number {
  let v = baseScience.get(scenario.id)
  if (v === undefined) {
    v = evaluateDesign(structuredClone(scenario.baseDesign), scenario).science.perYear
    baseScience.set(scenario.id, v)
  }
  return v
}

export function goicocheaValues(_design: Design, report: DesignReport, scenario: Scenario): GoicocheaValues {
  const launcherMargin = report.mass.capacityKg > 0 ? 1 - report.mass.wetKg / report.mass.capacityKg : 0
  const rigor = mean([clamp(launcherMargin / 0.25), clamp(report.power.marginEol / 0.3), clamp((report.risk.successProbability - 0.6) / 0.35)])

  const bonus = report.requirements.filter((r) => r.optional)
  const bonusShare = bonus.length ? bonus.filter((r) => r.met).length / bonus.length : 0
  const base = startingScience(scenario)
  const scienceK = base > 0 ? clamp(report.science.perYear / (2 * base)) : clamp(report.science.perYear / 100)
  const used = report.cost.budgetM > 0 ? clamp(report.cost.totalM / report.cost.budgetM) : 0
  const audacity = mean([bonusShare, scienceK, used])

  const dataReq = report.requirements.find((r) => r.kind === 'dataDeliveredGbDay' && !r.optional)
  const dataK = dataReq && typeof dataReq.target === 'number' && dataReq.target > 0 ? clamp(report.data.deliveredGbDay / (2 * dataReq.target)) : 0.5
  const lifeK = report.life.requiredYears > 0 ? clamp(report.life.lifeYears / (2 * report.life.requiredYears)) : 0.5
  const service = mean([dataK, lifeK, clamp(1 - used)])

  const v = { rigor, audacity, service }
  const dominant = VALUE_IDS.reduce((a, b) => (v[b] > v[a] ? b : a), 'rigor' as ValueId)
  return { ...v, dominant }
}

import { describe, expect, it } from 'vitest'
import { getScenario } from '../src/engine/catalog'
import { evaluateDesign } from '../src/engine/evaluate'
import { goicocheaValues } from '../src/engine/values'
import type { DesignReport } from '../src/engine/types'

const scenario = getScenario('earth_watch')
const design = structuredClone(scenario.baseDesign)
const report = evaluateDesign(design, scenario)

const tweak = (f: (r: DesignReport) => void) => {
  const r = structuredClone(report)
  f(r)
  return goicocheaValues(design, r, scenario)
}

describe("Goicochea's values", () => {
  it('stay between 0 and 1 and name the strongest one', () => {
    const v = goicocheaValues(design, report, scenario)
    for (const k of ['rigor', 'audacity', 'service'] as const) {
      expect(v[k]).toBeGreaterThanOrEqual(0)
      expect(v[k]).toBeLessThanOrEqual(1)
    }
    expect(v[v.dominant]).toBe(Math.max(v.rigor, v.audacity, v.service))
  })

  it('wide margins and a reliable design read as rigor', () => {
    const v = tweak((r) => {
      r.mass.wetKg = r.mass.capacityKg * 0.6
      r.power.marginEol = 0.4
      r.risk.successProbability = 0.97
      r.cost.totalM = r.cost.budgetM * 0.5
      r.requirements = r.requirements.map((q) => ({ ...q, met: q.optional ? false : q.met }))
    })
    expect(v.rigor).toBeCloseTo(1)
  })

  it('spending the whole budget raises audacity and lowers service', () => {
    const thrifty = tweak((r) => (r.cost.totalM = r.cost.budgetM * 0.3))
    const bold = tweak((r) => (r.cost.totalM = r.cost.budgetM))
    expect(bold.audacity).toBeGreaterThan(thrifty.audacity)
    expect(bold.service).toBeLessThan(thrifty.service)
  })
})

import { describe, expect, it } from 'vitest'
import en from '../src/i18n/strings/en.json'
import es from '../src/i18n/strings/es.json'
import { getScenario } from '../src/engine/catalog/scenarios'
import { evaluateDesign } from '../src/engine/evaluate'
import { TRADE_METRICS, bestOptions, tradeWins } from '../src/engine/trade'

const ew = getScenario('earth_watch')
const a = evaluateDesign({ ...ew.baseDesign, instruments: [{ id: 'multispectral', duty: 0.05 }], stationIds: ['mid_north', 'arctic'] }, ew)
const b = evaluateDesign({ ...ew.baseDesign, instruments: [{ id: 'multispectral', duty: 0.05 }, { id: 'hyperspectral', duty: 0.03 }], stationIds: ['mid_north', 'arctic'], launcherId: 'medium' }, ew)

describe('trade study', () => {
  it('picks the best option per metric in the right direction, and no winner on a tie', () => {
    expect(bestOptions([3, 5, null], 'high')).toEqual([1])
    expect(bestOptions([3, 5, null], 'low')).toEqual([0])
    expect(bestOptions([5, 3, 5], 'high')).toEqual([0, 2]) // option A and the current design are the same
    expect(bestOptions([4, 4], 'high')).toEqual([])
    expect(bestOptions([4, null], 'high')).toEqual([])
  })

  it('a richer design wins on science and loses on cost', () => {
    const cost = TRADE_METRICS.find((m) => m.key === 'cost')!
    const science = TRADE_METRICS.find((m) => m.key === 'science')!
    expect(bestOptions([cost.value(a), cost.value(b)], cost.better)).toEqual([0])
    expect(bestOptions([science.value(a), science.value(b)], science.better)).toEqual([1])
    const wins = tradeWins([a, b, null])
    expect(wins[0] + wins[1]).toBeGreaterThan(0)
    expect(wins[2]).toBe(0)
  })

  it('every metric has its label in both languages', () => {
    for (const m of TRADE_METRICS) {
      expect((en as Record<string, string>)[`trade.metric.${m.key}`]).toBeTruthy()
      expect((es as Record<string, string>)[`trade.metric.${m.key}`]).toBeTruthy()
    }
  })
})

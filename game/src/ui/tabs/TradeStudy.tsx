// Review tab: save the current design as option A or B and compare the options side by side (a trade study).
import { useMemo, useState } from 'react'
import { evaluateDesign } from '../../engine/evaluate'
import { TRADE_METRICS, bestOptions, tradeWins } from '../../engine/trade'
import type { Design, DesignReport, Scenario } from '../../engine/types'
import { useT, type StringKey } from '../../i18n'
import { fmt } from '../../i18n/en'
import { useGame } from '../../store/game'
import { Section } from '../components'

const KEY = 'ppgame.trade.v1'
type Slots = { A?: Design; B?: Design }

function load(scenarioId: string): Slots {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Slots>)[scenarioId] ?? {}
  } catch {
    return {}
  }
}
function save(scenarioId: string, slots: Slots) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Slots>
    all[scenarioId] = slots
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* storage unavailable: the comparison lasts while the screen is open */
  }
}

export function TradeStudy({ design, report, scenario }: { design: Design; report: DesignReport; scenario: Scenario }) {
  const t = useT()
  const [slots, setSlots] = useState<Slots>(() => load(scenario.id))
  const setDesign = (d: Design) => useGame.setState({ design: structuredClone(d) })
  const reports = useMemo(() => ({ A: slots.A ? evaluateDesign(slots.A, scenario) : null, B: slots.B ? evaluateDesign(slots.B, scenario) : null }), [slots, scenario])
  const put = (k: 'A' | 'B') => {
    const next = { ...slots, [k]: structuredClone(design) }
    setSlots(next)
    save(scenario.id, next)
  }
  const cols: { id: 'A' | 'B' | 'now'; r: DesignReport | null }[] = [
    { id: 'A', r: reports.A },
    { id: 'B', r: reports.B },
    { id: 'now', r: report },
  ]
  const wins = tradeWins(cols.map((c) => c.r))
  return (
    <Section title={t('trade.title')} hint={t('trade.hint')}>
      <div className="mb-2 flex flex-wrap gap-2">
        {(['A', 'B'] as const).map((k) => (
          <span key={k} className="flex gap-1">
            <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => put(k)}>
              {t('trade.save', { option: k })}
            </button>
            {slots[k] && (
              <button type="button" className="px-2 py-1 text-xs text-slate-400 hover:text-white" onClick={() => setDesign(slots[k]!)}>
                {t('trade.load', { option: k })}
              </button>
            )}
          </span>
        ))}
      </div>
      {!slots.A && !slots.B ? (
        <p className="text-xs text-slate-500">{t('trade.empty')}</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="py-1 font-normal" />
              {cols.map((c, i) => (
                <th key={c.id} className="py-1 text-right font-normal">
                  {c.id === 'now' ? t('trade.current') : t('trade.option', { option: c.id })}
                  {c.r && <span className="ml-1 text-slate-500">({t('trade.wins', { n: wins[i] })})</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono">
            {TRADE_METRICS.map((m) => {
              const values = cols.map((c) => (c.r ? m.value(c.r) : null))
              const best = bestOptions(values, m.better)
              return (
                <tr key={m.key} className="border-t border-slate-800">
                  <td className="py-1 font-sans text-slate-300">{t(`trade.metric.${m.key}` as StringKey)}</td>
                  {values.map((v, i) => (
                    <td key={i} className={`py-1 text-right ${best.includes(i) ? 'font-semibold text-emerald-300' : 'text-slate-300'}`}>
                      {v === null ? '—' : fmt(v, m.digits)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Section>
  )
}

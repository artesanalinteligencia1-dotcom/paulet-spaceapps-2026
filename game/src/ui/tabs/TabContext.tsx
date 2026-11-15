// A strip at the top of every design tab: what you decide here and why, and what this mission asks of this tab.
import type { DesignReport } from '../../engine/types'
import { useT, type StringKey } from '../../i18n'
import type { TabId } from '../../store/game'
import { REQUIREMENT_TAB, requirementLine } from '../guide/lines'

export function TabContext({ tab, report }: { tab: TabId; report: DesignReport }) {
  const t = useT()
  const asks = report.requirements.filter((q) => REQUIREMENT_TAB[q.kind] === tab)
  return (
    <div className="mb-5 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
      <p className="text-sm text-slate-200">
        <span className="font-semibold text-sky-300">{t('tabctx.decide')}</span> {t(('tabctx.' + tab + '.what') as StringKey)}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        <span className="font-semibold text-slate-300">{t('tabctx.why')}</span> {t(('tabctx.' + tab + '.why') as StringKey)}
      </p>
      {asks.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="font-semibold text-slate-300">{t('tabctx.asks')}</span>
          {asks.map((q) => (
            <span key={q.id} className={q.met ? 'text-emerald-300' : q.optional ? 'text-slate-400' : 'text-amber-300'}>
              {requirementLine(q)}
              {q.optional ? ' ' + t('tabctx.bonus') : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

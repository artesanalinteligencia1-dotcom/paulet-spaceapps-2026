// Goicochea's values as three small live bars (rigor, audacity, service); the strongest one is marked.
import { VALUE_IDS, type GoicocheaValues } from '../engine/values'
import { useT, type StringKey } from '../i18n'

export const VALUE_COLOR = { rigor: '#36d1ff', audacity: '#f08a3c', service: '#d9b46a' } as const

export function ValuesBars({ values, title = true }: { values: GoicocheaValues; title?: boolean }) {
  const t = useT()
  return (
    <div title={t('values.hint')}>
      {title && (
        <div className="mb-1 flex items-baseline justify-between">
          <span className="hud-label">{t('values.title')}</span>
          <span className="text-[12px] text-[#8a8f98]">{t('values.lead', { value: t(`values.${values.dominant}` as StringKey) })}</span>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {VALUE_IDS.map((v) => (
          <div key={v}>
            <div className={`deck-font flex justify-between text-[13px] uppercase tracking-wider ${values.dominant === v ? 'text-[#e8e0cc]' : 'text-[#8a8f98]'}`}>
              <span>
                {values.dominant === v ? '★ ' : ''}
                {t(`values.${v}` as StringKey)}
              </span>
              <span className="tabular-nums">{Math.round(values[v] * 100)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden bg-white/[0.07]">
              <div className="h-full transition-[width] duration-500 ease-out" style={{ width: `${values[v] * 100}%`, background: VALUE_COLOR[v] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

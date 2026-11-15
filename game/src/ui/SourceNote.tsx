// "Source: NASA …" in context: a small line under the panels whose numbers come from NASA data or NASA methods.
import { nasaSource } from '../engine/nasaSources'
import { useT } from '../i18n'

export function SourceNote({ ids, className = '' }: { ids: string[]; className?: string }) {
  const t = useT()
  const list = ids.map(nasaSource).filter((s) => !!s)
  if (!list.length) return null
  return (
    <p className={`text-[12px] leading-snug text-[#8a8f98] ${className}`}>
      <span className="deck-font mr-1.5 uppercase tracking-[0.14em] text-[#d9b46a]">{t('source.label')}</span>
      {list.map((s, i) => (
        <span key={s.id}>
          {i > 0 && ' · '}
          <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-[#3a3f47] underline-offset-2 hover:text-[#e8e0cc] hover:decoration-[#d9b46a]">
            {s.publisher.replace(/ \(challenge resource\)$/, '')} — {s.title}
          </a>
        </span>
      ))}
    </p>
  )
}

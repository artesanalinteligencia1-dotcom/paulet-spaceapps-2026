// Learn → "NASA data": every NASA source behind the game, what the game takes from it and where it shows up.
import { NASA_SOURCES, type SourceKind } from '../../engine/nasaSources'
import { useT, type StringKey } from '../../i18n'
import { useSettings } from '../../store/settings'
import { useState } from 'react'
import { ACT_FILMS, REAL_STORIES, RealStoryPlayer, readyFilms } from '../video/RealStory'

const GROUPS: SourceKind[] = ['data', 'method', 'challenge', 'reading']

export function NasaResources() {
  const t = useT()
  const lang = useSettings((s) => s.language) === 'es' ? 'es' : 'en'
  const [film, setFilm] = useState<string | null>(null)
  const films = readyFilms([...ACT_FILMS, ...REAL_STORIES])
  return (
    <div className="space-y-6">
      {films.length > 0 && (
        <section data-box="nasa-films" className="hud-panel px-5 py-4">
          <h2 className="hud-label">{t('video.gallery')}</h2>
          <p className="mt-1 text-[13px] text-[#8a8f98]">{t('video.galleryIntro')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {films.map((id) => (
              <button key={id} type="button" className="btn-secondary px-3 py-1 text-[13px]" onClick={() => setFilm(id)}>
                ▶ {t(`video.name.${id}` as StringKey)}
              </button>
            ))}
          </div>
          {film && <RealStoryPlayer id={film} onClose={() => setFilm(null)} />}
        </section>
      )}
      <div className="hud-panel px-5 py-4">
        <p className="text-[15px] leading-relaxed text-[#e8e0cc]">{t('nasa.intro')}</p>
        <p className="mt-1 text-[13px] text-[#8a8f98]">{t('nasa.offline')}</p>
      </div>
      {GROUPS.map((g) => {
        const list = NASA_SOURCES.filter((s) => s.kind === g)
        return (
          <section key={g} data-box="nasa-group">
            <h2 className="hud-label mb-2">{t(`nasa.group.${g}` as StringKey)}</h2>
            <div className="grid grid-cols-2 gap-3">
              {list.map((s) => (
                <article key={s.id} className="mc-card flex flex-col">
                  <div className="hud-label">{s.publisher}</div>
                  <h3 className="mt-0.5 text-[19px] leading-snug text-[#e8e0cc]">{s.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#c9c2b2]">{s.used[lang]}</p>
                  {s.where.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[12px] uppercase tracking-wider text-[#8a8f98]">{t('nasa.where')}</span>
                      {s.where.map((w) => (
                        <span key={w.en} className="border border-[#3a3f47] bg-[#1b1e23] px-2 py-0.5 text-[12px] text-[#e8e0cc]">
                          {w[lang]}
                        </span>
                      ))}
                    </div>
                  )}
                  <a href={s.url} target="_blank" rel="noreferrer" className="btn-secondary mt-3 self-start px-3 py-1 text-[13px]">
                    {t('nasa.open')} ↗
                  </a>
                </article>
              ))}
            </div>
          </section>
        )
      })}
      <p className="text-[12px] text-[#8a8f98]">{t('nasa.noLogos')}</p>
    </div>
  )
}

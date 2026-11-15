// "Letter to Paulet" (owner's decisions, 2026-11-14/15): after every flight Goicochea writes to the memory of Pedro
// Paulet. Two personal lines first, then the technical why (the mission's own causes), signed with the value that led
// the design. It arrives as a console transmission. When the mission fails, the letter says what was learned and
// Kuntur's offer to fly again with the same seed sits right under it.
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { useRef } from 'react'
import type { Cause } from '../../engine/report'
import type { GoicocheaValues } from '../../engine/values'
import { CAUSE_TEXT } from '../../i18n/en'
import { useT, type StringKey } from '../../i18n'
import { useReducedMotion } from '../../store/settings'
import { ValuesBars } from '../ValuesBars'

gsap.registerPlugin(ScrambleTextPlugin)

export type LetterOutcome = 'ok' | 'partial' | 'fail'

export function LetterToPaulet({ outcome, causes, values, missionName, onRetry }: { outcome: LetterOutcome; causes: Cause[]; values: GoicocheaValues; missionName: string; onRetry?: () => void }) {
  const t = useT()
  const reduce = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const v = values.dominant
  const success = outcome === 'ok'
  const why = causes.slice(0, 3).map((c) => ({ c, m: CAUSE_TEXT[c.code]?.(c.params) ?? { title: c.code, why: '' } }))
  const lesson = why.find((x) => x.c.impact < 0 && x.m.change)?.m.change
  const salutation = t('letter.dear')

  // the transmission arrives: the greeting decodes, then each paragraph comes in, then the signature
  useGSAP(
    () => {
      if (reduce) return
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      tl.from('[data-letter-card]', { opacity: 0, y: 16, filter: 'blur(6px)', duration: 0.6 })
        .to('[data-letter-dear]', { duration: 0.9, scrambleText: { text: salutation, chars: 'upperAndLowerCase', speed: 0.5 } }, 0.3)
        .from('[data-letter-line]', { opacity: 0, y: 8, duration: 0.5, stagger: 0.45 }, '-=0.3')
        .from('[data-letter-sign]', { opacity: 0, x: -10, duration: 0.6 }, '-=0.1')
    },
    { scope: root, dependencies: [reduce, outcome] },
  )

  return (
    <div ref={root}>
      <article data-letter-card className="log-card">
        <div className="log-head">
          <span className="log-dot" aria-hidden="true" />
          <span>{t('letter.head')}</span>
          <span className="ml-auto text-[12px] tracking-wider text-[#8a8f98]">{t('letter.place', { mission: missionName })}</span>
        </div>
        <div className="relative z-[1] space-y-3 px-6 pb-5 pt-4 text-[16px] leading-relaxed">
          <p data-letter-dear className="log-title text-[24px]">{reduce ? salutation : ''}</p>
          <p data-letter-line className="text-[#f1d9a6]">{t(`letter.${outcome}.${v}` as StringKey, { mission: missionName })}</p>
          <div data-letter-line>
            <p className="deck-font text-[13px] uppercase tracking-[0.16em] text-[#d9b46a]">{t('letter.why')}</p>
            <ul className="mt-1 space-y-1.5">
              {why.map(({ c, m }) => (
                <li key={c.code} className="flex gap-2">
                  <span className={c.impact >= 0 ? 'text-[#d9b46a]' : 'text-[#ff3d7f]'}>{c.impact >= 0 ? '▲' : '▼'}</span>
                  <span>
                    <span className="text-[#e8e0cc]">{m.title}.</span> <span className="text-[#c9c2b2]">{m.why}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {!success && lesson && (
            <p data-letter-line className="text-[#e8e0cc]">
              <span className="deck-font mr-1.5 text-[13px] uppercase tracking-[0.16em] text-[#d9b46a]">{t('letter.learned')}</span>
              {lesson}
            </p>
          )}
          <div data-letter-sign className="flex items-end justify-between gap-6 border-t border-[#3a3f47] pt-3">
            <div>
              <p className="log-quote text-[18px]">{t(`letter.sign.${v}` as StringKey)}</p>
              <p className="deck-font text-[20px] tracking-wide text-[#e8e0cc]">Pedro Goicochea</p>
              <p className="text-[12px] text-[#8a8f98]">{t('letter.role')}</p>
            </div>
            <div className="w-[300px] shrink-0">
              <ValuesBars values={values} title={false} />
            </div>
          </div>
          <p data-letter-line className="text-[13px] italic text-[#8a8f98]">{t('letter.ps')}</p>
        </div>
      </article>
      {!success && onRetry && (
        <div className="hud-panel mt-3 flex items-center gap-3 px-4 py-2.5">
          <span className="deck-font text-[13px] uppercase tracking-[0.16em] text-[#d9b46a]">Kuntur</span>
          <span className="text-[14px] text-[#e8e0cc]">{t('letter.retryText')}</span>
          <button type="button" className="btn-primary ml-auto px-4 py-2 text-sm" onClick={onRetry}>
            {t('letter.retry')}
          </button>
        </div>
      )}
    </div>
  )
}

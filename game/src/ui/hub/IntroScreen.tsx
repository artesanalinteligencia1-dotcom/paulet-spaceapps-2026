// The intro, "Goicochea and the notebook" (owner's decision, 2026-11-14): dawn over Arequipa, Paulet's notebook opens
// and Kuntur hands the mission to the player. Drawn in code, with no people on screen: the earlier video showed
// Goicochea as a child, and the contest forbids any likeness of minors. A generated video may replace this later
// (with a visible "AI-generated" mark).
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { useMusic } from '../../audio/audio'
import { useT, type StringKey } from '../../i18n'
import { useGame } from '../../store/game'
import { useReducedMotion } from '../../store/settings'
import { Kuntur } from '../guide/robots'
import { MenuBackdrop } from './HomeScreen'

const SCENES = 5
const SCENE_SECONDS = 6

export function IntroScreen() {
  const go = useGame((s) => s.go)
  const t = useT()
  const reduce = useReducedMotion()
  useMusic('home')
  const [scene, setScene] = useState(0)
  const page = useRef<HTMLDivElement>(null)
  const last = scene === SCENES - 1

  // each scene stays a few seconds; a click or a key moves on sooner
  useEffect(() => {
    if (last) return
    const id = window.setTimeout(() => setScene((s) => Math.min(SCENES - 1, s + 1)), SCENE_SECONDS * 1000)
    return () => window.clearTimeout(id)
  }, [scene, last])

  useGSAP(
    () => {
      if (reduce) return
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      if (scene === 0) tl.from('[data-page]', { y: 40, rotate: -3, opacity: 0, duration: 0.9 })
      tl.from('[data-line]', { y: 14, opacity: 0, duration: 0.7 }, scene === 0 ? 0.5 : 0).from('[data-hand]', { opacity: 0, x: -8, duration: 0.6 }, '-=0.2')
      if (scene === SCENES - 2) tl.from('[data-kuntur]', { x: 220, y: -120, rotate: 20, opacity: 0, duration: 1.2, ease: 'power2.out' }, 0)
    },
    { scope: page, dependencies: [scene, reduce], revertOnUpdate: true },
  )

  const next = () => (last ? go('home') : setScene(scene + 1))

  return (
    <main className="relative h-full overflow-hidden text-white" onClick={next} onKeyDown={(e) => e.key === 'Enter' && next()}>
      <MenuBackdrop />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-slate-950/50" />
      <div className="absolute inset-x-12 top-8 flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/60">
        <span>{t('intro.place')}</span>
        <button
          type="button"
          className="pointer-events-auto rounded-full border border-white/25 px-4 py-1.5 text-[11px] tracking-[0.2em] hover:border-white"
          onClick={(e) => {
            e.stopPropagation()
            go('home')
          }}
        >
          {t('intro.skip')}
        </button>
      </div>
      <div ref={page} className="absolute inset-0 grid place-items-center">
        <div data-page className="paper w-[620px] max-w-[88%] px-10 pb-8 pt-10">
          <p className="hud-label">{t('intro.notebook')}</p>
          <p key={scene} data-line className="paper-title mt-3 min-h-[7.5rem] text-[28px] leading-snug">
            {t(`intro.scene.${scene}` as StringKey)}
          </p>
          <p key={`h${scene}`} data-hand className="paper-hand mt-4 text-right text-2xl">
            {t(`intro.hand.${scene}` as StringKey)}
          </p>
          <div className="mt-6 flex items-center gap-2">
            {Array.from({ length: SCENES }, (_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === scene ? 'w-8 bg-[#b5452b]' : 'w-3 bg-[#d8c8a8]'}`} />
            ))}
            {last ? (
              <button
                type="button"
                className="btn-primary ml-auto px-5 py-2 text-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  go('home')
                }}
              >
                {t('intro.start')}
              </button>
            ) : (
              <span className="ml-auto text-xs text-[#7a6450]">{t('intro.tap')}</span>
            )}
          </div>
        </div>
        {scene >= SCENES - 2 && (
          <div data-kuntur className="absolute right-[9%] top-[16%]">
            <Kuntur mood={last ? 'happy' : 'explaining'} size={170} still={reduce} title={t('guide.kuntur.name')} />
          </div>
        )}
      </div>
      <p className="absolute bottom-6 left-12 max-w-2xl text-[11px] text-white/45">{t('intro.credits')}</p>
    </main>
  )
}

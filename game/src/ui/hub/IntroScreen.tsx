// The intro, "Goicochea and the notebook" (owner's decision, 2026-11-14), as a transmission from the archive over the
// live 3D launch pad at dawn: the camera creeps towards the rocket while five entries of Paulet's notebook arrive, and on
// the last one the rocket lights and lifts off. No people on screen (the earlier video showed Goicochea as a child, and
// the contest forbids any likeness of minors). Without WebGL or with reduced motion, the drawn launch site stands in.
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useMusic } from '../../audio/audio'
import { getScenario } from '../../engine/catalog'
import { resolveLauncher } from '../../engine/launch'
import { useT, type StringKey } from '../../i18n'
import { useGame } from '../../store/game'
import { useReducedMotion } from '../../store/settings'
import { PauletLogo } from '../brand/PauletLogo'
import { Kuntur } from '../guide/robots'
import { makeTimeline } from '../launch/LaunchSequence'
import { LAUNCHERS_3D } from '../launch/three/ascent'
import { webglAvailable } from '../launch/three/support'
import { spacecraftVisual } from '../spacecraft/visual'
import { MenuBackdrop } from './HomeScreen'

gsap.registerPlugin(ScrambleTextPlugin)
const LaunchScene3D = lazy(() => import('../launch/three/LaunchScene3D'))

const SCENES = 5
const SCENE_SECONDS = 6.5

export function IntroScreen() {
  const go = useGame((s) => s.go)
  const t = useT()
  const reduce = useReducedMotion()
  useMusic('home')
  const [scene, setScene] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const last = scene === SCENES - 1

  // the live pad: the earth-watch launcher at dawn, its clock driven by the intro
  const design = getScenario('earth_watch').baseDesign
  const launcher = resolveLauncher(design)
  const visual = useMemo(() => spacecraftVisual(design), [design])
  const T = useMemo(() => makeTimeline(10, 3), [])
  const tRef = useRef(0)
  const use3D = !reduce && LAUNCHERS_3D.has(launcher.id) && webglAvailable()
  const sceneRef = useRef(scene)
  sceneRef.current = scene
  useEffect(() => {
    if (!use3D) return
    let raf = 0
    let prev = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      // the countdown creeps on (service arms swing away near the end); the last entry lights the engines
      const cap = sceneRef.current === SCENES - 1 ? T.liftoff + 7 * T.pace : T.ignition - 1.2
      const rate = sceneRef.current === SCENES - 1 ? 1 : 0.32
      tRef.current = Math.min(cap, tRef.current + dt * rate)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [use3D, T])

  // each entry stays a few seconds; a click or Enter moves on sooner
  useEffect(() => {
    if (last) return
    const id = window.setTimeout(() => setScene((s) => Math.min(SCENES - 1, s + 1)), SCENE_SECONDS * 1000)
    return () => window.clearTimeout(id)
  }, [scene, last])

  // transitions: the card opens with a signal flicker; every new entry arrives through interference and decodes
  useGSAP(
    () => {
      if (reduce) return
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      if (scene === 0)
        tl.from('[data-card]', { x: -60, opacity: 0, duration: 0.9 })
          .from('[data-card]', { filter: 'brightness(2.2)', duration: 0.5, ease: 'steps(5)' }, 0.1)
          .from('[data-logo]', { opacity: 0, y: -12, duration: 0.8 }, 0.2)
      tl.fromTo('[data-noise]', { opacity: 0.75 }, { opacity: 0, duration: 0.45, ease: 'power2.out' }, scene === 0 ? 0.5 : 0)
        .fromTo('[data-ref]', { opacity: 0 }, { opacity: 1, duration: 0.3 }, '<')
        .to('[data-line]', { duration: 1.6, scrambleText: { text: t(`intro.scene.${scene}` as StringKey), chars: 'upperAndLowerCase', revealDelay: 0.25, speed: 0.6 } }, '<0.1')
        .fromTo('[data-quote]', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.5')
        .fromTo('[data-bar]', { scaleX: 0 }, { scaleX: 1, duration: SCENE_SECONDS - 0.2, ease: 'none', transformOrigin: 'left center' }, 0)
      if (scene === SCENES - 2) tl.from('[data-kuntur]', { x: 260, y: -140, rotate: 18, opacity: 0, duration: 1.4, ease: 'power2.out' }, 0.2)
    },
    { scope: root, dependencies: [scene, reduce], revertOnUpdate: true },
  )

  const next = () => (last ? go('home') : setScene(scene + 1))

  return (
    <main ref={root} className="relative h-full overflow-hidden text-white" onClick={next} onKeyDown={(e) => e.key === 'Enter' && next()}>
      {use3D ? (
        <div className="absolute inset-0">
          <Suspense fallback={<MenuBackdrop />}>
            <LaunchScene3D launcherId={launcher.id} light="dawn" T={T} tRef={tRef} failAt={null} visual={visual} />
          </Suspense>
        </div>
      ) : (
        <MenuBackdrop />
      )}
      {/* letterbox and a soft vignette: a film frame, not a menu */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[58px] bg-black/85" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[58px] bg-black/85" />
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 60% 45%, transparent 45%, rgb(0 0 0 / 0.55))' }} />

      <div data-logo className="absolute left-16 top-[84px]">
        <PauletLogo height={30} />
        <p className="deck-font mt-2 text-[13px] uppercase tracking-[0.3em] text-[#d9b46a]">{t('intro.place')}</p>
      </div>
      <button
        type="button"
        className="deck-btn absolute right-16 top-[84px]"
        onClick={(e) => {
          e.stopPropagation()
          go('home')
        }}
      >
        {t('intro.skip')} ▸▸
      </button>

      {/* the transmission: bottom left, clear of the rocket in the middle of the frame */}
      <div data-card className="log-card absolute bottom-[86px] left-16 w-[600px]">
        <div className="log-head">
          <span className="log-dot" aria-hidden="true" />
          <span>{t('intro.notebook')}</span>
          <span className="ml-auto text-[12px] tracking-wider text-[#8a8f98]">
            {scene + 1} / {SCENES}
          </span>
        </div>
        <div className="relative z-[1] px-6 pb-5 pt-4">
          <p data-ref key={`r${scene}`} className="deck-font text-[13px] uppercase tracking-[0.18em] text-[#d9b46a]">
            {t(`intro.ref.${scene}` as StringKey)}
          </p>
          <p data-line key={`l${scene}`} className="log-title mt-2 min-h-[6.9rem] text-[26px]">
            {reduce ? t(`intro.scene.${scene}` as StringKey) : ''}
          </p>
          <p data-quote key={`q${scene}`} className="log-quote mt-3 text-[19px]">
            {t(`intro.hand.${scene}` as StringKey)}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="relative h-[3px] flex-1 overflow-hidden bg-[#2c3036]">
              <div data-bar key={`b${scene}`} className="absolute inset-0 bg-[#d9b46a]" style={reduce ? undefined : { transform: 'scaleX(0)' }} />
            </div>
            {last ? (
              <button
                type="button"
                className="btn-primary px-5 py-2 text-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  go('home')
                }}
              >
                {t('intro.start')}
              </button>
            ) : (
              <span className="deck-font text-[13px] uppercase tracking-wider text-[#8a8f98]">{t('intro.tap')}</span>
            )}
          </div>
        </div>
        <div data-noise className="deck-noise pointer-events-none absolute inset-0 z-[2] opacity-0" />
      </div>

      {scene >= SCENES - 2 && (
        <div data-kuntur className="pointer-events-none absolute right-[10%] top-[18%]">
          <Kuntur mood={last ? 'happy' : 'explaining'} size={150} still={reduce} title={t('guide.kuntur.name')} />
        </div>
      )}
      <p className="deck-font absolute bottom-[18px] left-16 right-16 text-[12px] tracking-wide text-white/55">{t('intro.credits')}</p>
    </main>
  )
}

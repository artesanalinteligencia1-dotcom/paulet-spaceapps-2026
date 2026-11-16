// Interface choreography with GSAP (design notes kept in the PP.game repo). Every effect is skipped when the player
// asks for reduced motion, and every tween is reverted on unmount, so screens never stay half-animated.
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import type { RefObject } from 'react'
import { useReducedMotion } from '../store/settings'

gsap.registerPlugin(useGSAP)

/** Cards marked `data-reveal` rise in one after another whenever `key` changes (a new tab, a new screen). */
export function useReveal(scope: RefObject<HTMLElement | null>, key: unknown) {
  const reduce = useReducedMotion()
  useGSAP(
    () => {
      if (reduce) return
      const items = scope.current?.querySelectorAll('[data-reveal]')
      if (!items?.length) return
      gsap.from(items, { y: 18, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out', clearProps: 'transform,opacity' })
    },
    { scope, dependencies: [key, reduce], revertOnUpdate: true },
  )
}

/** A number that counts up to its value the first time it is shown (scores, totals). */
export function useCountUp(ref: RefObject<HTMLElement | null>, value: number, format: (n: number) => string, delay = 0) {
  const reduce = useReducedMotion()
  useGSAP(
    () => {
      const el = ref.current
      if (!el) return
      if (reduce) {
        el.textContent = format(value)
        return
      }
      const o = { v: 0 }
      gsap.to(o, { v: value, duration: 1.4, delay, ease: 'power2.out', onUpdate: () => (el.textContent = format(o.v)) })
    },
    { dependencies: [value, reduce] },
  )
}

/** A timeline for a whole screen, built by `build` once the screen is mounted. */
export function useChoreography(scope: RefObject<HTMLElement | null>, build: (tl: gsap.core.Timeline) => void, deps: unknown[] = []) {
  const reduce = useReducedMotion()
  useGSAP(
    () => {
      if (reduce) return
      build(gsap.timeline({ defaults: { ease: 'power3.out' } }))
    },
    { scope, dependencies: [reduce, ...deps], revertOnUpdate: true },
  )
}

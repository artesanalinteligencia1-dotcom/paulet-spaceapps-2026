// The game stage: a fixed 16:9 canvas (1440×810 design pixels) zoomed to fit the window, with letterbox bars.
// Screens scroll inside the stage when they are taller than it; the page itself never scrolls.
import { useEffect, useState, type ReactNode } from 'react'
import { audio } from '../../audio/audio'
import { useSettings } from '../../store/settings'
import { useT } from '../../i18n'

export const STAGE_W = 1440
export const STAGE_H = 810

/** The area really visible: on phones the browser bars come and go, and visualViewport knows the current size. */
function viewSize() {
  const v = window.visualViewport
  return { w: v?.width ?? window.innerWidth, h: v?.height ?? window.innerHeight }
}

function fit() {
  if (typeof window === 'undefined') return 1
  const { w, h } = viewSize()
  return Math.min(w / STAGE_W, h / STAGE_H)
}

/** Phones and tablets (touch screen, no fine pointer). */
const isTouchDevice = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches
const isPortrait = () => typeof window !== 'undefined' && viewSize().h > viewSize().w

/** On the first touch: full screen (hides the browser bars) and landscape lock, where the browser allows it
 *  (Android Chrome; iPhone Safari ignores both, so the "turn your device" notice does the job there). */
let triedLock = false
function enterLandscape() {
  if (triedLock || !isTouchDevice()) return
  triedLock = true
  const el = document.documentElement
  const lock = () => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('landscape').catch(() => undefined)
  if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).then(lock, () => undefined)
  else void lock()
}

export function Stage({ children }: { children: ReactNode }) {
  const t = useT()
  const [scale, setScale] = useState(fit)
  const [portrait, setPortrait] = useState(() => isTouchDevice() && isPortrait())
  const uiSounds = useSettings((s) => s.uiSounds)
  useEffect(() => {
    const on = () => {
      setScale(fit())
      setPortrait(isTouchDevice() && isPortrait())
    }
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    window.visualViewport?.addEventListener('resize', on)
    window.addEventListener('pointerdown', enterLandscape)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
      window.visualViewport?.removeEventListener('resize', on)
      window.removeEventListener('pointerdown', enterLandscape)
    }
  }, [])
  // Interface sounds come from real input events (never from animation frames).
  const isControl = (el: EventTarget | null) => el instanceof Element && el.closest('button:not(:disabled), [role="button"], a[href], select, input[type="range"]')
  return (
    <div className="fixed inset-0 grid place-items-center overflow-hidden bg-black">
      <div
        id="stage"
        className="stage relative overflow-clip bg-[#020617]"
        style={{ width: STAGE_W, height: STAGE_H, zoom: scale }}
        onPointerOver={(e) => {
          if (!uiSounds || e.pointerType !== 'mouse') return
          const el = isControl(e.target)
          if (el && el !== isControl(e.relatedTarget)) audio.ui('hover')
        }}
        onClickCapture={(e) => {
          if (!uiSounds) return
          const el = isControl(e.target)
          if (el) audio.ui(el.getAttribute('data-sound') === 'back' ? 'back' : 'click')
        }}
      >
        {children}
      </div>
      {portrait && (
        // phones and tablets held upright: the game is played in landscape
        <div role="alertdialog" aria-modal="true" aria-labelledby="rotate-title" className="fixed inset-0 z-[100] grid place-items-center bg-[#020617] p-8 text-center">
          <div>
            <div className="rotate-hint mx-auto mb-6 h-24 w-14 rounded-xl border-4 border-[#d9b46a]" aria-hidden="true" />
            <h2 id="rotate-title" className="font-display text-2xl text-[#e8e0cc]">{t('mobile.rotate.title')}</h2>
            <p className="mt-2 text-base text-slate-400">{t('mobile.rotate.hint')}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// "The real story": the short educational films (one per mission, one before each act). The MP4s are clean (no burned
// captions) and live in public/videos, outside the offline precache; the player overlays the .vtt in the chosen
// language with the console caption look, so one file serves English and Spanish.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT, type StringKey } from '../../i18n'
import { useSettings } from '../../store/settings'

/** Films that exist in public/videos (<id>.mp4 + <id>.en.vtt + <id>.es.vtt). */
export const REAL_STORIES = [
  'first_light', 'earth_watch', 'andean_eye', 'station_resupply', 'storm_tracker',
  'lunar_pathfinder', 'lagrange_observatory', 'mars_orbiter', 'mars_stranded', 'mars_oxygen', 'mars_terraform',
] as const
export const ACT_FILMS = ['prologue', 'act1', 'act2', 'act3', 'act4'] as const
const READY = new Set<string>(['prologue', 'act1', 'act2', 'act3', 'act4', 'first_light', 'earth_watch', 'andean_eye', 'station_resupply', 'storm_tracker', 'lunar_pathfinder', 'lagrange_observatory'])

export const hasRealStory = (id: string) => READY.has(id)
export const readyFilms = (ids: readonly string[]) => ids.filter((id) => READY.has(id))

interface Cue { start: number; end: number; who?: string; text: string }

const stamp = (s: string) => { const p = s.trim().split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1] }

export function parseVtt(src: string): Cue[] {
  const out: Cue[] = []
  for (const block of src.replace(/\r/g, '').split(/\n\n+/)) {
    const lines = block.split('\n').filter(Boolean)
    const i = lines.findIndex((l) => l.includes('-->'))
    if (i < 0) continue
    const [a, b] = lines[i].split('-->')
    let text = lines.slice(i + 1).join(' ')
    let who: string | undefined
    const v = /^<v ([^>]+)>/.exec(text)
    if (v) { who = v[1]; text = text.slice(v[0].length) }
    out.push({ start: stamp(a), end: stamp(b.split(' ').filter(Boolean)[0]), who, text: text.replace(/<[^>]+>/g, '') })
  }
  return out
}

const url = (f: string) => `${import.meta.env.BASE_URL}videos/${f}`

export function RealStoryPlayer({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useT()
  const language = useSettings((s) => s.language)
  const [lang, setLang] = useState<'en' | 'es' | 'off'>(language === 'es' ? 'es' : 'en')
  const [cues, setCues] = useState<Cue[]>([])
  const [cue, setCue] = useState<Cue | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  const close = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (lang === 'off') { setCues([]); return }
    let alive = true
    fetch(url(`${id}.${lang}.vtt`)).then((r) => (r.ok ? r.text() : '')).then((s) => alive && setCues(parseVtt(s))).catch(() => alive && setCues([]))
    return () => { alive = false }
  }, [id, lang])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const v = video.current
      if (v) { const now = v.currentTime; const c = cues.find((q) => now >= q.start && now < q.end) ?? null; setCue((p) => (p === c ? p : c)) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [cues])

  useEffect(() => {
    close.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label={t('video.title')}>
      <div className="w-full" style={{ maxWidth: "min(1280px, calc((100vh - 80px) * 16 / 9))" }}>
        <div className="mb-2 flex items-center gap-3">
          <span className="hud-label">{t('video.title')}</span>
          <span className="text-[15px] text-[#e8e0cc]">{t(`video.name.${id}` as StringKey)}</span>
          <div className="ml-auto flex items-center gap-1" role="group" aria-label={t('video.subtitles')}>
            <span className="mr-1 text-[12px] uppercase tracking-wider text-[#8a8f98]">{t('video.subtitles')}</span>
            {(['es', 'en', 'off'] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
                className={`border px-2 py-0.5 text-[12px] uppercase tracking-wider ${lang === l ? 'border-[#d9b46a] text-[#d9b46a]' : 'border-[#3a3f47] text-[#8a8f98] hover:text-[#e8e0cc]'}`}>
                {l === 'off' ? t('video.off') : l}
              </button>
            ))}
            <button ref={close} type="button" onClick={onClose} className="btn-secondary ml-3 px-3 py-1 text-[13px]">{t('video.close')}</button>
          </div>
        </div>
        <div className="relative aspect-video w-full overflow-hidden border border-[#3a3f47] bg-black">
          <video ref={video} className="h-full w-full" src={url(`${id}.mp4`)} controls autoPlay playsInline preload="metadata" />
          {cue && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[12%] flex justify-center px-6" aria-live="polite">
              <p className="max-w-[86%] rounded bg-[#0b0d10]/85 px-4 py-1.5 text-center font-display text-[clamp(15px,2.3vw,30px)] leading-snug text-[#f4efe2]">
                {cue.who && <span className="mr-1.5 font-semibold tracking-wider text-[#f08a3c]">{cue.who.toUpperCase()}:</span>}
                {cue.text}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function RealStoryButton({ id, className = '', label }: { id: string; className?: string; label?: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  if (!hasRealStory(id)) return null
  return (
    <>
      <button type="button" className={`btn-secondary px-3 py-1.5 text-[14px] ${className}`} onClick={() => setOpen(true)}>
        ▶ {label ?? t('video.watch')}
      </button>
      {open && <RealStoryPlayer id={id} onClose={() => setOpen(false)} />}
    </>
  )
}

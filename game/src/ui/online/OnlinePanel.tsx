// Mission tab: create an online room and invite the team with a link; who is in the room and which roles they hold.
import { useState } from 'react'
import { getScenario, scenarios } from '../../engine/catalog'
import { TEAM_ROLES } from '../../engine/team'
import type { Design } from '../../engine/types'
import { useT, useTx, type StringKey } from '../../i18n'
import { KUNTUR, MAX_PLAYERS, parseRoomCode, rolesOf } from '../../online/room'
import { firebaseConfigured, getTransport } from '../../online/transport'
import { roomLink, useOnline } from '../../store/online'

export function OnlinePanel({ design }: { design: Design }) {
  const t = useT()
  const { room, code, me, create, leave } = useOnline()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const local = getTransport().kind === 'local'

  if (!room || !code)
    return (
      <div className="rounded-lg border border-violet-400/40 p-3">
        <div className="hud-label text-violet-300">{t('online.title')}</div>
        <p className="mt-1 text-xs text-slate-400">{t('online.hint', { max: MAX_PLAYERS })}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 24))}
            placeholder={t('online.yourName')}
            aria-label={t('online.yourName')}
            className="w-48 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
          />
          <button
            type="button"
            className="btn-primary px-3 py-1 text-xs"
            disabled={busy || !name.trim()}
            onClick={async () => {
              setBusy(true)
              try {
                await create(name, design)
              } finally {
                setBusy(false)
              }
            }}
          >
            {t('online.create')}
          </button>
        </div>
        {local && <p className="mt-2 text-[11px] text-amber-300">{firebaseConfigured ? t('online.localForced') : t('online.localOnly')}</p>}
      </div>
    )

  const link = roomLink(code)
  const players = Object.entries(room.players ?? {}).sort((a, b) => a[1].order - b[1].order)
  return (
    <div className="rounded-lg border border-violet-400/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="hud-label text-violet-300">{t('online.room', { code })}</span>
        <input readOnly value={link} aria-label={t('online.link')} className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs" onFocus={(e) => e.target.select()} />
        <button
          type="button"
          className="btn-secondary px-3 py-1 text-xs"
          onClick={() => {
            void navigator.clipboard?.writeText(link)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 2000)
          }}
        >
          {copied ? t('online.copied') : t('online.copy')}
        </button>
        <button type="button" className="text-xs text-slate-400 hover:text-white" onClick={leave}>
          {t('online.leave')}
        </button>
      </div>
      <ul className="mt-2 flex flex-wrap gap-2 text-xs">
        {players.map(([id, p]) => {
          const roles = rolesOf(room, id)
          return (
            <li key={id} className={`rounded border px-2 py-1 ${id === me ? 'border-violet-400 text-violet-100' : 'border-slate-700 text-slate-300'}`}>
              <span className="font-semibold">{p.name}</span>
              {id === room.host && <span className="ml-1 text-slate-500">· {t('online.host')}</span>}
              {id === me && <span className="ml-1 text-slate-500">· {t('online.you')}</span>}
              <span className="ml-1 text-slate-400">
                — {roles.length ? roles.map((r) => t(`character.${r}.name` as StringKey)).join(', ') : t('online.noRole')}
              </span>
            </li>
          )
        })}
        {TEAM_ROLES.some((r) => room.holders[r] === KUNTUR) && (
          <li className="rounded border border-sky-500/40 px-2 py-1 text-sky-200">
            Kuntur — {TEAM_ROLES.filter((r) => room.holders[r] === KUNTUR).map((r) => t(`character.${r}.name` as StringKey)).join(', ')}
          </li>
        )}
      </ul>
      <p className="mt-2 text-[11px] text-slate-500">{t('online.rules')}</p>
    </div>
  )
}

/** Main menu → Play online: create a room for any mission, or join one with its code. */
export function OnlineLobby({ onClose }: { onClose: () => void }) {
  const t = useT()
  const tx = useTx()
  const { create, join, status } = useOnline()
  const [name, setName] = useState('')
  const [mission, setMission] = useState(scenarios[0].id)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<'create' | 'join' | null>(null)
  const local = getTransport().kind === 'local'
  const parsed = parseRoomCode(code)
  const picked = getScenario(mission)

  return (
    <div role="dialog" aria-modal="true" aria-label={t('online.title')} className="absolute inset-0 z-[58] grid place-items-center bg-slate-950/80 backdrop-blur-sm" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="hud-panel w-[860px] max-w-[94%] p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="hud-label text-violet-300">{t('online.title')}</div>
            <h2 className="mt-1 font-display text-3xl">{t('online.lobby.title')}</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-400">{t('online.hint', { max: MAX_PLAYERS })}</p>
          </div>
          <button type="button" data-sound="back" className="text-sm text-slate-400 hover:text-white" onClick={onClose}>
            {t('online.join.cancel')}
          </button>
        </div>
        <label className="mt-4 block text-sm">
          <span className="hud-label">{t('online.yourName')}</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 24))}
            placeholder={t('online.yourName')}
            className="mt-1 w-72 rounded border border-slate-700 bg-slate-900 px-3 py-2"
          />
        </label>
        <div className="mt-5 grid grid-cols-[3fr_2fr] gap-6">
          <section>
            <h3 className="font-display text-xl">{t('online.lobby.create')}</h3>
            <p className="text-xs text-slate-400">{t('online.lobby.pick')}</p>
            <div className="mt-2 grid max-h-[300px] grid-cols-2 gap-2 overflow-y-auto pr-1" role="radiogroup" aria-label={t('online.lobby.pick')}>
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={mission === s.id}
                  onClick={() => setMission(s.id)}
                  className={`rounded-lg border p-2 text-left transition ${mission === s.id ? 'border-violet-400 bg-violet-500/10' : 'border-slate-700 hover:border-slate-500'}`}
                >
                  <span className="block text-sm font-semibold">{tx(`scenario.${s.id}.name`, s.name)}</span>
                  <span className="block text-[11px] text-slate-400">{t(`difficulty.${s.difficulty}` as StringKey)} · ${s.budgetM} M</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-sky-300">{tx(`scenario.${picked.id}.tagline`, picked.tagline)}</p>
            <button
              type="button"
              className="btn-primary mt-3 px-4 py-2 text-sm"
              disabled={!name.trim() || busy !== null}
              onClick={async () => {
                setBusy('create')
                try {
                  await create(name, structuredClone(picked.baseDesign))
                } finally {
                  setBusy(null)
                }
              }}
            >
              {t('online.create')}
            </button>
          </section>
          <section className="border-l border-white/10 pl-6">
            <h3 className="font-display text-xl">{t('online.lobby.join')}</h3>
            <p className="text-xs text-slate-400">{t('online.lobby.codeHint')}</p>
            <form
              className="mt-2"
              onSubmit={async (e) => {
                e.preventDefault()
                if (!parsed || !name.trim()) return
                setBusy('join')
                try {
                  await join(parsed, name)
                } finally {
                  setBusy(null)
                }
              }}
            >
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.slice(0, 200))}
                placeholder="ABC234"
                aria-label={t('online.lobby.code')}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-lg uppercase tracking-[0.3em]"
              />
              {status === 'missing' && busy === null && code && <p className="mt-2 text-sm text-rose-300">{t('online.join.missing')}</p>}
              {status === 'full' && <p className="mt-2 text-sm text-rose-300">{t('online.join.full', { max: MAX_PLAYERS })}</p>}
              <button type="submit" className="btn-secondary mt-3 px-4 py-2 text-sm" disabled={!parsed || !name.trim() || busy !== null}>
                {t('online.join.go')}
              </button>
            </form>
          </section>
        </div>
        {local && <p className="mt-4 text-[11px] text-amber-300">{firebaseConfigured ? t('online.localForced') : t('online.localOnly')}</p>}
      </div>
    </div>
  )
}

/** Opening an invitation link: the player writes a name and joins the room. */
export function JoinRoom() {
  const t = useT()
  const { pendingCode, status, join } = useOnline()
  const [name, setName] = useState('')
  if (!pendingCode || status === 'in-room') return null
  return (
    <div role="dialog" aria-modal="true" aria-label={t('online.join.title')} className="absolute inset-0 z-[58] grid place-items-center bg-slate-950/80 backdrop-blur-sm">
      <form
        className="hud-panel w-[460px] p-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) void join(pendingCode, name)
        }}
      >
        <div className="hud-label text-violet-300">{t('online.title')}</div>
        <h2 className="mt-1 font-display text-2xl">{t('online.join.title')}</h2>
        <p className="mt-1 text-sm text-slate-400">{t('online.join.hint', { code: pendingCode })}</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 24))}
          placeholder={t('online.yourName')}
          aria-label={t('online.yourName')}
          className="mt-3 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
        />
        {status === 'missing' && <p className="mt-2 text-sm text-rose-300">{t('online.join.missing')}</p>}
        {status === 'full' && <p className="mt-2 text-sm text-rose-300">{t('online.join.full', { max: MAX_PLAYERS })}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => useOnline.setState({ pendingCode: null })}>
            {t('online.join.cancel')}
          </button>
          <button type="submit" className="btn-primary px-4 py-2 text-sm" disabled={!name.trim() || status === 'joining'}>
            {t('online.join.go')}
          </button>
        </div>
      </form>
    </div>
  )
}

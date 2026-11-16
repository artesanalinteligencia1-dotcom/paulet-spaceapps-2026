// Online: play again together. Any player can ask the team to play the same mission again or to fly another one; the
// others accept (and stay) or decline (and leave the room). The team goes back to the design table once everyone still
// in the room has accepted.
import { useState } from 'react'
import { getScenario, scenarios } from '../../engine/catalog'
import { useT, useTx, type StringKey } from '../../i18n'
import { notAnswered } from '../../online/room'
import { useOnline } from '../../store/online'

/** The question on every other player's screen, and "waiting for…" for the ones who already answered. */
export function NextProposal() {
  const t = useT()
  const tx = useTx()
  const room = useOnline((s) => s.room)
  const me = useOnline((s) => s.me)
  const next = room?.next
  if (!room || !next || next.done) return null
  const scenario = getScenario(next.scenarioId)
  const mission = tx(`scenario.${scenario.id}.name`, scenario.name)
  const from = room.players?.[next.from]?.name ?? '?'
  const pending = notAnswered(room)
  if (next.answers?.[me])
    return pending.length ? (
      <div role="status" className="absolute inset-x-0 top-3 z-[60] mx-auto w-fit max-w-[90%] border border-violet-400/60 bg-[#0d0f12]/95 px-4 py-2 text-sm text-violet-200">
        {t('online.next.waiting', { names: pending.map((id) => room.players?.[id]?.name ?? '?').join(', ') })}
      </div>
    ) : null
  return (
    <div role="dialog" aria-modal="true" aria-label={t('online.next.title')} className="absolute inset-0 z-[60] grid place-items-center bg-slate-950/75 p-6 backdrop-blur-sm">
      <div className="hud-panel w-[520px] max-w-full p-6">
        <div className="hud-label text-violet-300">{t('online.next.title')}</div>
        <p className="mt-2 text-lg">{t(next.kind === 'again' ? 'online.next.again' : 'online.next.mission', { name: from, mission })}</p>
        <p className="mt-1 text-xs text-slate-400">{t('online.next.hint')}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => useOnline.getState().answerNext(false)}>
            {t('online.next.no')}
          </button>
          <button type="button" autoFocus className="btn-primary px-4 py-2 text-sm" onClick={() => useOnline.getState().answerNext(true)}>
            {t('online.next.yes')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Results screen, online: play again together, or pick another mission for the team. */
export function PlayAgainTogether() {
  const t = useT()
  const tx = useTx()
  const room = useOnline((s) => s.room)
  const [picking, setPicking] = useState(false)
  const [mission, setMission] = useState<string>(room?.scenarioId ?? scenarios[0].id)
  if (!room) return null
  const busy = !!room.next && !room.next.done
  const propose = useOnline.getState().propose
  return (
    <>
      <button type="button" disabled={busy} onClick={() => propose('again', room.scenarioId)} className="btn-primary px-4 py-2 disabled:opacity-40">
        {t('online.again')}
      </button>
      <button type="button" disabled={busy} onClick={() => setPicking(true)} className="rounded-lg border border-violet-400/60 px-4 py-2 text-violet-200 hover:border-violet-300 disabled:opacity-40">
        {t('online.another')}
      </button>
      {picking && (
        <div role="dialog" aria-modal="true" aria-label={t('online.pickMission')} className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/75 p-6">
          <div className="hud-panel w-[640px] max-w-full p-5">
            <div className="hud-label text-violet-300">{t('online.pickMission')}</div>
            <div className="mt-3 grid max-h-[320px] grid-cols-2 gap-2 overflow-y-auto pr-1" role="radiogroup" aria-label={t('online.pickMission')}>
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
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => setPicking(false)}>
                {t('online.cancel')}
              </button>
              <button
                type="button"
                className="btn-primary px-4 py-2 text-sm"
                onClick={() => {
                  setPicking(false)
                  propose(mission === room.scenarioId ? 'again' : 'mission', mission)
                }}
              >
                {t('online.propose')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

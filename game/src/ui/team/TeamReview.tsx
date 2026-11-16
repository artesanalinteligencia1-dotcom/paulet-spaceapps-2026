// The design review before launch: every role votes. Three approvals and no veto send the design to the launch pad;
// otherwise it goes back to the table. Kuntur votes for the roles it holds and says why.
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { TEAM_ROLES, kunturVote, reviewPasses, roleGoals, withinShares, type Vote } from '../../engine/team'
import type { Design, DesignReport, Role, Scenario } from '../../engine/types'
import { useT, type StringKey } from '../../i18n'
import { useGame } from '../../store/game'
import { useTeam } from '../../store/team'
import { useOnline } from '../../store/online'
import { launcherOf } from '../../online/room'
import { Kuntur } from '../guide/robots'
import { ROLE_ICON } from '../tabs/MissionTab'
import { GoalLine, holderLabel } from './TeamPanel'

export function TeamReview({ design, report, scenario, onClose }: { design: Design; report: DesignReport; scenario: Scenario; onClose: () => void }) {
  const t = useT()
  const team = useTeam((s) => s.team)!
  const recordReview = useTeam((s) => s.recordReview)
  const goToLaunchPad = useGame((s) => s.goToLaunchPad)
  const goals = useMemo(() => roleGoals(design, report, scenario), [design, report, scenario])
  const within = useMemo(() => withinShares(design, report, scenario, team.split), [design, report, scenario, team.split])
  const bot = useMemo(
    () => Object.fromEntries(TEAM_ROLES.filter((r) => team.holders[r] === 0).map((r) => [r, kunturVote(goals[r], within[r], report)])) as Partial<Record<Role, ReturnType<typeof kunturVote>>>,
    [goals, within, report, team.holders],
  )
  const [localVotes, setLocalVotes] = useState<Partial<Record<Role, Vote>>>(() => Object.fromEntries(Object.entries(bot).map(([r, v]) => [r, v!.vote])))
  const [localResult, setResult] = useState<null | boolean>(null)
  // online: the votes and the result live in the room; each device votes only for the roles its player holds
  const room = useOnline((s) => s.room)
  const me = useOnline((s) => s.me)
  const onlineVote = useOnline((s) => s.vote)
  const launchTogether = useOnline((s) => s.launchTogether)
  const votes = room ? (room.review?.votes ?? {}) : localVotes
  const result = room ? (room.review?.result ? room.review.result === 'passed' : null) : localResult
  const setVotes = (next: Partial<Record<Role, Vote>>) => {
    if (!room) return setLocalVotes(next)
    for (const r of TEAM_ROLES) if (next[r] !== votes[r] && next[r]) onlineVote(r, next[r]!)
  }
  const canVote = (r: Role) => (room ? room.holders[r] === me : team.holders[r] !== 0)
  const hostName = room ? (room.players?.[launcherOf(room)]?.name ?? '') : ''
  const ready = TEAM_ROLES.every((r) => votes[r])
  const count = () => {
    const all = votes as Record<Role, Vote>
    const passed = reviewPasses(all, report)
    recordReview(passed, all, design, report)
    setResult(passed)
  }
  const approvals = TEAM_ROLES.filter((r) => votes[r] === 'approve').length
  // drawn over the whole stage (like Settings), not inside the scrolling screen
  const host = document.querySelector('.hud') ?? document.body
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t('team.review.title')} className="absolute inset-0 z-[55] grid place-items-center bg-slate-950/80 p-6 backdrop-blur-sm">
      <div className="hud-panel w-[860px] max-w-full p-6">
        <div className="hud-label">{t('team.review.kicker')}</div>
        <h2 className="mt-1 font-display text-2xl">{t('team.review.title')}</h2>
        <p className="mt-1 text-sm text-slate-400">{t('team.review.hint')}</p>
        <div className="mt-4 space-y-2">
          {TEAM_ROLES.map((r) => {
            const h = team.holders[r]
            const k = bot[r]
            const vetoUsed = team.vetoesUsed.includes(r)
            return (
              <div key={r} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-4 rounded-lg border border-slate-800 p-3">
                <div className="flex items-center gap-2">
                  {h === 0 ? <Kuntur mood={k?.vote === 'approve' ? 'happy' : 'worried'} size={40} still /> : <span className="text-lg">{ROLE_ICON[r]}</span>}
                  <div>
                    <div className="text-sm font-semibold">{t(`role.${r}.name` as StringKey)}</div>
                    <div className="text-xs text-slate-400">{holderLabel(t, h)}</div>
                  </div>
                </div>
                <div className="min-w-0 space-y-1">
                  <GoalLine goal={goals[r]} compact />
                  <div className={`text-xs ${within[r] ? 'text-slate-400' : 'text-rose-300'}`}>{within[r] ? t('team.review.withinShare') : t('team.review.overShare')}</div>
                  {k && <div className="text-xs text-sky-300">{t(`team.kuntur.${k.reason}` as StringKey)}</div>}
                </div>
                <div className="flex gap-1">
                  {(['approve', 'reject', 'veto'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      disabled={!canVote(r) || result !== null || (v === 'veto' && vetoUsed)}
                      aria-pressed={votes[r] === v}
                      onClick={() => setVotes({ ...votes, [r]: v })}
                      title={v === 'veto' && vetoUsed ? t('team.vote.vetoUsed') : undefined}
                      className={`rounded border px-2.5 py-1 text-xs disabled:cursor-not-allowed ${
                        votes[r] === v
                          ? v === 'approve'
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                            : v === 'reject'
                              ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                              : 'border-rose-400 bg-rose-500/20 text-rose-200'
                          : 'border-slate-700 text-slate-300 hover:border-slate-500 disabled:opacity-40'
                      }`}
                    >
                      {t(`team.vote.${v}` as StringKey)}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        {result === null ? (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs text-slate-400">{t('team.review.rule')}</span>
            <button type="button" className="btn-secondary ml-auto px-4 py-2 text-sm" onClick={onClose}>
              {t('team.review.cancel')}
            </button>
            {room ? (
              <span className="text-xs text-violet-300">{t('online.waitingVotes')}</span>
            ) : (
              <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={!ready} onClick={count}>
                {t('team.review.count')}
              </button>
            )}
          </div>
        ) : (
          <div className={`mt-4 rounded-lg border p-3 ${result ? 'border-emerald-500/50' : 'border-rose-500/50'}`}>
            <p className="text-sm font-semibold">{result ? t('team.review.passed', { n: approvals }) : t('team.review.failed', { n: approvals })}</p>
            <p className="mt-1 text-xs text-slate-400">{result ? t('team.review.passedHint') : t('team.review.failedHint')}</p>
            <div className="mt-3 flex justify-end gap-2">
              {result && room ? (
                launcherOf(room) === me ? (
                  <button
                    type="button"
                    className="btn-primary px-4 py-2 text-sm"
                    onClick={() => {
                      onClose()
                      launchTogether()
                    }}
                  >
                    {t('online.launchTogether')}
                  </button>
                ) : (
                  <span className="text-sm text-violet-300">{t('online.waitingHost', { host: hostName })}</span>
                )
              ) : result ? (
                <button
                  type="button"
                  className="btn-primary px-4 py-2 text-sm"
                  onClick={() => {
                    onClose()
                    goToLaunchPad()
                  }}
                >
                  {t('review.goToLaunchPad')}
                </button>
              ) : (
                <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={onClose}>
                  {t('team.review.backToTable')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    host,
  )
}

// Mission tab: play as a team of up to four, on one device or online. Who holds each role (a player or Kuntur), how
// the money is split by area, and each role's goal (private to its player), plus the group goal. The four roles are
// the characters of Goicochea's team in Arequipa.
import { useState } from 'react'
import { TEAM_ROLES, areaSpendM, envelopesM, groupGoalMet, roleGoals, withinShares, type Holder, type RoleGoal } from '../../engine/team'
import type { Design, DesignReport, Role, Scenario } from '../../engine/types'
import { useT, type StringKey } from '../../i18n'
import { fmt } from '../../i18n/en'
import { KUNTUR } from '../../online/room'
import { useOnline } from '../../store/online'
import { useTeam } from '../../store/team'
import { Kuntur } from '../guide/robots'
import { OnlinePanel } from '../online/OnlinePanel'
import { ROLE_ICON } from '../tabs/MissionTab'
import { Section } from '../components'

/** "Player 2", the player's name when online, or Kuntur. */
export function holderLabel(t: ReturnType<typeof useT>, h: Holder): string {
  if (h === 0) return t('guide.kuntur.name')
  const room = useOnline.getState().room
  const p = room && Object.values(room.players ?? {}).find((x) => x.order === h)
  return p ? p.name : t('team.player', { n: h })
}

export function GoalLine({ goal, compact }: { goal: RoleGoal; compact?: boolean }) {
  const t = useT()
  return (
    <div>
      <div className={`flex items-start gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        <span className={goal.met ? 'text-emerald-400' : 'text-amber-300'}>{goal.met ? '✔' : '○'}</span>
        <span className="text-slate-200">{t(`team.goal.${goal.key}` as StringKey, goal.params)}</span>
      </div>
      <div className="ml-5 mt-1 h-1.5 overflow-hidden rounded bg-slate-800">
        <div className={`h-full ${goal.met ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${Math.round(goal.progress * 100)}%` }} />
      </div>
      {/* what the goal means and which controls move it */}
      <details className="ml-5 mt-1 text-[11px] text-slate-400">
        <summary className="cursor-pointer text-sky-300 hover:text-sky-200">{t('team.goalHow')}</summary>
        <p className="mt-1 leading-snug">{t(`team.goalHow.${goal.key}` as StringKey)}</p>
      </details>
    </div>
  )
}

export function TeamPanel({ design, report, scenario }: { design: Design; report: DesignReport; scenario: Scenario }) {
  const t = useT()
  const team = useTeam((s) => s.team)
  const enable = useTeam((s) => s.enable)
  const disable = useTeam((s) => s.disable)
  const setPlayers = useTeam((s) => s.setPlayers)
  const setHolder = useTeam((s) => s.setHolder)
  const setShare = useTeam((s) => s.setShare)
  const resetSplit = useTeam((s) => s.resetSplit)
  const room = useOnline((s) => s.room)
  const me = useOnline((s) => s.me)
  const setOnlineHolder = useOnline((s) => s.setHolder)
  const [shown, setShown] = useState<Role | null>(null)

  if (!team)
    return (
      <Section title={t('team.title')} hint={t('team.hint')}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-300">{t('team.solo')}</span>
          {([1, 2, 3, 4] as const).map((n) => (
            <button key={n} type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => enable(scenario.id, n)}>
              {t(n === 1 ? 'team.play.one' : 'team.play.many', { n })}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <OnlinePanel design={design} />
        </div>
      </Section>
    )

  const goals = roleGoals(design, report, scenario)
  const spend = areaSpendM(design, report)
  const env = envelopesM(scenario, team.split)
  const within = withinShares(design, report, scenario, team.split)
  const group = groupGoalMet(report)
  const players = room ? Object.entries(room.players ?? {}).sort((a, b) => a[1].order - b[1].order) : []
  return (
    <Section title={t('team.title')} hint={t('team.hint')}>
      {room ? (
        <div className="mb-3">
          <OnlinePanel design={design} />
        </div>
      ) : (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="hud-label">{t('team.players')}</span>
          {([1, 2, 3, 4] as const).map((n) => (
            <button key={n} type="button" aria-pressed={team.players === n} onClick={() => setPlayers(n)} className={team.players === n ? 'btn-primary px-3 py-1 text-xs' : 'btn-secondary px-3 py-1 text-xs'}>
              {n}
            </button>
          ))}
          <button type="button" className="ml-2 text-xs text-slate-400 hover:text-white" onClick={resetSplit}>
            {t('team.resetSplit')}
          </button>
          <button type="button" className="ml-auto text-xs text-slate-400 hover:text-white" onClick={disable}>
            {t('team.backToSolo')}
          </button>
        </div>
      )}
      <div className="space-y-2">
        {TEAM_ROLES.map((r) => {
          const h = team.holders[r]
          const isKuntur = h === 0
          const mine = room ? room.holders[r] === me : true
          const visible = isKuntur || (mine && shown === r)
          const over = !within[r]
          return (
            <div key={r} className={`rounded-lg border p-3 ${over ? 'border-rose-500/50' : mine && room ? 'border-violet-400/50' : 'border-slate-800'}`}>
              <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1.5fr)] items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{ROLE_ICON[r]}</span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {t(`character.${r}.name` as StringKey)} <span className="font-normal text-slate-400">· {t(`role.${r}.name` as StringKey)}</span>
                    </div>
                    <div className="text-[11px] italic leading-snug text-slate-500">{t(`character.${r}.line` as StringKey)}</div>
                    {room ? (
                      <div className="mt-0.5 flex items-center gap-1">
                        <select
                          aria-label={t('team.holder', { role: t(`role.${r}.name` as StringKey) })}
                          value={room.holders[r]}
                          onChange={(e) => setOnlineHolder(r, e.target.value)}
                          className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-xs"
                        >
                          {players.map(([id, p]) => (
                            <option key={id} value={id}>
                              {p.name}
                            </option>
                          ))}
                          <option value={KUNTUR}>{t('guide.kuntur.name')}</option>
                        </select>
                        {!mine && (
                          <button type="button" className="text-[11px] text-violet-300 hover:text-white" onClick={() => setOnlineHolder(r, me)}>
                            {t('online.takeRole')}
                          </button>
                        )}
                      </div>
                    ) : (
                      <select
                        aria-label={t('team.holder', { role: t(`role.${r}.name` as StringKey) })}
                        value={h}
                        onChange={(e) => setHolder(r, Number(e.target.value) as Holder)}
                        className="mt-0.5 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-xs"
                      >
                        {Array.from({ length: team.players }, (_, i) => (i + 1) as Holder).map((n) => (
                          <option key={n} value={n}>
                            {holderLabel(t, n)}
                          </option>
                        ))}
                        <option value={0}>{holderLabel(t, 0)}</option>
                      </select>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-slate-400">{t(`team.area.${r}` as StringKey)}</span>
                    <span className={`font-mono ${over ? 'text-rose-300' : 'text-slate-200'}`}>
                      {t('team.spend', { spend: fmt(spend[r], 1), envelope: fmt(env[r], 1), pct: Math.round(team.split[r] * 100) })}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.8}
                    step={0.05}
                    value={team.split[r]}
                    onChange={(e) => setShare(r, Number(e.target.value))}
                    aria-label={t('team.share', { role: t(`role.${r}.name` as StringKey) })}
                    className="mt-1 w-full accent-orange-400"
                  />
                  <div className="h-1.5 overflow-hidden rounded bg-slate-800">
                    <div className={`h-full ${over ? 'bg-rose-400' : 'bg-sky-400'}`} style={{ width: `${Math.min(100, (100 * spend[r]) / Math.max(0.01, env[r]))}%` }} />
                  </div>
                </div>
                <div className="min-w-0">
                  {visible ? (
                    <div className="flex items-start gap-1">
                      {isKuntur && <Kuntur mood={goals[r].met ? 'happy' : 'thinking'} size={34} still />}
                      <div className="min-w-0 flex-1">
                        <GoalLine goal={goals[r]} compact />
                      </div>
                      {!isKuntur && (
                        <button type="button" className="text-[11px] text-slate-500 hover:text-white" onClick={() => setShown(null)}>
                          {t('team.hideGoal')}
                        </button>
                      )}
                    </div>
                  ) : mine ? (
                    <button type="button" className="btn-secondary w-full px-2 py-1 text-xs" onClick={() => setShown(r)}>
                      {t('team.showGoal', { holder: holderLabel(t, h) })}
                    </button>
                  ) : (
                    <p className="text-xs text-slate-500">{t('online.secretGoal', { holder: holderLabel(t, h) })}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <p className={`mt-3 rounded-lg border p-3 text-sm ${group ? 'border-emerald-500/40 text-emerald-200' : 'border-slate-700 text-slate-300'}`}>
        <span className="font-semibold">{t('team.group.title')}</span> {t('team.group.text')} {group ? '✔' : ''}
      </p>
      <p className="mt-2 text-xs text-slate-500">{t('team.rules')}</p>
    </Section>
  )
}

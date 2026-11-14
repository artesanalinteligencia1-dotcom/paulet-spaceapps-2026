import { TEAM_ROLES, collaborationPoints, type TeamOutcome } from '../../engine/team'
import { useT, type StringKey } from '../../i18n'
import { ROLE_ICON } from '../tabs/MissionTab'
import { holderLabel } from './TeamPanel'

/** Results: how each role did in the negotiation (its goal, its share) and what the team earned for it. */
export function TeamResults({ outcome }: { outcome: TeamOutcome }) {
  const t = useT()
  const pts = collaborationPoints(outcome)
  return (
    <div className="mt-4 border-t border-white/10 pt-3 text-left text-xs">
      <div className="hud-label mb-1">{t('team.results.title')}</div>
      <table className="w-full">
        <tbody>
          {TEAM_ROLES.map((r) => (
            <tr key={r}>
              <td className="py-0.5 pr-2">
                {ROLE_ICON[r]} {t(`role.${r}.name` as StringKey)}
                <span className="text-slate-500"> · {holderLabel(t, outcome.holders[r])}</span>
              </td>
              <td className={outcome.goals[r] ? 'text-emerald-300' : 'text-amber-300'}>{outcome.goals[r] ? t('team.results.goalMet') : t('team.results.goalMissed')}</td>
              <td className={outcome.withinShare[r] ? 'text-slate-400' : 'text-rose-300'}>{outcome.withinShare[r] ? t('team.results.inShare') : t('team.results.overShare')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-slate-500">{t('team.results.points', { goals: pts.goals, shares: pts.shares, consensus: pts.consensus })}</p>
    </div>
  )
}

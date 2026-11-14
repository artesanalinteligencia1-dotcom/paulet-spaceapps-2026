import { useState } from 'react'
import type { Design, DesignReport, Scenario } from '../../engine/types'
import { useTeam } from '../../store/team'
import { useOnline } from '../../store/online'
import { TeamReview } from '../team/TeamReview'
import { RESOURCE_LABEL, ROLE_LABEL, message } from '../../i18n/en'
import { Pill, SEV_BORDER, SEV_TEXT, Section } from '../components'
import { RequirementsList } from './MissionTab'
import { useGame } from '../../store/game'
import { useT } from '../../i18n'

const ICON = { ok: '●', warn: '▲', error: '■' } as const

export function ReviewTab({ report, design, scenario }: { report: DesignReport; design: Design; scenario: Scenario }) {
  const errors = report.review.filter((r) => r.blocking)
  const goToLaunchPad = useGame((s) => s.goToLaunchPad)
  const team = useTeam((s) => s.team)
  const [voting, setVoting] = useState(false)
  const room = useOnline((s) => s.room)
  const openReview = useOnline((s) => s.openReview)
  const t = useT()
  return (
    <div>
      <Section
        title={t('review.title')}
        hint={t('review.hint')}
      >
        <ul className="space-y-2">
          {report.review.map((item, i) => {
            const m = message(item)
            return (
              <li key={`${item.code}-${i}`} className={`rounded-lg border p-3 ${SEV_BORDER[item.severity]}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={SEV_TEXT[item.severity]} aria-label={item.severity}>
                    {ICON[item.severity]}
                  </span>
                  <span className="font-medium">{m.title}</span>
                  <Pill>{RESOURCE_LABEL[item.resource]}</Pill>
                  {item.severity !== 'ok' && <Pill tone="violet">{ROLE_LABEL[item.role]}</Pill>}
                  {item.blocking && <Pill tone="rose">{t('review.blocking')}</Pill>}
                </div>
                {item.severity !== 'ok' && <p className="mt-1 text-sm text-slate-300">{m.why}</p>}
                {item.severity === 'ok' && <p className="mt-1 text-xs text-slate-400">{m.why}</p>}
                {m.levers && item.severity !== 'ok' && (
                  <ul className="mt-2 list-inside list-disc text-xs text-slate-400">
                    {m.levers.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </Section>
      <Section title={t('review.requirements')}>
        <RequirementsList report={report} />
      </Section>
      <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <button
          type="button"
          disabled={errors.length > 0}
          onClick={room ? openReview : team ? () => setVoting(true) : goToLaunchPad}
          className={`w-full rounded-lg px-4 py-3 font-semibold ${
            errors.length ? 'cursor-not-allowed bg-slate-800 text-slate-500' : 'btn-primary'
          }`}
        >
          {errors.length
            ? t(errors.length === 1 ? 'review.fixBlocking.one' : 'review.fixBlocking.other', { count: errors.length })
            : team
              ? t('team.review.open')
              : t('review.goToLaunchPad')}
        </button>
        {voting && !room && <TeamReview design={design} report={report} scenario={scenario} onClose={() => setVoting(false)} />}
        <p className="mt-2 text-center text-xs text-slate-500">
          {errors.length ? t('review.status.errors') : t('review.status.warnings')}
        </p>
      </div>
    </div>
  )
}

/** Online: the shared review opens on every player's screen, whatever tab they are on. */
export function OnlineReviewHost({ design, report, scenario }: { design: Design; report: DesignReport; scenario: Scenario }) {
  const room = useOnline((s) => s.room)
  const [dismissed, setDismissed] = useState(0)
  const round = room?.review?.open && room.review.round !== dismissed ? room.review.round : 0
  if (!round) return null
  return <TeamReview key={round} design={design} report={report} scenario={scenario} onClose={() => setDismissed(round)} />
}

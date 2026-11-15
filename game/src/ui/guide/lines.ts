// What Kuntur says: pure functions from the design review and the mission analysis to lines, so they can be tested.
import type { Cause } from '../../engine/report'
import type { Rank } from '../../engine/score'
import type { DesignReport, Requirement, RequirementResult, ResourceKey, ReviewItem, Scenario } from '../../engine/types'
import { instruments } from '../../engine/catalog/components'
import { t, type StringKey } from '../../i18n'
import { CAUSE_TEXT, REQUIREMENT_LABEL, fmt, localName, message } from '../../i18n/en'
import type { TabId } from '../../store/game'
import type { GuideMood } from './robots'

/** The tab where each kind of problem is fixed. */
const TAB_BY_RESOURCE: Record<ResourceKey, TabId> = {
  mass: 'orbit',
  power: 'spacecraft',
  data: 'comms',
  cost: 'mission',
  schedule: 'payload',
  life: 'spacecraft',
  science: 'payload',
  risk: 'review',
}
/** The section of the tab where a problem is fixed (Section `id`), so "Show me" can point at it. */
const FOCUS_BY_PREFIX: [string, string][] = [
  ['EDL_', 'landing'],
  ['MARS_WINDOW_', 'orbit'],
  ['LAUNCHER_', 'launcher'],
  ['RIDESHARE_', 'launcher'],
  ['MASS_', 'launcher'],
  ['TCM_', 'orbit'],
  ['LOW_SUN_', 'orbit'],
  ['OXYGEN_', 'cargo'],
  ['NO_PAYLOAD', 'instruments'],
  ['POINTING_', 'instruments'],
  ['ANTENNA_', 'antenna'],
  ['DISH_', 'antenna'],
  ['NO_STATIONS', 'antenna'],
  ['NO_DEEP_STATION', 'antenna'],
  ['DATA_', 'antenna'],
]
export const focusFor = (code: string) => FOCUS_BY_PREFIX.find(([p]) => code.startsWith(p))?.[1]

const TAB_BY_PREFIX: [string, TabId][] = [
  ['EDL_', 'orbit'],
  ['MARS_WINDOW_', 'orbit'],
  ['LAUNCHER_', 'orbit'],
  ['RIDESHARE_', 'orbit'],
  ['TCM_', 'orbit'],
  ['MASS_', 'orbit'],
  ['OXYGEN_', 'payload'],
  ['POINTING_', 'payload'],
  ['NO_PAYLOAD', 'payload'],
  ['LOW_SUN_', 'orbit'],
  ['ANTENNA_', 'comms'],
  ['DISH_', 'comms'],
  ['NO_STATIONS', 'comms'],
  ['NO_DEEP_STATION', 'comms'],
  ['DATA_', 'comms'],
]

export function tabFor(item: Pick<ReviewItem, 'code' | 'resource'>): TabId {
  return TAB_BY_PREFIX.find(([p]) => item.code.startsWith(p))?.[1] ?? TAB_BY_RESOURCE[item.resource]
}

/** Problems in the order Kuntur raises them: what blocks the launch first, and on each level the open tab first. */
export function orderedIssues(report: DesignReport, tab: TabId): ReviewItem[] {
  const rank = (i: ReviewItem) => (i.blocking ? 0 : 2) + (tabFor(i) === tab ? 0 : 1)
  return report.review
    .filter((i) => i.severity !== 'ok')
    .map((item, k) => ({ item, k }))
    .sort((a, b) => rank(a.item) - rank(b.item) || a.k - b.k)
    .map((x) => x.item)
}

export interface HintLine {
  title: string
  text: string
  /** the Section to point at once the tab is open */
  focus?: string
  mood: GuideMood
  tab: TabId | null
}

export function designMood(report: DesignReport): GuideMood {
  if (report.review.some((i) => i.blocking)) return 'worried'
  if (report.review.some((i) => i.severity === 'warn')) return 'thinking'
  return 'happy'
}

/** One line per problem: what is wrong, why, and the first lever that fixes it. All green: one happy line. */
export function designHints(report: DesignReport, tab: TabId): HintLine[] {
  const issues = orderedIssues(report, tab)
  if (issues.length === 0) return [{ title: t('guide.hint.allGood.title'), text: t('guide.hint.allGood.text'), mood: 'happy', tab: null }]
  return issues.map((item) => {
    const m = message(item)
    const [lever, other] = m.levers ?? []
    const where = tabFor(item)
    return {
      title: m.title,
      text: lever ? `${m.why} ${other ? t('guide.hint.try2', { lever, other }) : t('guide.hint.try', { lever })}` : m.why,
      mood: item.blocking ? 'worried' : 'explaining',
      tab: where === tab ? null : where,
      focus: focusFor(item.code),
    }
  })
}

export function resultsMood(rank: Rank): GuideMood {
  return rank === 'Fail' ? 'worried' : rank === 'Partial' ? 'thinking' : 'happy'
}

/** After a mission: the causes that cost most first, then what went well. */
export function resultsLines(causes: Cause[]): HintLine[] {
  const bad = causes.filter((c) => c.impact < 0).sort((a, b) => a.impact - b.impact)
  const good = causes.filter((c) => c.impact >= 0).sort((a, b) => b.impact - a.impact)
  return [...bad, ...good].map((c) => {
    const m = CAUSE_TEXT[c.code]?.(c.params) ?? { title: c.code, why: '' }
    return {
      title: m.title,
      text: m.change && c.impact < 0 ? `${m.why} ${t('guide.results.change', { change: m.change })}` : m.why,
      mood: c.impact < 0 ? 'explaining' : 'happy',
      tab: null,
    }
  })
}

export const TUTORIAL: { id: string; tab: TabId; mood: GuideMood }[] = [
  { id: 'welcome', tab: 'mission', mood: 'happy' },
  { id: 'story', tab: 'mission', mood: 'explaining' },
  { id: 'friends', tab: 'mission', mood: 'happy' },
  { id: 'investors', tab: 'mission', mood: 'explaining' },
  { id: 'mission', tab: 'mission', mood: 'explaining' },
  { id: 'payload', tab: 'payload', mood: 'explaining' },
  { id: 'spacecraft', tab: 'spacecraft', mood: 'explaining' },
  { id: 'orbit', tab: 'orbit', mood: 'explaining' },
  { id: 'comms', tab: 'comms', mood: 'explaining' },
  { id: 'review', tab: 'review', mood: 'thinking' },
  { id: 'end', tab: 'review', mood: 'happy' },
]

/** The tab where each kind of requirement is met. */
export const REQUIREMENT_TAB: Record<Requirement['kind'], TabId> = {
  instrumentAny: 'payload',
  scienceAtLeast: 'payload',
  cargoAtLeast: 'payload',
  oxygenKgAtLeast: 'payload',
  orbitIn: 'orbit',
  altitudeAtMost: 'orbit',
  dvAtMost: 'orbit',
  ellipseKmAtMost: 'orbit',
  arrivalByMonth: 'orbit',
  lifeYears: 'spacecraft',
  propulsionAny: 'spacecraft',
  dataDeliveredGbDay: 'comms',
  withinBudget: 'mission',
  costAtMost: 'mission',
  onSchedule: 'payload',
}

/** Scenarios with a plain-words briefing (what it is really about, and where to start). */
export const BRIEFED_SCENARIOS = ['earth_watch', 'andean_eye', 'station_resupply', 'storm_tracker', 'lunar_pathfinder', 'lagrange_observatory', 'mars_orbiter', 'mars_stranded', 'mars_oxygen', 'sandbox']

export const requirementLine = (q: RequirementResult) => {
  const target = typeof q.target === 'number' ? fmt(q.target, 1) : localName(String(q.target))
  return `${q.met ? '✔' : '○'} ${REQUIREMENT_LABEL[q.kind]} ${target}`
}

const briefWhat = (scenario: Scenario) =>
  BRIEFED_SCENARIOS.includes(scenario.id) ? t(('brief.' + scenario.id + '.what') as StringKey) : t(('scenario.' + scenario.id + '.objective') as StringKey)

/** The briefing Kuntur gives the first time a mission opens: what it is about, what to deliver, where to start. */
export function missionBriefing(scenario: Scenario, report: DesignReport): HintLine[] {
  const name = t(('scenario.' + scenario.id + '.name') as StringKey)
  const must = report.requirements.filter((q) => !q.optional).map(requirementLine).join(' · ')
  const known = BRIEFED_SCENARIOS.includes(scenario.id)
  return [
    { title: t('guide.brief.what', { mission: name }), text: briefWhat(scenario), mood: 'explaining', tab: null },
    { title: t('guide.brief.deliver'), text: must, mood: 'thinking', tab: null },
    { title: t('guide.brief.start'), text: known ? t(('brief.' + scenario.id + '.how') as StringKey) : t('guide.brief.startGeneric'), mood: 'happy', tab: 'payload' },
  ]
}

export interface Question {
  id: string
  label: string
  text: string
  tab: TabId | null
}

/** Questions the player can ask Kuntur on each tab; the answers are worked out from the mission and the design. */
export function questionsFor(scenario: Scenario, report: DesignReport, tab: TabId): Question[] {
  const q = (id: string, text: string, tabTo: TabId | null = null): Question => ({ id, label: t(('guide.q.' + id) as StringKey), text, tab: tabTo })
  const list: Question[] = [q('what', briefWhat(scenario))]
  const next = designHints(report, tab)[0]
  list.push(q('next', next.title + '. ' + next.text, next.tab))
  if (tab === 'mission' || tab === 'review') list.push(q('investors', t('guide.a.investors')))
  if (tab === 'payload') {
    list.push(q('stars', t('guide.a.stars')))
    const need = report.requirements.find((r) => r.kind === 'instrumentAny' && !r.optional)
    const top = [...instruments]
      .filter((i) => (scenario.relevance[i.id] ?? 0) >= 0.8)
      .sort((a, b) => (scenario.relevance[b.id] ?? 0) - (scenario.relevance[a.id] ?? 0))
      .slice(0, 3)
      .map((i) => localName(i.name))
    list.push(q('pick', need ? t('guide.a.pick', { need: localName(String(need.target)), top: top.join(', ') || '—' }) : t('guide.a.pickCargo')))
    list.push(q('duty', t('guide.a.duty')))
  }
  if (tab === 'spacecraft') {
    list.push(q('power', t('guide.a.power', { gen: fmt(report.power.avgGenEolW), need: fmt(report.power.avgLoadW), ecl: fmt(report.power.eclipseFraction * 100), dod: fmt(report.power.dodNominal * 100), limit: fmt(report.power.dodLimit * 100) })))
    list.push(q('life', t('guide.a.life', { life: fmt(report.life.lifeYears, 1), need: fmt(report.life.requiredYears, 1), factor: t(('lifeFactor.' + report.life.limitingFactor) as StringKey) })))
  }
  if (tab === 'orbit') {
    const orbitReq = report.requirements.find((r) => r.kind === 'orbitIn' && !r.optional)
    list.push(q('orbit', orbitReq ? t('guide.a.orbit', { orbits: localName(String(orbitReq.target)) }) : t('guide.a.orbitFree')))
    list.push(q('launcher', t('guide.a.launcher', { wet: fmt(report.mass.wetKg), cap: fmt(report.mass.capacityKg) })))
  }
  if (tab === 'comms') {
    const dataReq = report.requirements.find((r) => r.kind === 'dataDeliveredGbDay' && !r.optional)
    list.push(q('data', dataReq ? t('guide.a.data', { need: fmt(Number(dataReq.target), 1), now: fmt(report.data.deliveredGbDay, 1), made: fmt(report.data.generatedGbDay, 1) }) : t('guide.a.dataFree', { now: fmt(report.data.deliveredGbDay, 1) })))
    list.push(q('stations', t('guide.a.stations')))
  }
  if (tab === 'review') list.push(q('colors', t('guide.a.colors')))
  return list
}

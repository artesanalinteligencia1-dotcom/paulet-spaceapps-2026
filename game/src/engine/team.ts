// Team play for up to four people (Space Apps 2026). Each role owns an area of the budget, has a goal of its own, and
// votes in the design review before launch; the team shares one goal: a mission that meets every requirement.
// The result depends on how the team negotiates: the 100 collaboration points of the score come from here.
// Pure functions, no randomness. Documented in docs/model.md §25.
import { CONTINGENCY } from './budget'
import { getInstrument, instruments } from './catalog/components'
import { TRL_COST_FACTOR } from './launch'
import type { Design, DesignReport, Role, Scenario } from './types'

export const TEAM_ROLES: Role[] = ['lead', 'engineer', 'astrophysicist', 'astrobiologist']
/** Who holds a role: player 1 to 4, or 0 = Kuntur, the robot guide. */
export type Holder = 0 | 1 | 2 | 3 | 4
export type Split = Record<Role, number>
export type Vote = 'approve' | 'reject' | 'veto'

export interface TeamState {
  players: 1 | 2 | 3 | 4
  holders: Record<Role, Holder>
  /** Share of the spendable budget (budget without the contingency) each role controls; sums to 1. */
  split: Split
  /** Review rounds already lost (a rejected or vetoed design goes back to the table). */
  failedRounds: number
  /** Roles that already used their one veto in this mission. */
  vetoesUsed: Role[]
}

/** What the team carried to the launch pad: copied into the mission, so the score and the report can use it. */
export interface TeamOutcome {
  holders: Record<Role, Holder>
  split: Split
  goals: Record<Role, boolean>
  withinShare: Record<Role, boolean>
  approvals: number
  failedRounds: number
}

const round = (x: number) => Math.round(x * 100) / 100

/** Split rounded to 5 % steps that still add up to 100 %. */
export function normaliseSplit(raw: Split): Split {
  const total = TEAM_ROLES.reduce((s, r) => s + Math.max(0, raw[r]), 0) || 1
  const steps = TEAM_ROLES.map((r) => (Math.max(0, raw[r]) / total) * 20)
  const floor = steps.map(Math.floor)
  let left = 20 - floor.reduce((a, b) => a + b, 0)
  const order = steps.map((v, i) => ({ i, frac: v - floor[i] })).sort((a, b) => b.frac - a.frac)
  for (const o of order) if (left-- > 0) floor[o.i]++
  return Object.fromEntries(TEAM_ROLES.map((r, i) => [r, floor[i] / 20])) as Split
}

/** Is this mission about science, about cargo, or about making something? It changes what matters most. */
const isScience = (s: Scenario) => !s.scoring || s.scoring === 'science'

/**
 * The starting split, from what matters most in this mission: launch and operations for the Director, the spacecraft
 * for the Engineer, and the science share divided between the two scientists by how relevant their instruments are.
 * Cargo and production missions give the engineering side more. The team may renegotiate it.
 */
export function defaultSplit(scenario: Scenario): Split {
  if (!isScience(scenario)) return normaliseSplit({ lead: 0.55, engineer: 0.35, astrophysicist: 0.05, astrobiologist: 0.05 })
  const top = (d: 'astrophysicist' | 'astrobiologist') => Math.max(0, ...instruments.filter((i) => i.discipline === d).map((i) => scenario.relevance[i.id] ?? 0))
  const a = top('astrophysicist')
  const b = top('astrobiologist')
  const sci = 0.3
  const sum = a + b || 1
  return normaliseSplit({ lead: 0.45, engineer: 0.25, astrophysicist: (sci * a) / sum, astrobiologist: (sci * b) / sum })
}

/** Money each role is spending, before contingency (M$). */
export function areaSpendM(design: Design, report: DesignReport): Split {
  const byDiscipline = { astrophysicist: 0, astrobiologist: 0 }
  const seen = new Set<string>()
  for (const i of design.instruments) {
    if (seen.has(i.id)) continue
    seen.add(i.id)
    const inst = getInstrument(i.id)
    byDiscipline[inst.discipline] += inst.costM * TRL_COST_FACTOR[inst.trl]
  }
  const oxygen = report.oxygen ? report.oxygen.costM * TRL_COST_FACTOR[6] : 0
  return {
    lead: report.cost.launchM + report.cost.opsM,
    engineer: report.cost.busM + report.cost.integrationM + oxygen,
    astrophysicist: byDiscipline.astrophysicist,
    astrobiologist: byDiscipline.astrobiologist,
  }
}

/** Each role's envelope (M$): its share of the budget left after the contingency reserve. */
export function envelopesM(scenario: Scenario, split: Split): Split {
  const spendable = scenario.budgetM / (1 + CONTINGENCY)
  return Object.fromEntries(TEAM_ROLES.map((r) => [r, split[r] * spendable])) as Split
}

/** A role stays within its share with 5 % of slack (rounding in a negotiation). */
export const SHARE_SLACK = 0.05

export function withinShares(design: Design, report: DesignReport, scenario: Scenario, split: Split): Record<Role, boolean> {
  const spend = areaSpendM(design, report)
  const env = envelopesM(scenario, split)
  return Object.fromEntries(TEAM_ROLES.map((r) => [r, spend[r] <= env[r] * (1 + SHARE_SLACK) + 1e-9])) as Record<Role, boolean>
}

export interface RoleGoal {
  role: Role
  /** i18n key `team.goal.<key>` and its params. */
  key: string
  params: Record<string, number | string>
  met: boolean
  /** How far along, 0..1 (for a bar). */
  progress: number
}

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0)

/**
 * The goal of each role, from the mission. They pull against each other on purpose: the Director wants to save money,
 * the Engineer wants margins, the scientists want more instruments and more data.
 */
export function roleGoals(design: Design, report: DesignReport, scenario: Scenario): Record<Role, RoleGoal> {
  const budget = scenario.budgetM
  const lead: RoleGoal = {
    role: 'lead',
    key: 'saveBudget',
    params: { pct: 90, cost: round(report.cost.totalM), cap: round(0.9 * budget) },
    met: report.cost.totalM <= 0.9 * budget,
    progress: clamp01((budget - report.cost.totalM) / (0.1 * budget)),
  }
  const launchMargin = report.mass.capacityKg > 0 ? 1 - report.mass.wetKg / report.mass.capacityKg : 0
  const engineer: RoleGoal = {
    role: 'engineer',
    key: 'margins',
    params: { power: 20, mass: 15, powerNow: Math.round(report.power.marginEol * 100), massNow: Math.round(launchMargin * 100) },
    met: report.power.marginEol >= 0.2 && launchMargin >= 0.15,
    progress: clamp01(Math.min(report.power.marginEol / 0.2, launchMargin / 0.15)),
  }
  const dataReq = scenario.requirements.find((q) => q.kind === 'dataDeliveredGbDay' && !q.optional)?.value
  const astrophysicist: RoleGoal = dataReq
    ? {
        role: 'astrophysicist',
        key: 'moreData',
        params: { target: round(1.5 * dataReq), now: round(report.data.deliveredGbDay) },
        met: report.data.deliveredGbDay >= 1.5 * dataReq,
        progress: clamp01(report.data.deliveredGbDay / (1.5 * dataReq)),
      }
    : {
        role: 'astrophysicist',
        key: 'longerLife',
        params: { target: round(1.5 * scenario.requiredLifeYears), now: round(report.life.lifeYears) },
        met: report.life.lifeYears >= 1.5 * scenario.requiredLifeYears,
        progress: clamp01(report.life.lifeYears / (1.5 * scenario.requiredLifeYears)),
      }
  const perYearTarget = (1.1 * scenario.scienceTarget) / Math.max(0.5, scenario.requiredLifeYears)
  const ownInstruments = design.instruments.filter((i) => getInstrument(i.id).discipline === 'astrobiologist').length
  const astrobiologist: RoleGoal = isScience(scenario)
    ? {
        role: 'astrobiologist',
        key: 'moreScience',
        params: { target: Math.round(perYearTarget), now: Math.round(report.science.perYear) },
        met: report.science.perYear >= perYearTarget,
        progress: clamp01(report.science.perYear / perYearTarget),
      }
    : {
        role: 'astrobiologist',
        key: 'passenger',
        params: { now: ownInstruments },
        met: ownInstruments >= 1,
        progress: ownInstruments >= 1 ? 1 : 0,
      }
  return { lead, engineer, astrophysicist, astrobiologist }
}

/** The group goal: a design that meets every mandatory requirement and can launch. */
export function groupGoalMet(report: DesignReport): boolean {
  return report.canLaunch && report.requirements.filter((q) => !q.optional).every((q) => q.met)
}

/** How Kuntur votes for a role it holds: it approves when the role's goal is met and its area is within its share. */
export function kunturVote(goal: RoleGoal, within: boolean, report: DesignReport): { vote: Vote; reason: 'ok' | 'goal' | 'share' | 'blocked' } {
  if (!report.canLaunch) return { vote: 'reject', reason: 'blocked' }
  if (!within) return { vote: 'reject', reason: 'share' }
  if (!goal.met) return { vote: 'reject', reason: 'goal' }
  return { vote: 'approve', reason: 'ok' }
}

/** The review passes with at least three approvals out of four and no veto; a design that cannot launch never passes. */
export function reviewPasses(votes: Record<Role, Vote>, report: DesignReport): boolean {
  const list = TEAM_ROLES.map((r) => votes[r])
  return report.canLaunch && !list.includes('veto') && list.filter((v) => v === 'approve').length >= 3
}

export function teamOutcome(team: TeamState, design: Design, report: DesignReport, scenario: Scenario, votes: Record<Role, Vote>): TeamOutcome {
  const goals = roleGoals(design, report, scenario)
  return {
    holders: { ...team.holders },
    split: { ...team.split },
    goals: Object.fromEntries(TEAM_ROLES.map((r) => [r, goals[r].met])) as Record<Role, boolean>,
    withinShare: withinShares(design, report, scenario, team.split),
    approvals: TEAM_ROLES.filter((r) => votes[r] === 'approve').length,
    failedRounds: team.failedRounds,
  }
}

/**
 * Collaboration points (0–100): 40 for the roles' own goals, 30 for each role staying within its share, 30 for
 * consensus (all four approving at the first review = 30, three = 20; every review the team had to repeat costs 10).
 */
export function collaborationPoints(o: TeamOutcome): { total: number; goals: number; shares: number; consensus: number } {
  const goals = (40 * TEAM_ROLES.filter((r) => o.goals[r]).length) / 4
  const shares = (30 * TEAM_ROLES.filter((r) => o.withinShare[r]).length) / 4
  const consensus = Math.max(0, (o.approvals >= 4 ? 30 : o.approvals === 3 ? 20 : 0) - 10 * o.failedRounds)
  return { total: goals + shares + consensus, goals, shares, consensus }
}

export function newTeam(scenario: Scenario, players: TeamState['players'] = 1): TeamState {
  // With fewer players, the first ones take more roles; with one player, Kuntur takes the two scientists by default.
  const holders: Record<Role, Holder> =
    players === 1
      ? { lead: 1, engineer: 1, astrophysicist: 0, astrobiologist: 0 }
      : players === 2
        ? { lead: 1, engineer: 2, astrophysicist: 1, astrobiologist: 2 }
        : players === 3
          ? { lead: 1, engineer: 2, astrophysicist: 3, astrobiologist: 3 }
          : { lead: 1, engineer: 2, astrophysicist: 3, astrobiologist: 4 }
  return { players, holders, split: defaultSplit(scenario), failedRounds: 0, vetoesUsed: [] }
}

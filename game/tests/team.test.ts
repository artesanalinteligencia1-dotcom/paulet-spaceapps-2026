import { describe, expect, it } from 'vitest'
import en from '../src/i18n/strings/en.json'
import es from '../src/i18n/strings/es.json'
import { getScenario, scenarios } from '../src/engine/catalog/scenarios'
import { evaluateDesign } from '../src/engine/evaluate'
import { scoreMission } from '../src/engine/score'
import { simulateMission } from '../src/engine/simulate'
import {
  TEAM_ROLES,
  areaSpendM,
  collaborationPoints,
  defaultSplit,
  envelopesM,
  groupGoalMet,
  kunturVote,
  newTeam,
  normaliseSplit,
  reviewPasses,
  roleGoals,
  teamOutcome,
  withinShares,
  type Vote,
} from '../src/engine/team'
import type { Design, Role } from '../src/engine/types'

const ew = getScenario('earth_watch')
const design: Design = { ...ew.baseDesign, instruments: [{ id: 'multispectral', duty: 0.05 }], stationIds: ['mid_north', 'arctic'] }
const report = evaluateDesign(design, ew)
const all = (v: Vote) => Object.fromEntries(TEAM_ROLES.map((r) => [r, v])) as Record<Role, Vote>

describe('budget split', () => {
  it('always adds up to 100 % in 5 % steps', () => {
    for (const s of scenarios) {
      const split = defaultSplit(s)
      expect(TEAM_ROLES.reduce((a, r) => a + split[r], 0)).toBeCloseTo(1, 9)
      for (const r of TEAM_ROLES) expect(Math.round(split[r] * 20)).toBeCloseTo(split[r] * 20, 9)
    }
    expect(normaliseSplit({ lead: 1, engineer: 1, astrophysicist: 1, astrobiologist: 0 })).toEqual({ lead: 0.35, engineer: 0.35, astrophysicist: 0.3, astrobiologist: 0 })
  })

  it('changes with what matters in each mission', () => {
    // Earth observation leans on the astrobiologist's imagers; the L2 telescope on the astrophysicist
    expect(defaultSplit(ew).astrobiologist).toBeGreaterThanOrEqual(defaultSplit(ew).astrophysicist)
    const l2 = defaultSplit(getScenario('lagrange_observatory'))
    expect(l2.astrophysicist).toBeGreaterThan(l2.astrobiologist)
    // cargo and production missions give the money to launch and engineering
    const cargo = defaultSplit(getScenario('station_resupply'))
    expect(cargo.lead + cargo.engineer).toBeGreaterThanOrEqual(0.9)
  })

  it('every role is charged for its own area, and the areas add up to the cost before contingency', () => {
    const spend = areaSpendM(design, report)
    const sum = TEAM_ROLES.reduce((a, r) => a + spend[r], 0)
    expect(sum).toBeCloseTo(report.cost.instrumentsM + report.cost.busM + report.cost.integrationM + report.cost.launchM + report.cost.opsM, 6)
    expect(spend.astrophysicist).toBe(0) // the multispectral imager belongs to the astrobiologist
    expect(spend.astrobiologist).toBeGreaterThan(0)
    const env = envelopesM(ew, defaultSplit(ew))
    expect(TEAM_ROLES.reduce((a, r) => a + env[r], 0)).toBeCloseTo(ew.budgetM / 1.15, 6)
  })

  it('moving money between roles changes who is within their share', () => {
    const tight = normaliseSplit({ lead: 0.6, engineer: 0.3, astrophysicist: 0.05, astrobiologist: 0.05 })
    expect(withinShares(design, report, ew, tight).astrobiologist).toBe(false)
    const fair = normaliseSplit({ lead: 0.35, engineer: 0.3, astrophysicist: 0.05, astrobiologist: 0.3 })
    expect(withinShares(design, report, ew, fair).astrobiologist).toBe(true)
  })
})

describe('goals and the review', () => {
  it('each role has its own goal, and they pull against each other', () => {
    const g = roleGoals(design, report, ew)
    expect(TEAM_ROLES.map((r) => g[r].key)).toEqual(['saveBudget', 'margins', 'moreData', 'moreScience'])
    // a second imager helps the astrobiologist and costs the director
    const richer = { ...design, instruments: [...design.instruments, { id: 'hyperspectral', duty: 0.03 }] }
    const g2 = roleGoals(richer, evaluateDesign(richer, ew), ew)
    expect(g2.astrobiologist.progress).toBeGreaterThan(g.astrobiologist.progress)
    expect(Number(g2.lead.params.cost)).toBeGreaterThan(Number(g.lead.params.cost))
    // cargo missions: the scientists ask for a passenger experiment
    const sr = getScenario('station_resupply')
    expect(roleGoals(sr.baseDesign, evaluateDesign(sr.baseDesign, sr), sr).astrobiologist.key).toBe('passenger')
    for (const r of TEAM_ROLES) expect(g[r].progress).toBeGreaterThanOrEqual(0)
  })

  it('three approvals and no veto launch; a veto or a blocked design never does', () => {
    expect(reviewPasses(all('approve'), report)).toBe(true)
    expect(reviewPasses({ ...all('approve'), astrobiologist: 'reject' }, report)).toBe(true)
    expect(reviewPasses({ ...all('approve'), astrobiologist: 'reject', engineer: 'reject' }, report)).toBe(false)
    expect(reviewPasses({ ...all('approve'), lead: 'veto' }, report)).toBe(false)
    const empty = evaluateDesign(ew.baseDesign, ew)
    expect(reviewPasses(all('approve'), empty)).toBe(false)
    expect(groupGoalMet(report)).toBe(true)
    expect(groupGoalMet(empty)).toBe(false)
  })

  it('Kuntur approves for its roles only when their goal is met and their area is within its share', () => {
    const g = roleGoals(design, report, ew)
    expect(kunturVote(g.engineer, true, report)).toEqual({ vote: 'approve', reason: 'ok' })
    expect(kunturVote(g.engineer, false, report).reason).toBe('share')
    expect(kunturVote(g.astrobiologist, true, report).reason).toBe('goal')
    expect(kunturVote(g.lead, true, evaluateDesign(ew.baseDesign, ew)).reason).toBe('blocked')
  })
})

describe('collaboration in the score', () => {
  it('a team earns the 100 collaboration points by negotiating; solo play is rescaled as before', () => {
    const team = newTeam(ew, 4)
    const best = teamOutcome(team, design, report, ew, all('approve'))
    const perfect = { ...best, goals: { lead: true, engineer: true, astrophysicist: true, astrobiologist: true }, withinShare: best.goals && { lead: true, engineer: true, astrophysicist: true, astrobiologist: true } }
    expect(collaborationPoints(perfect).total).toBe(100)
    expect(collaborationPoints({ ...perfect, approvals: 3 }).consensus).toBe(20)
    expect(collaborationPoints({ ...perfect, failedRounds: 2 }).consensus).toBe(10)
    expect(collaborationPoints({ ...perfect, failedRounds: 5 }).consensus).toBe(0)

    const solo = simulateMission(design, ew, 3)
    const withTeam = { ...simulateMission(design, ew, 3), team: perfect }
    const s1 = scoreMission(solo, ew)
    const s2 = scoreMission(withTeam, ew)
    expect(s1.lines.some((l) => l.key === 'collaboration')).toBe(false)
    expect(s2.lines.find((l) => l.key === 'collaboration')?.points).toBe(100)
    expect(s2.soloRescale).toBe(1)
    // the same flight: a perfect negotiation is worth the rescaled share, a poor one is worth less
    const poor = { ...withTeam, team: { ...perfect, goals: { lead: false, engineer: false, astrophysicist: false, astrobiologist: false }, approvals: 3, failedRounds: 1 } }
    expect(scoreMission(poor, ew).total).toBeLessThan(s1.total)
    expect(s2.total).toBeGreaterThanOrEqual(s1.total - 1)
  })

  it('players and Kuntur share the roles', () => {
    expect(Object.values(newTeam(ew, 1).holders)).toEqual([1, 1, 0, 0])
    expect(new Set(Object.values(newTeam(ew, 4).holders))).toEqual(new Set([1, 2, 3, 4]))
    expect(Object.values(newTeam(ew, 2).holders).every((h) => h === 1 || h === 2)).toBe(true)
  })

  it('every goal and score line has its text in both languages', () => {
    const E = en as Record<string, string>
    const S = es as Record<string, string>
    for (const k of ['saveBudget', 'margins', 'moreData', 'longerLife', 'moreScience', 'passenger']) {
      expect(E[`team.goal.${k}`], k).toBeTruthy()
      expect(S[`team.goal.${k}`], k).toBeTruthy()
    }
    expect(S['score.label.collaboration']).toBeTruthy()
  })
})

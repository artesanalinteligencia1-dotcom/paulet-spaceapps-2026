// Team play state: who holds each role, how the money is split, and the last design review the team passed.
import { create } from 'zustand'
import { getScenario } from '../engine/catalog'
import { TEAM_ROLES, defaultSplit, newTeam, normaliseSplit, teamOutcome, type Holder, type TeamOutcome, type TeamState, type Vote } from '../engine/team'
import type { Design, DesignReport, Role } from '../engine/types'

interface TeamStore {
  team: TeamState | null
  /** The scenario the split and the review belong to. */
  scenarioId: string | null
  /** The design the team approved; it travels to the launch pad only if nobody changed it afterwards. */
  approval: { designKey: string; outcome: TeamOutcome } | null
  enable: (scenarioId: string, players?: TeamState['players']) => void
  disable: () => void
  /** A new mission keeps the players and their roles, and starts a fresh negotiation. */
  ensureFor: (scenarioId: string) => void
  setPlayers: (players: TeamState['players']) => void
  setHolder: (role: Role, holder: Holder) => void
  setShare: (role: Role, value: number) => void
  resetSplit: () => void
  /** Records a design review; returns whether it passed. */
  recordReview: (passed: boolean, votes: Record<Role, Vote>, design: Design, report: DesignReport) => void
}

/** Move one role's share and spread the difference over the others, in proportion to what they had. */
export function rebalance(split: Record<Role, number>, role: Role, value: number): Record<Role, number> {
  const v = Math.max(0, Math.min(1, Math.round(value * 20) / 20))
  const others = TEAM_ROLES.filter((r) => r !== role)
  const had = others.reduce((s, r) => s + split[r], 0)
  const next = { ...split, [role]: v }
  for (const r of others) next[r] = had > 0 ? (split[r] / had) * (1 - v) : (1 - v) / others.length
  return normaliseSplit(next)
}

export const useTeam = create<TeamStore>((set, get) => ({
  team: null,
  scenarioId: null,
  approval: null,
  enable: (scenarioId, players = 1) => set({ team: newTeam(getScenario(scenarioId), players), scenarioId, approval: null }),
  disable: () => set({ team: null, approval: null }),
  ensureFor: (scenarioId) => {
    const { team, scenarioId: current } = get()
    if (!team || current === scenarioId) return
    set({ team: { ...team, split: defaultSplit(getScenario(scenarioId)), failedRounds: 0, vetoesUsed: [] }, scenarioId, approval: null })
  },
  setPlayers: (players) => {
    const { team, scenarioId } = get()
    if (!team || !scenarioId) return
    set({ team: { ...newTeam(getScenario(scenarioId), players), split: team.split, failedRounds: team.failedRounds, vetoesUsed: team.vetoesUsed }, approval: null })
  },
  setHolder: (role, holder) => set((s) => (s.team ? { team: { ...s.team, holders: { ...s.team.holders, [role]: holder } }, approval: null } : s)),
  setShare: (role, value) => set((s) => (s.team ? { team: { ...s.team, split: rebalance(s.team.split, role, value) }, approval: null } : s)),
  resetSplit: () => {
    const { team, scenarioId } = get()
    if (team && scenarioId) set({ team: { ...team, split: defaultSplit(getScenario(scenarioId)) }, approval: null })
  },
  recordReview: (passed, votes, design, report) => {
    const { team, scenarioId } = get()
    if (!team || !scenarioId) return
    const vetoes = TEAM_ROLES.filter((r) => votes[r] === 'veto')
    if (!passed) {
      set({ team: { ...team, failedRounds: team.failedRounds + 1, vetoesUsed: [...new Set([...team.vetoesUsed, ...vetoes])] }, approval: null })
      return
    }
    set({ approval: { designKey: JSON.stringify(design), outcome: teamOutcome(team, design, report, getScenario(scenarioId), votes) } })
  },
}))

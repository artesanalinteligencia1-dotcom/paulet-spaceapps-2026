// Ranking on this device: the five best flights of each mission (localStorage).
import type { Rank } from '../engine/score'

export interface BoardEntry {
  score: number
  rank: Rank
  seed: number
  date: string
  summary: string
  /** Who flew it: empty = solo; otherwise the team (player names online, "Team of n" on one device). */
  who?: string
}
export const BOARD_KEY = 'ppgame.leaderboard.v1'

export function loadBoard(): Record<string, BoardEntry[]> {
  try {
    return JSON.parse(localStorage.getItem(BOARD_KEY) ?? '{}') as Record<string, BoardEntry[]>
  } catch {
    return {}
  }
}

// An online room: the shared table of a team. Plain data (stored as is in Firebase). The design travels as a JSON
// string, so Firebase never drops empty arrays or undefined fields from it.
import type { Split, Vote } from '../engine/team'
import { TEAM_ROLES, defaultSplit } from '../engine/team'
import { getScenario } from '../engine/catalog'
import type { Role } from '../engine/types'

export interface RoomPlayer {
  name: string
  /** 1 to 4, in order of arrival: the player's number in the team. */
  order: number
  joinedAt: number
}

export interface Room {
  v: 1
  host: string
  scenarioId: string
  createdAt: number
  players: Record<string, RoomPlayer>
  /** Who plays each role: a player id or "kuntur". */
  holders: Record<Role, string>
  design: string
  split: Split
  failedRounds: number
  vetoesUsed?: Partial<Record<Role, boolean>>
  review?: { round: number; open: boolean; votes?: Partial<Record<Role, Vote>>; result?: 'passed' | 'failed' }
  /** The Mission Director's launch: every device lifts off together; in-flight decisions are shared per launch. */
  launch?: { seed: number; round: number; decisions?: Record<string, string> }
}

export const MAX_PLAYERS = 4
export const KUNTUR = 'kuntur'

/** Who may press launch: the Mission Director, or the host when Kuntur holds that role. */
export function launcherOf(room: Room): string {
  return room.holders.lead && room.holders.lead !== KUNTUR && room.players?.[room.holders.lead] ? room.holders.lead : room.host
}

/** A Firebase-safe key for one in-flight decision. */
export function decisionKey(eventId: string, week: number): string {
  return `${eventId}_${week}`.replace(/[.#$[\]/]/g, '_')
}

/** Short room codes without look-alike characters (no 0/O, 1/I/L). */
export function roomCode(rand: () => number = Math.random): string {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => abc[Math.floor(rand() * abc.length)]).join('')
}

/** A room code typed by hand or pasted as the whole invitation link. */
export function parseRoomCode(input: string): string | null {
  const s = input.trim()
  const fromLink = /[?&]room=([A-Za-z0-9]{6})/.exec(s)
  const code = (fromLink ? fromLink[1] : s).toUpperCase()
  return /^[A-Z0-9]{6}$/.test(code) ? code : null
}

export function newRoom(hostId: string, hostName: string, scenarioId: string, now = Date.now()): Room {
  const scenario = getScenario(scenarioId)
  return {
    v: 1,
    host: hostId,
    scenarioId,
    createdAt: now,
    players: { [hostId]: { name: hostName, order: 1, joinedAt: now } },
    holders: { lead: hostId, engineer: KUNTUR, astrophysicist: KUNTUR, astrobiologist: KUNTUR },
    design: JSON.stringify(scenario.baseDesign),
    split: defaultSplit(scenario),
    failedRounds: 0,
  }
}

/** The order number a new player gets (the lowest free one), or null when the room is full. */
export function nextOrder(room: Room): number | null {
  const used = new Set(Object.values(room.players ?? {}).map((p) => p.order))
  for (let n = 1; n <= MAX_PLAYERS; n++) if (!used.has(n)) return n
  return null
}

/** Roles a player holds. */
export function rolesOf(room: Room, playerId: string): Role[] {
  return TEAM_ROLES.filter((r) => room.holders?.[r] === playerId)
}

/** The review is complete when every role held by a person has voted (Kuntur's votes are filled in by the host). */
export function votesComplete(room: Room): boolean {
  const votes = room.review?.votes ?? {}
  return TEAM_ROLES.every((r) => votes[r])
}

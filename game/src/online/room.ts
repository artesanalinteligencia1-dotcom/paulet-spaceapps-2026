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
  /** The Mission Director sends every device to the launch pad (a counter; no countdown yet). */
  pad?: number
  /** The Mission Director's launch: every device lifts off together; in-flight decisions are shared per launch.
   *  `ready`: who pressed "Start mission"; the flight starts on every device once every player has. */
  launch?: { seed: number; round: number; decisions?: Record<string, string>; ready?: Record<string, boolean> }
  /** A player asks to play again together (same mission, back to the table) or to fly another mission. Whoever
   *  declines leaves the room; the ones who accept go on together once everyone has answered. */
  next?: { id: number; from: string; kind: NextKind; scenarioId: string; answers?: Record<string, 'yes' | 'no'>; done?: boolean }
}

export type NextKind = 'again' | 'mission'

export const MAX_PLAYERS = 4
export const KUNTUR = 'kuntur'

/** Who may press launch: the Mission Director, or the host when Kuntur holds that role. */
export function launcherOf(room: Room): string {
  return room.holders.lead && room.holders.lead !== KUNTUR && room.players?.[room.holders.lead] ? room.holders.lead : room.host
}

/** Players (ids) who have not pressed "Start mission" yet for the current launch. */
export function notReady(room: Room): string[] {
  const ready = room.launch?.ready ?? {}
  return Object.keys(room.players ?? {}).filter((id) => !ready[id])
}

/** Players (ids) who have not answered the proposal to play again yet. */
export function notAnswered(room: Room): string[] {
  const answers = room.next?.answers ?? {}
  return Object.keys(room.players ?? {}).filter((id) => !answers[id])
}

/** Every player still in the room accepted the proposal: the team goes on together. */
export function nextAccepted(room: Room): boolean {
  const n = room.next
  if (!n || n.done) return false
  const answers = n.answers ?? {}
  const ids = Object.keys(room.players ?? {})
  return ids.length > 0 && ids.every((id) => answers[id] === 'yes')
}

/** The room patch that starts the accepted proposal: a fresh table (same mission or another one), no review. */
export function nextPatch(room: Room): Record<string, unknown> {
  const n = room.next!
  // the review keeps its round number, so a screen that dismissed an earlier round still shows the next one
  const patch: Record<string, unknown> = { 'next/done': true, review: room.review ? { round: room.review.round, open: false } : null, failedRounds: 0, vetoesUsed: null }
  if (room.launch) Object.assign(patch, { 'launch/ready': null, 'launch/decisions': null })
  if (n.kind === 'mission' && n.scenarioId !== room.scenarioId) {
    const scenario = getScenario(n.scenarioId)
    patch.scenarioId = n.scenarioId
    patch.design = JSON.stringify(scenario.baseDesign)
    patch.split = defaultSplit(scenario)
  }
  return patch
}

/** The room patch for a player who leaves: their roles go to Kuntur and, if they were the host, the next player hosts. */
export function leavePatch(room: Room, playerId: string): Record<string, unknown> {
  const patch: Record<string, unknown> = { [`players/${playerId}`]: null }
  for (const r of TEAM_ROLES) if (room.holders?.[r] === playerId) patch[`holders/${r}`] = KUNTUR
  if (room.host === playerId) {
    const heir = Object.entries(room.players ?? {})
      .filter(([id]) => id !== playerId)
      .sort((a, b) => a[1].order - b[1].order)[0]
    if (heir) patch.host = heir[0]
  }
  return patch
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

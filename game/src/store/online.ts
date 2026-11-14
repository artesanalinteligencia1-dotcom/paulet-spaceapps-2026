// Online team play: one player creates a room and shares a link; the others join with their name and pick a role.
// The room holds the shared table (design, money split, who plays what, the review votes). Every device keeps the game
// running locally and mirrors the room; the engine is deterministic, so a launch with the same design and seed flies
// the same mission everywhere.
import { create } from 'zustand'
import { getScenario } from '../engine/catalog'
import { evaluateDesign } from '../engine/evaluate'
import { TEAM_ROLES, kunturVote, reviewPasses, roleGoals, withinShares, type Holder, type Vote } from '../engine/team'
import type { Design, Role } from '../engine/types'
import { KUNTUR, newRoom, nextOrder, roomCode, votesComplete, type Room } from '../online/room'
import { getTransport } from '../online/transport'
import { useGame } from './game'
import { useTeam } from './team'

function playerId(): string {
  try {
    const k = 'ppgame.player'
    let id = sessionStorage.getItem(k)
    if (!id) {
      id = `p${Math.random().toString(36).slice(2, 10)}`
      sessionStorage.setItem(k, id)
    }
    return id
  } catch {
    return `p${Math.random().toString(36).slice(2, 10)}`
  }
}

const roomFromUrl = (): string | null => {
  try {
    const c = new URLSearchParams(window.location.search).get('room')
    return c && /^[A-Z0-9]{6}$/.test(c.toUpperCase()) ? c.toUpperCase() : null
  } catch {
    return null
  }
}

export type OnlineStatus = 'idle' | 'joining' | 'in-room' | 'missing' | 'full' | 'error'

interface OnlineStore {
  me: string
  /** A room code from the invitation link, waiting for the player's name. */
  pendingCode: string | null
  code: string | null
  room: Room | null
  status: OnlineStatus
  /** The launch round this device already started (the host's launch reaches everyone once). */
  launchedRound: number
  /** Set when a launch arrives: the launch pad starts the countdown by itself. */
  autoLaunch: boolean
  create: (name: string, design: Design) => Promise<string>
  join: (code: string, name: string) => Promise<void>
  leave: () => void
  setHolder: (role: Role, holder: string) => void
  openReview: () => void
  closeReview: () => void
  vote: (role: Role, v: Vote) => void
  launchTogether: () => void
  consumeAutoLaunch: () => void
}

let unsubscribe: (() => void) | null = null
let pushTimer: number | undefined

export const useOnline = create<OnlineStore>((set, get) => ({
  me: playerId(),
  pendingCode: roomFromUrl(),
  code: null,
  room: null,
  status: 'idle',
  launchedRound: 0,
  autoLaunch: false,
  create: async (name, design) => {
    const t = getTransport()
    const code = roomCode()
    const room = newRoom(get().me, name.trim() || 'Player 1', design.scenarioId)
    room.design = JSON.stringify(design)
    await t.create(code, room)
    listen(code)
    return code
  },
  join: async (code, name) => {
    set({ status: 'joining' })
    const t = getTransport()
    const first = await new Promise<Room | null>((resolve) => {
      const off = t.subscribe(code, (r) => {
        off()
        resolve(r)
      })
    })
    if (!first) return set({ status: 'missing' })
    const me = get().me
    if (!first.players?.[me]) {
      const order = nextOrder(first)
      if (!order) return set({ status: 'full' })
      await t.update(code, { [`players/${me}`]: { name: name.trim() || `Player ${order}`, order, joinedAt: Date.now() } })
    }
    listen(code)
    set({ pendingCode: null })
  },
  leave: () => {
    const { code, me, room } = get()
    if (code && room) {
      const patch: Record<string, unknown> = { [`players/${me}`]: null }
      for (const r of TEAM_ROLES) if (room.holders[r] === me) patch[`holders/${r}`] = KUNTUR
      void getTransport().update(code, patch)
    }
    unsubscribe?.()
    unsubscribe = null
    set({ code: null, room: null, status: 'idle' })
    useTeam.getState().disable()
  },
  setHolder: (role, holder) => {
    const { code } = get()
    if (code) void getTransport().update(code, { [`holders/${role}`]: holder })
  },
  openReview: () => {
    const { code, room } = get()
    if (!code || !room) return
    // Kuntur's votes are decided now, from the shared design, so every device shows the same
    const design = JSON.parse(room.design) as Design
    const scenario = getScenario(room.scenarioId)
    const report = evaluateDesign(design, scenario)
    const goals = roleGoals(design, report, scenario)
    const within = withinShares(design, report, scenario, room.split)
    const votes: Partial<Record<Role, Vote>> = {}
    for (const r of TEAM_ROLES) if (room.holders[r] === KUNTUR) votes[r] = kunturVote(goals[r], within[r], report).vote
    void getTransport().update(code, { review: { round: (room.review?.round ?? 0) + 1, open: true, votes } })
  },
  closeReview: () => {
    const { code } = get()
    if (code) void getTransport().update(code, { 'review/open': false })
  },
  vote: (role, v) => {
    const { code, room, me } = get()
    if (!code || !room || room.holders[role] !== me || room.review?.result) return
    void getTransport().update(code, { [`review/votes/${role}`]: v })
  },
  launchTogether: () => {
    const { code, room } = get()
    if (!code || !room || room.review?.result !== 'passed') return
    void getTransport().update(code, { launch: { seed: useGame.getState().seed, round: (room.launch?.round ?? 0) + 1 }, 'review/open': false })
  },
  consumeAutoLaunch: () => set({ autoLaunch: false }),
}))

function listen(code: string) {
  unsubscribe?.()
  useOnline.setState({ code, status: 'joining' })
  unsubscribe = getTransport().subscribe(code, (room) => {
    if (!room) return useOnline.setState({ room: null, status: 'missing' })
    useOnline.setState({ room, status: 'in-room' })
    mirror(room)
  })
}

/** The room drives this device: design, team, review result and launch. */
function mirror(room: Room) {
  const { me } = useOnline.getState()
  const game = useGame.getState()
  // 1. design (only when it really changed, so local edits do not bounce back)
  const local = game.design ? JSON.stringify(game.design) : null
  if (local !== room.design || game.scenarioId !== room.scenarioId) {
    const design = JSON.parse(room.design) as Design
    const enterDesign = game.screen === 'home' || game.screen === 'free' || game.screen === 'campaign' || game.scenarioId !== room.scenarioId
    useGame.setState({ design, scenarioId: room.scenarioId, mode: 'free', contractId: null, ...(enterDesign ? { screen: 'design', tab: 'mission', mission: null } : {}) })
  }
  // 2. team: players become numbers 1–4, Kuntur 0
  const players = room.players ?? {}
  const holderOf = (id: string): Holder => (id === KUNTUR || !players[id] ? 0 : (players[id].order as Holder))
  const count = Math.max(1, ...Object.values(players).map((p) => p.order)) as 1 | 2 | 3 | 4
  const vetoesUsed = TEAM_ROLES.filter((r) => room.vetoesUsed?.[r])
  const prev = useTeam.getState()
  useTeam.setState({
    team: {
      players: count,
      holders: Object.fromEntries(TEAM_ROLES.map((r) => [r, holderOf(room.holders[r])])) as Record<Role, Holder>,
      split: room.split,
      failedRounds: room.failedRounds ?? 0,
      vetoesUsed,
    },
    scenarioId: room.scenarioId,
    approval: prev.approval,
  })
  // 3. the host settles a complete review (only the host, so a failed round is counted once)
  const review = room.review
  if (review && !review.result && votesComplete(room) && room.host === me) {
    const design = JSON.parse(room.design) as Design
    const report = evaluateDesign(design, getScenario(room.scenarioId))
    const votes = review.votes as Record<Role, Vote>
    const passed = reviewPasses(votes, report)
    const patch: Record<string, unknown> = { 'review/result': passed ? 'passed' : 'failed' }
    if (!passed) {
      patch.failedRounds = (room.failedRounds ?? 0) + 1
      for (const r of TEAM_ROLES) if (votes[r] === 'veto') patch[`vetoesUsed/${r}`] = true
    }
    void getTransport().update(useOnline.getState().code!, patch)
  }
  // 4. a passed review gives every device the approval of this very design
  if (review?.result === 'passed' && review.votes) {
    const design = JSON.parse(room.design) as Design
    const key = JSON.stringify(design)
    if (useTeam.getState().approval?.designKey !== key) {
      const report = evaluateDesign(design, getScenario(room.scenarioId))
      useTeam.getState().recordReview(true, review.votes as Record<Role, Vote>, design, report)
    }
  }
  // 5. the host's launch reaches everyone once; Kuntur flies the in-flight decisions, so every device flies the same mission
  if (room.launch && room.launch.round > useOnline.getState().launchedRound) {
    useOnline.setState({ launchedRound: room.launch.round, autoLaunch: true })
    useGame.setState({ delegated: { lead: true, engineer: true, astrophysicist: true, astrobiologist: true }, personality: 'balanced' })
    useGame.getState().setSeed(room.launch.seed)
    useGame.getState().goToLaunchPad()
  }
}

/** Local edits go to the room: the design and the money split. */
export function startOnlinePush() {
  const push = () => {
    const { code, room } = useOnline.getState()
    if (!code || !room) return
    const patch: Record<string, unknown> = {}
    const design = useGame.getState().design
    if (design && design.scenarioId === room.scenarioId) {
      const json = JSON.stringify(design)
      if (json !== room.design) patch.design = json
    }
    const split = useTeam.getState().team?.split
    if (split && JSON.stringify(split) !== JSON.stringify(room.split)) patch.split = split
    if (Object.keys(patch).length) void getTransport().update(code, patch)
  }
  const schedule = () => {
    window.clearTimeout(pushTimer)
    pushTimer = window.setTimeout(push, 120)
  }
  const a = useGame.subscribe((s, p) => {
    if (s.design !== p.design) schedule()
  })
  const b = useTeam.subscribe((s, p) => {
    if (s.team?.split !== p.team?.split) schedule()
  })
  return () => {
    a()
    b()
  }
}

/** The invitation link for a room. */
export function roomLink(code: string): string {
  const u = new URL(window.location.href)
  u.search = ''
  u.hash = ''
  u.searchParams.set('room', code)
  const backend = new URLSearchParams(window.location.search).get('roomBackend')
  if (backend) u.searchParams.set('roomBackend', backend)
  return u.toString()
}

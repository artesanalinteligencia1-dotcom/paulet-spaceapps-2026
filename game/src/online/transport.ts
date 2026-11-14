// Where an online room lives. Production: Firebase Realtime Database (the owner's project, set through VITE_FIREBASE_*
// variables). Without that configuration, or with ?roomBackend=local, rooms live in this browser and are shared between
// its tabs (BroadcastChannel): enough to test the whole flow with no account.
import type { Room } from './room'

export interface RoomTransport {
  kind: 'firebase' | 'local'
  /** Calls back with the room on every change (null when it does not exist). Returns the unsubscribe function. */
  subscribe(code: string, cb: (room: Room | null) => void): () => void
  create(code: string, room: Room): Promise<void>
  /** Multi-path update: keys are paths inside the room ("holders/lead"); null deletes. */
  update(code: string, patch: Record<string, unknown>): Promise<void>
}

const env = import.meta.env as Record<string, string | undefined>
export const FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}
export const firebaseConfigured = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.databaseURL)

/** Applies a multi-path patch to a plain object (the same semantics as Firebase's update()). */
export function applyPatch<T extends object>(obj: T, patch: Record<string, unknown>): T {
  const out = structuredClone(obj) as Record<string, unknown>
  for (const [path, value] of Object.entries(patch)) {
    const keys = path.split('/')
    let node = out
    for (const k of keys.slice(0, -1)) {
      if (typeof node[k] !== 'object' || node[k] === null) node[k] = {}
      node = node[k] as Record<string, unknown>
    }
    const last = keys[keys.length - 1]
    if (value === null || value === undefined) delete node[last]
    else node[last] = structuredClone(value)
  }
  return out as T
}

function localTransport(): RoomTransport {
  const key = (code: string) => `ppgame.room.${code}`
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ppgame-rooms') : null
  const listeners = new Map<string, Set<(room: Room | null) => void>>()
  const read = (code: string): Room | null => {
    try {
      return JSON.parse(localStorage.getItem(key(code)) ?? 'null') as Room | null
    } catch {
      return null
    }
  }
  const notify = (code: string) => listeners.get(code)?.forEach((cb) => cb(read(code)))
  channel?.addEventListener('message', (e: MessageEvent<string>) => notify(e.data))
  const write = (code: string, room: Room) => {
    localStorage.setItem(key(code), JSON.stringify(room))
    notify(code)
    channel?.postMessage(code)
  }
  return {
    kind: 'local',
    subscribe(code, cb) {
      if (!listeners.has(code)) listeners.set(code, new Set())
      listeners.get(code)!.add(cb)
      queueMicrotask(() => cb(read(code)))
      return () => listeners.get(code)?.delete(cb)
    },
    async create(code, room) {
      write(code, room)
    },
    async update(code, patch) {
      const room = read(code)
      if (room) write(code, applyPatch(room, patch))
    },
  }
}

function firebaseTransport(): RoomTransport {
  // The SDK loads on demand, so solo and offline play never download it.
  const db = (async () => {
    const [{ initializeApp }, database] = await Promise.all([import('firebase/app'), import('firebase/database')])
    return { database, db: database.getDatabase(initializeApp(FIREBASE_CONFIG)) }
  })()
  return {
    kind: 'firebase',
    subscribe(code, cb) {
      let off = () => {}
      let stopped = false
      void db.then(({ database, db }) => {
        if (stopped) return
        off = database.onValue(database.ref(db, `rooms/${code}`), (snap) => cb((snap.val() as Room | null) ?? null))
      })
      return () => {
        stopped = true
        off()
      }
    },
    async create(code, room) {
      const { database, db: d } = await db
      await database.set(database.ref(d, `rooms/${code}`), room)
    },
    async update(code, patch) {
      const { database, db: d } = await db
      await database.update(database.ref(d, `rooms/${code}`), patch)
    },
  }
}

let current: RoomTransport | null = null
export function getTransport(): RoomTransport {
  if (current) return current
  const forceLocal = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('roomBackend') === 'local'
  current = firebaseConfigured && !forceLocal ? firebaseTransport() : localTransport()
  return current
}

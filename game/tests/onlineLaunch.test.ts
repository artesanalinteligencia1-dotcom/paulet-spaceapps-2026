import { describe, expect, it } from 'vitest'
import { KUNTUR, decisionKey, launcherOf, newRoom } from '../src/online/room'

describe('online launch and shared decisions', () => {
  it('the Mission Director launches; the host does when Kuntur directs', () => {
    const room = newRoom('host', 'Ana', 'earth_watch')
    room.players.p2 = { name: 'Beto', order: 2, joinedAt: 1 }
    room.holders.lead = 'p2'
    expect(launcherOf(room)).toBe('p2')
    room.holders.lead = KUNTUR
    expect(launcherOf(room)).toBe('host')
  })
  it('decision keys are safe for the database', () => {
    expect(decisionKey('solar.storm/1', 12)).toBe('solar_storm_1_12')
  })
})

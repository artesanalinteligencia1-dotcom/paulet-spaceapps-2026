import { describe, expect, it } from 'vitest'
import { KUNTUR, decisionKey, launcherOf, leavePatch, newRoom, nextAccepted, nextPatch, notAnswered, notReady } from '../src/online/room'
import { applyPatch } from '../src/online/transport'

const twoPlayers = () => {
  const room = newRoom('host', 'Ana', 'earth_watch')
  room.players.p2 = { name: 'Beto', order: 2, joinedAt: 1 }
  room.holders.engineer = 'p2'
  return room
}

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
  it('the flight starts only when every player pressed Start mission', () => {
    const room = twoPlayers()
    room.launch = { seed: 4, round: 1 }
    expect(notReady(room).sort()).toEqual(['host', 'p2'])
    room.launch.ready = { p2: true }
    expect(notReady(room)).toEqual(['host'])
    room.launch.ready.host = true
    expect(notReady(room)).toEqual([])
  })
})

describe('playing again together', () => {
  it('goes on once every player still in the room accepted', () => {
    const room = twoPlayers()
    room.next = { id: 1, from: 'host', kind: 'again', scenarioId: 'earth_watch', answers: { host: 'yes' } }
    expect(nextAccepted(room)).toBe(false)
    expect(notAnswered(room)).toEqual(['p2'])
    room.next.answers!.p2 = 'yes'
    expect(nextAccepted(room)).toBe(true)
  })
  it('a player who declines leaves; the others go on', () => {
    let room = twoPlayers()
    room.next = { id: 1, from: 'host', kind: 'again', scenarioId: 'earth_watch', answers: { host: 'yes' } }
    room = applyPatch(room, { 'next/answers/p2': 'no', ...leavePatch(room, 'p2') })
    expect(room.players.p2).toBeUndefined()
    expect(room.holders.engineer).toBe(KUNTUR)
    expect(nextAccepted(room)).toBe(true)
  })
  it('another mission resets the table to that mission; the review keeps its round', () => {
    let room = twoPlayers()
    room.review = { round: 2, open: false, result: 'passed', votes: { lead: 'approve' } }
    room.launch = { seed: 4, round: 1, ready: { host: true, p2: true }, decisions: { a_1: 'x' } }
    room.failedRounds = 1
    room.next = { id: 1, from: 'p2', kind: 'mission', scenarioId: 'andean_eye', answers: { host: 'yes', p2: 'yes' } }
    room = applyPatch(room, nextPatch(room))
    expect(room.scenarioId).toBe('andean_eye')
    expect(JSON.parse(room.design).scenarioId).toBe('andean_eye')
    expect(room.review).toEqual({ round: 2, open: false })
    expect(room.launch).toEqual({ seed: 4, round: 1 })
    expect(room.failedRounds).toBe(0)
    expect(room.next?.done).toBe(true)
    expect(room.holders.engineer).toBe('p2')
  })
  it('when the host leaves, the next player hosts', () => {
    const room = applyPatch(twoPlayers(), leavePatch(twoPlayers(), 'host'))
    expect(room.host).toBe('p2')
    expect(room.holders.lead).toBe(KUNTUR)
  })
})

describe('one pace in flight', () => {
  it('a device knows how far ahead the others are', async () => {
    const { leadWeek } = await import('../src/online/room')
    const room = twoPlayers()
    room.launch = { seed: 4, round: 1, weeks: { host: 10, p2: 30, gone: 99 } }
    expect(leadWeek(room, 'host')).toBe(30)
    expect(leadWeek(room, 'p2')).toBe(10)
  })
})

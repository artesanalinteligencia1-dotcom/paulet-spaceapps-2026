import { describe, expect, it } from 'vitest'
import en from '../src/i18n/strings/en.json'
import es from '../src/i18n/strings/es.json'
import { TEAM_ROLES } from '../src/engine/team'
import { KUNTUR, MAX_PLAYERS, newRoom, nextOrder, roomCode, rolesOf, votesComplete } from '../src/online/room'
import { applyPatch } from '../src/online/transport'

describe('online rooms', () => {
  it('codes are six characters with no look-alikes', () => {
    for (let i = 0; i < 200; i++) expect(roomCode()).toMatch(/^[A-HJKMNP-Z2-9]{6}$/)
  })

  it('the host starts as Director; Kuntur holds the other roles; the design travels as text', () => {
    const r = newRoom('p1', 'Ana', 'earth_watch', 0)
    expect(r.holders).toEqual({ lead: 'p1', engineer: KUNTUR, astrophysicist: KUNTUR, astrobiologist: KUNTUR })
    expect(JSON.parse(r.design).scenarioId).toBe('earth_watch')
    expect(rolesOf(r, 'p1')).toEqual(['lead'])
    expect(TEAM_ROLES.reduce((s, x) => s + r.split[x], 0)).toBeCloseTo(1, 9)
  })

  it('players get the lowest free number, up to four', () => {
    let r = newRoom('p1', 'Ana', 'earth_watch', 0)
    for (let i = 2; i <= MAX_PLAYERS; i++) {
      expect(nextOrder(r)).toBe(i)
      r = applyPatch(r, { [`players/p${i}`]: { name: `P${i}`, order: i, joinedAt: 0 } })
    }
    expect(nextOrder(r)).toBeNull()
    r = applyPatch(r, { 'players/p2': null })
    expect(nextOrder(r)).toBe(2)
  })

  it('multi-path patches work like Firebase update()', () => {
    const r = newRoom('p1', 'Ana', 'earth_watch', 0)
    const next = applyPatch(r, { 'holders/engineer': 'p2', 'review/votes/lead': 'approve', 'review/round': 1 })
    expect(next.holders.engineer).toBe('p2')
    expect(next.review).toEqual({ votes: { lead: 'approve' }, round: 1 })
    expect(r.holders.engineer).toBe(KUNTUR) // the original is untouched
    expect(votesComplete(next)).toBe(false)
    const all = applyPatch(next, Object.fromEntries(TEAM_ROLES.map((x) => [`review/votes/${x}`, 'approve'])))
    expect(votesComplete(all)).toBe(true)
  })

  it('characters and online texts exist in both languages', () => {
    const E = en as Record<string, string>
    const S = es as Record<string, string>
    for (const r of TEAM_ROLES) for (const f of ['name', 'line']) {
      expect(E[`character.${r}.${f}`]).toBeTruthy()
      expect(S[`character.${r}.${f}`]).toBeTruthy()
    }
    expect(E['character.astrobiologist.name']).toBe('Franchesca')
    expect(E['character.engineer.name']).toBe('Chicho')
    expect(E['character.astrophysicist.name']).toBe('Roberto')
  })
})

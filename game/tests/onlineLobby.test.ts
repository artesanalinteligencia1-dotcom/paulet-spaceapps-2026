import { describe, expect, it } from 'vitest'
import { parseRoomCode } from '../src/online/room'

describe('joining a room from the main menu', () => {
  it('accepts a typed code in any case', () => {
    expect(parseRoomCode(' zhpswg ')).toBe('ZHPSWG')
  })
  it('accepts the whole invitation link', () => {
    expect(parseRoomCode('https://example.app/?room=ab23cd&roomBackend=local')).toBe('AB23CD')
  })
  it('rejects anything that is not a 6-character code', () => {
    expect(parseRoomCode('ABC')).toBeNull()
    expect(parseRoomCode('ABC-234')).toBeNull()
    expect(parseRoomCode('')).toBeNull()
  })
})

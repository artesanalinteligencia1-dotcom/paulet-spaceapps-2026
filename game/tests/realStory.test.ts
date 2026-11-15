import { describe, expect, it } from 'vitest'
import { parseVtt } from '../src/ui/video/RealStory'

describe('parseVtt', () => {
  it('reads cues, times and the speaker tag', () => {
    const cues = parseVtt('WEBVTT\n\n00:00:01.600 --> 00:00:06.990\nAntes de los satélites.\n\n01:02.500 --> 01:07.000\n<v Roberto>A treinta y seis mil kilómetros.\n')
    expect(cues).toHaveLength(2)
    expect(cues[0]).toMatchObject({ start: 1.6, end: 6.99, text: 'Antes de los satélites.' })
    expect(cues[1]).toMatchObject({ start: 62.5, end: 67, who: 'Roberto', text: 'A treinta y seis mil kilómetros.' })
  })
})

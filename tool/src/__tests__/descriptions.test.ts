// Every amp/effect name in every device vocabulary must have a character
// description. A bare enum name is a gear-knowledge test smaller models fail —
// so a vocab addition without a matching dictionary entry is a regression, and
// this test is what makes it fail loudly instead of shipping silently.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeToneName, describedList, type ToneNameCategory } from '../descriptions'
import { vocabForDevice } from '../vocab'
import { KATANA_DEVICES } from '../devices'

const CATEGORIES: [keyof ReturnType<typeof vocabForDevice>, ToneNameCategory][] = [
  ['amps', 'amp'],
  ['boosters', 'booster'],
  ['fx', 'fx'],
  ['delays', 'delay'],
  ['reverbs', 'reverb'],
]

test('every vocab name on every device has a description', () => {
  const missing: string[] = []
  for (const d of KATANA_DEVICES) {
    const vocab = vocabForDevice(d.id)
    for (const [list, category] of CATEGORIES) {
      for (const name of vocab[list]) {
        if (!describeToneName(name, category)) missing.push(`${d.id}/${category}: ${name}`)
      }
    }
  }
  assert.deepEqual(missing, [], `names with no description:\n  ${missing.join('\n  ')}`)
})

test('per-generation spellings share one entry', () => {
  const a = describeToneName('Chorus', 'fx')
  const b = describeToneName('CHORUS', 'fx')
  assert.ok(a)
  assert.equal(a, b)
  assert.equal(describeToneName('DST Plus', 'booster'), describeToneName('DST+', 'booster'))
})

test('Modulate is described as a delay and a reverb, differently', () => {
  const delay = describeToneName('Modulate', 'delay')
  const reverb = describeToneName('Modulate', 'reverb')
  assert.ok(delay)
  assert.ok(reverb)
  assert.notEqual(delay, reverb)
})

test('describedList renders "Name — description" pairs', () => {
  const line = describedList(['Brown'], 'amp')
  assert.match(line, /^Brown — /)
  assert.match(line, /Van Halen/)
})

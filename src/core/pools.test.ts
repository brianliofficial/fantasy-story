import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { blankEvent } from './defaults'
import { appendEvent, moveEvent, sanitizePools } from './pools'
import type { GameEventConfig } from './types'

function card(id: string, type: string): GameEventConfig {
  const event = blankEvent()
  event.id = id
  event.type = type
  event.title = id
  event.options[0]!.text = 'Okay'
  event.options[0]!.success.log = 'Okay.'
  return event
}

describe('event pools', () => {
  it('keeps a custom pool and still lists pools that have cards', () => {
    const pools = sanitizePools(['Infant', 'Road'], [card('one', 'War')])
    assert.deepEqual(pools, ['Infant', 'Road', 'War'])
  })

  it('moves a card into another pool at an index', () => {
    const events = [card('a', 'Infant'), card('b', 'Infant'), card('c', 'Child')]
    const moved = moveEvent(events, 'c', 'Infant', 1)
    assert.deepEqual(moved.map((event) => `${event.type}:${event.id}`), ['Infant:a', 'Infant:c', 'Infant:b'])
  })

  it('appends a new card to the end of its pool', () => {
    const events = [card('a', 'Infant'), card('b', 'Child')]
    const added = appendEvent(events, card('d', 'Infant'))
    assert.deepEqual(added.map((event) => event.id), ['a', 'd', 'b'])
  })
})

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { blankEvent } from './defaults'
import { appendEvent, ledgerPools, moveEvent, sameLedger, sanitizePools } from './pools'
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

  it('keeps an empty supabase pool empty', () => {
    assert.deepEqual(ledgerPools([], []), [])
  })

  it('uses the supabase pool list without adding the built-in pools', () => {
    assert.deepEqual(ledgerPools(['War'], []), ['War'])
  })

  it('treats the same cards and pools as one ledger', () => {
    const events = [card('a', 'Infant')]
    const copy = JSON.parse(JSON.stringify(events)) as GameEventConfig[]
    assert.equal(sameLedger(events, ['Infant'], copy, ['Infant']), true)
    copy[0]!.title = 'Changed'
    assert.equal(sameLedger(events, ['Infant'], copy, ['Infant']), false)
    assert.equal(sameLedger(events, ['Infant'], events, ['Child']), false)
  })

  it('appends a new card to the end of its pool', () => {
    const events = [card('a', 'Infant'), card('b', 'Child')]
    const added = appendEvent(events, card('d', 'Infant'))
    assert.deepEqual(added.map((event) => event.id), ['a', 'd', 'b'])
  })
})

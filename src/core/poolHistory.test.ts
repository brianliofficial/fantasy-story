import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { blankEvent } from './defaults'
import { readPoolHistory, rememberSnapshot, type PoolSnapshot } from './poolHistory'
import type { GameEventConfig } from './types'

function card(id: string, type: string): GameEventConfig {
  const event = blankEvent()
  event.id = id
  event.type = type
  event.title = id
  return event
}

describe('event pool history', () => {
  it('keeps the five newest automatic copies', () => {
    let history: PoolSnapshot[] = []
    for (let index = 0; index < 6; index += 1) {
      history = rememberSnapshot(history, [card(`e${index}`, 'Dwarf')], [`Pool ${index}`], `Before change ${index}`, 1_000 + index)
    }
    assert.equal(history.length, 5)
    assert.deepEqual(history.map((item) => item.pools[0]), ['Pool 5', 'Pool 4', 'Pool 3', 'Pool 2', 'Pool 1'])
    assert.equal(history[0]?.reason, 'Before change 5')
    assert.equal(history[0]?.savedAt, 1_005)
    assert.notEqual(history[0]?.events[0], undefined)
  })

  it('does not store the same pool twice in a row', () => {
    const events = [card('a', 'Dwarf')]
    const once = rememberSnapshot([], events, ['Dwarf'], 'Auto save', 10)
    const twice = rememberSnapshot(once, events, ['Dwarf'], 'Auto save', 20)
    assert.equal(twice.length, 1)
    assert.equal(twice[0]?.savedAt, 10)
  })

  it('keeps a manual save even when the pool has not changed', () => {
    const events = [card('a', 'Dwarf')]
    const once = rememberSnapshot([], events, ['Dwarf'], 'Auto save', 10)
    const manual = rememberSnapshot(once, events, ['Dwarf'], 'Manual save', 40, true)
    assert.equal(manual.length, 1)
    assert.equal(manual[0]?.reason, 'Manual save')
    assert.equal(manual[0]?.savedAt, 40)
    assert.equal(manual[0]?.id, once[0]?.id)
  })

  it('reads saved copies and ignores a broken store', () => {
    const saved = rememberSnapshot([], [card('a', 'Dwarf')], ['Dwarf'], 'Before deleting Dwarf', 30)
    const raw = JSON.stringify([{ savedAt: 'nope' }, ...saved])
    const read = readPoolHistory(raw)
    assert.equal(read.length, 1)
    assert.equal(read[0]?.reason, 'Before deleting Dwarf')
    assert.equal(read[0]?.pools[0], 'Dwarf')
    assert.deepEqual(readPoolHistory('not json'), [])
    assert.deepEqual(readPoolHistory(null), [])
  })
})

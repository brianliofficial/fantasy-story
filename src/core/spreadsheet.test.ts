import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as XLSX from 'xlsx'
import { blankEvent } from './defaults'
import { eventPoolWorkbook, readEventPoolWorkbook } from './spreadsheet'
import type { GameEventConfig } from './types'

function card(id: string, type: string): GameEventConfig {
  const event = blankEvent()
  event.id = id
  event.type = type
  event.title = id
  event.description = 'A year passes.'
  event.minAge = 6
  event.maxAge = 12
  event.showLimit = 2
  event.repeatAfter = 4
  event.mandatory = true
  event.requiredRace = ['Elf']
  event.requiredClass = ['Noble']
  event.options[0]!.id = `${id}-go`
  event.options[0]!.text = 'Go on'
  event.options[0]!.checkStat = 'charisma'
  event.options[0]!.goldCost = 40
  event.options[0]!.threshold = 50
  event.options[0]!.success = { log: 'It works.', effect: { charisma: 3 } }
  event.options[0]!.failure = { log: 'It fails.', effect: { charisma: -2 } }
  return event
}

describe('event pool workbook', () => {
  it('reads back the events and pool order', () => {
    const events = [card('toy', 'Child'), card('fair', 'Teenager')]
    const bytes = eventPoolWorkbook(events, ['Child', 'Teenager', 'War'])
    const restored = readEventPoolWorkbook(bytes)
    assert.deepEqual(restored.pools, ['Child', 'Teenager', 'War'])
    assert.equal(restored.events.length, 2)
    assert.equal(restored.events[0]?.id, 'toy')
    assert.equal(restored.events[0]?.type, 'Child')
    assert.equal(restored.events[0]?.minAge, 6)
    assert.equal(restored.events[0]?.showLimit, 2)
    assert.equal(restored.events[0]?.repeatAfter, 4)
    assert.equal(restored.events[0]?.mandatory, true)
    assert.deepEqual(restored.events[0]?.requiredRace, ['Elf'])
    assert.deepEqual(restored.events[0]?.requiredClass, ['Noble'])
    assert.equal(restored.events[0]?.options[0]?.text, 'Go on')
    assert.equal(restored.events[0]?.options[0]?.checkStat, 'charisma')
    assert.equal(restored.events[0]?.options[0]?.goldCost, 40)
    assert.equal(restored.events[0]?.options[0]?.success.effect.charisma, 3)
    assert.equal(restored.events[1]?.id, 'fair')
  })

  it('keeps an empty pool file empty', () => {
    const bytes = eventPoolWorkbook([], [])
    assert.deepEqual(readEventPoolWorkbook(bytes), { events: [], pools: [] })
  })

  it('rejects a workbook without the event columns', () => {
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['title'], ['House fire']]), 'Events')
    const bytes = XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
    assert.throws(() => readEventPoolWorkbook(new Uint8Array(bytes)), /id, pool, and options/)
  })
})
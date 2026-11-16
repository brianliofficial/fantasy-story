import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { seedEvents } from './defaults'
import { chooseLedger } from './ledger'
import { defaultPools } from './pools'
import { sanitizeEvents } from './sanitize'
import type { GameEventConfig } from './types'

const seed = seedEvents()
const pools = defaultPools()
const saved = sanitizeEvents(seed) as GameEventConfig[]

function renamed(events: GameEventConfig[], title: string): GameEventConfig[] {
  return events.map((event, index) => (index === 0 ? { ...event, title } : event))
}

describe('event ledger', () => {
  it('loads the supabase pool instead of restoring defaults', () => {
    const remote = { events: renamed(saved, 'From supabase'), pools }
    const choice = chooseLedger(saved, pools, remote, seed, pools)
    assert.equal(choice.upload, false)
    assert.equal(choice.events[0]?.title, 'From supabase')
  })

  it('uploads a custom local pool that supabase does not have yet', () => {
    const local = renamed(saved, 'My fire')
    const choice = chooseLedger(local, pools, { events: saved, pools }, seed, pools)
    assert.equal(choice.upload, true)
    assert.equal(choice.events[0]?.title, 'My fire')
  })

  it('does not upload when both sides already match', () => {
    const choice = chooseLedger(saved, pools, { events: saved, pools }, seed, pools)
    assert.equal(choice.upload, false)
    assert.equal(choice.events.length, saved.length)
  })

  it('fills an empty supabase from the saved pool once', () => {
    const local = renamed(saved, 'My fire')
    const choice = chooseLedger(local, pools, { events: [], pools: [] }, seed, pools)
    assert.equal(choice.upload, true)
    assert.equal(choice.events[0]?.title, 'My fire')
  })

  it('keeps the local pool when supabase is not configured', () => {
    const local = renamed(saved, 'My fire')
    const choice = chooseLedger(local, pools, null, seed, pools)
    assert.equal(choice.upload, false)
    assert.equal(choice.events[0]?.title, 'My fire')
  })
})

import { POOL_HISTORY_LIMIT, readPoolHistory, type PoolSnapshot } from './poolHistory'
import { sanitizeEvents } from './sanitize'
import type { GameEventConfig } from './types'

interface EventRow {
  id: string
  pool: string
  title: string
  description: string
  min_age: number | null
  max_age: number | null
  show_limit: number | null
  required_race: GameEventConfig['requiredRace']
  required_class: GameEventConfig['requiredClass']
  options: GameEventConfig['options']
  position: number
  repeat_after?: number | null
  mandatory?: boolean | null
}

interface PoolRow {
  name: string
  position: number
}

export function supabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseKey())
}

export async function loadEventLedger(): Promise<{ events: GameEventConfig[]; pools: string[] }> {
  const [eventRows, poolRows] = await Promise.all([
    rest<EventRow[]>('game_events?select=*&order=position.asc'),
    rest<PoolRow[]>('event_pools?select=*&order=position.asc'),
  ])
  const events = sanitizeEvents((eventRows ?? []).map(eventFromRow)) ?? []
  const pools = (poolRows ?? []).map((row) => row.name).filter((name) => name.trim())
  return { events, pools }
}

let saveQueue = Promise.resolve()

export function saveEventLedger(events: GameEventConfig[], pools: string[]): Promise<void> {
  const run = saveQueue.then(() => writeLedger(events, pools))
  saveQueue = run.then(() => undefined, () => undefined)
  return run
}

async function writeLedger(events: GameEventConfig[], pools: string[]): Promise<void> {
  let includeRepeat = true
  let includeMandatory = true
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await writeEvents(events, includeRepeat, includeMandatory)
      break
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : ''
      if (includeRepeat && message.includes('repeat_after')) {
        includeRepeat = false
        continue
      }
      if (includeMandatory && message.includes('mandatory')) {
        includeMandatory = false
        continue
      }
      throw caught
    }
  }
  const poolRows = pools.map((name, position) => ({ name, position }))
  if (poolRows.length > 0) {
    await rest('event_pools?on_conflict=name', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(poolRows),
    })
  }
  await deleteMissing('game_events', 'id', events.map((event) => event.id))
  await deleteMissing('event_pools', 'name', pools)
}

async function writeEvents(events: GameEventConfig[], includeRepeat: boolean, includeMandatory: boolean): Promise<void> {
  if (events.length === 0) return
  const eventRows = events.map((event, position) => eventToRow(event, position, includeRepeat, includeMandatory))
  await rest('game_events?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(eventRows),
  })
}

function eventToRow(event: GameEventConfig, position: number, includeRepeat: boolean, includeMandatory: boolean): EventRow {
  const row: EventRow = {
    id: event.id,
    pool: event.type,
    title: event.title,
    description: event.description,
    min_age: event.minAge ?? null,
    max_age: event.maxAge ?? null,
    show_limit: event.showLimit ?? null,
    required_race: event.requiredRace ?? [],
    required_class: event.requiredClass ?? [],
    options: event.options,
    position,
  }
  if (includeRepeat) row.repeat_after = event.repeatAfter ?? null
  if (includeMandatory) row.mandatory = event.mandatory === true
  return row
}

function eventFromRow(row: EventRow): unknown {
  return {
    id: row.id,
    type: row.pool,
    title: row.title,
    description: row.description,
    minAge: row.min_age ?? undefined,
    maxAge: row.max_age ?? undefined,
    showLimit: row.show_limit ?? undefined,
    requiredRace: row.required_race,
    requiredClass: row.required_class,
    options: row.options,
    repeatAfter: row.repeat_after ?? undefined,
    mandatory: row.mandatory === true,
  }
}

async function deleteMissing(table: string, column: string, keep: string[]): Promise<void> {
  if (keep.length === 0) {
    await rest(`${table}?${column}=not.is.null`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
    return
  }
  const list = keep.map((value) => `"${value.replace(/"/g, '')}"`).join(',')
  await rest(`${table}?${column}=not.in.(${list})`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
}

interface HistoryRow {
  id: string
  saved_at: number | string
  reason: string
  events: GameEventConfig[]
  pools: string[]
}

let historyQueue = Promise.resolve()

export async function loadPoolHistory(): Promise<PoolSnapshot[]> {
  const rows = await rest<HistoryRow[]>('pool_history?select=*&order=saved_at.desc') ?? []
  const keep = historyFromRows(rows).slice(0, POOL_HISTORY_LIMIT)
  if (rows.length > keep.length) await deleteMissing('pool_history', 'id', keep.map((snapshot) => snapshot.id))
  return keep
}

export function savePoolHistoryRows(snapshots: PoolSnapshot[]): Promise<void> {
  const keep = snapshots.slice(0, POOL_HISTORY_LIMIT)
  if (keep.length === 0) return Promise.resolve()
  const run = historyQueue.then(() => writePoolHistory(keep))
  historyQueue = run.then(() => undefined, () => undefined)
  return run
}

async function writePoolHistory(keep: PoolSnapshot[]): Promise<void> {
  await rest('pool_history?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(keep.map((snapshot) => ({
      id: snapshot.id,
      saved_at: snapshot.savedAt,
      reason: snapshot.reason,
      events: snapshot.events,
      pools: snapshot.pools,
    }))),
  })
  await deleteMissing('pool_history', 'id', keep.map((snapshot) => snapshot.id))
}

function historyFromRows(rows: HistoryRow[]): PoolSnapshot[] {
  const snapshots = rows.flatMap((row) => {
    const savedAt = typeof row.saved_at === 'number' ? row.saved_at : Number(row.saved_at)
    if (!Number.isFinite(savedAt)) return []
    return [{ id: row.id, savedAt, reason: row.reason, events: row.events, pools: row.pools }]
  })
  return readPoolHistory(JSON.stringify(snapshots))
}

function supabaseUrl(): string {
  return (import.meta.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/$/, '')
}

function supabaseKey(): string {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
}

function restBase(): string {
  const url = supabaseUrl()
  if (url.endsWith('/rest/v1')) return url
  return `${url}/rest/v1`
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const key = supabaseKey()
  if (!supabaseUrl() || !key) throw new Error('Supabase is not configured.')
  const response = await fetch(`${restBase()}/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || response.statusText)
  }
  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) as T : null
}

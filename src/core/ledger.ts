import { sanitizeEvent, sanitizeEvents } from './sanitize'
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
}

interface PoolRow {
  name: string
  position: number
}

export interface LedgerChoice {
  events: GameEventConfig[]
  pools: string[]
  upload: boolean
}

export function chooseLedger(
  localEvents: GameEventConfig[] | null,
  localPools: string[],
  remote: { events: GameEventConfig[]; pools: string[] } | null,
  seed: GameEventConfig[],
  seedPools: string[],
): LedgerChoice {
  const localIsDefault = !localEvents
    || localEvents.length === 0
    || (sameEvents(localEvents, seed) && sameList(localPools, seedPools))
  if (remote && remote.events.length > 0) {
    const remotePools = remote.pools.length > 0 ? remote.pools : localPools
    if (localEvents && localEvents.length > 0 && !localIsDefault && !sameEvents(localEvents, remote.events)) {
      return { events: localEvents, pools: localPools, upload: true }
    }
    return { events: remote.events, pools: remotePools, upload: false }
  }
  if (localEvents && localEvents.length > 0) {
    return { events: localEvents, pools: localPools, upload: remote !== null }
  }
  return { events: seed, pools: seedPools, upload: remote !== null }
}

function sameEvents(left: GameEventConfig[], right: GameEventConfig[]): boolean {
  return JSON.stringify(left.map(canonicalEvent)) === JSON.stringify(right.map(canonicalEvent))
}

function canonicalEvent(event: GameEventConfig): GameEventConfig | null {
  return sanitizeEvent(event)
}

function sameList(left: string[], right: string[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
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
  try {
    await writeEvents(events, true)
  } catch (caught) {
    if (!missingRepeatColumn(caught)) throw caught
    await writeEvents(events, false)
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

async function writeEvents(events: GameEventConfig[], includeRepeat: boolean): Promise<void> {
  if (events.length === 0) return
  const eventRows = events.map((event, position) => eventToRow(event, position, includeRepeat))
  await rest('game_events?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(eventRows),
  })
}

function missingRepeatColumn(caught: unknown): boolean {
  return caught instanceof Error && caught.message.includes('repeat_after')
}

function eventToRow(event: GameEventConfig, position: number, includeRepeat: boolean): EventRow {
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

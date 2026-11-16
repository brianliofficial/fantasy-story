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

export async function saveEventLedger(events: GameEventConfig[], pools: string[]): Promise<void> {
  const eventRows = events.map((event, position) => eventToRow(event, position))
  const poolRows = pools.map((name, position) => ({ name, position }))
  if (eventRows.length > 0) {
    await rest('game_events?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(eventRows),
    })
  }
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

function eventToRow(event: GameEventConfig, position: number): EventRow {
  return {
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

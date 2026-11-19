import { cloneData } from './clone'
import { uid } from './id'
import { sanitizeEvents } from './sanitize'
import { DEFAULT_POOLS } from './types'
import type { GameEventConfig } from './types'

export function defaultPools(): string[] {
  return [...DEFAULT_POOLS]
}

export function sameLedger(
  events: GameEventConfig[],
  pools: string[],
  nextEvents: GameEventConfig[],
  nextPools: string[],
): boolean {
  return JSON.stringify(sanitizeEvents(events) ?? []) === JSON.stringify(sanitizeEvents(nextEvents) ?? [])
    && JSON.stringify(pools) === JSON.stringify(nextPools)
}

export function ledgerPools(poolNames: string[], events: GameEventConfig[]): string[] {
  if (poolNames.length === 0 && events.length === 0) return []
  const listed = poolNames.length > 0 ? poolNames : events.map((event) => event.type)
  return sanitizePools(listed, events)
}

export function sanitizePools(value: unknown, events: GameEventConfig[]): string[] {
  const names: string[] = []
  const add = (name: string) => {
    const trimmed = name.trim().slice(0, 40)
    if (!trimmed || names.some((item) => item.toLowerCase() === trimmed.toLowerCase())) return
    names.push(trimmed)
  }
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (typeof item === 'string') add(item)
    })
  }
  if (names.length === 0) defaultPools().forEach(add)
  events.forEach((event) => add(event.type))
  return names
}

export function moveEvent(events: GameEventConfig[], id: string, pool: string, index: number): GameEventConfig[] {
  const event = events.find((item) => item.id === id)
  if (!event) return events
  const others = events.filter((item) => item.id !== id)
  const moved = { ...event, type: pool }
  const inPool = others.filter((item) => item.type === pool)
  const clamped = Math.max(0, Math.min(index, inPool.length))
  inPool.splice(clamped, 0, moved)
  const result: GameEventConfig[] = []
  let inserted = false
  for (const item of others) {
    if (item.type === pool) {
      if (!inserted) {
        result.push(...inPool)
        inserted = true
      }
      continue
    }
    result.push(item)
  }
  if (!inserted) result.push(...inPool)
  return result
}

export function appendEvent(events: GameEventConfig[], event: GameEventConfig): GameEventConfig[] {
  return moveEvent([...events.filter((item) => item.id !== event.id), event], event.id, event.type, Number.MAX_SAFE_INTEGER)
}

export function duplicateEvent(events: GameEventConfig[], id: string): GameEventConfig[] {
  const index = events.findIndex((item) => item.id === id)
  const event = events[index]
  if (!event || index < 0) return events
  const copy = cloneData(event)
  copy.id = uid()
  copy.title = event.title.trim() ? `${event.title.trim().slice(0, 55)} copy` : 'Copy'
  copy.options = copy.options.map((option) => ({ ...option, id: uid() }))
  const next = [...events]
  next.splice(index + 1, 0, copy)
  return next
}

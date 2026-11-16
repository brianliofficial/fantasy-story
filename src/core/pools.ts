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

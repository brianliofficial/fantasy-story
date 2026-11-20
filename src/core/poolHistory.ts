import { cloneData } from './clone'
import { uid } from './id'
import { sameLedger } from './pools'
import type { GameEventConfig } from './types'

export const POOL_HISTORY_LIMIT = 5
export const POOL_HISTORY_KEY = 'fantasylife.poolHistory'

export interface PoolSnapshot {
  id: string
  savedAt: number
  reason: string
  events: GameEventConfig[]
  pools: string[]
}

export function rememberSnapshot(
  history: PoolSnapshot[],
  events: GameEventConfig[],
  pools: string[],
  reason: string,
  now = Date.now(),
): PoolSnapshot[] {
  const eventsCopy = cloneData(events)
  const poolsCopy = [...pools]
  const newest = history[0]
  if (newest && sameLedger(newest.events, newest.pools, eventsCopy, poolsCopy)) return history
  const next: PoolSnapshot = {
    id: uid(),
    savedAt: now,
    reason: reason.trim().slice(0, 120) || 'Auto save',
    events: eventsCopy,
    pools: poolsCopy,
  }
  return [next, ...history].slice(0, POOL_HISTORY_LIMIT)
}

export function readPoolHistory(raw: string | null): PoolSnapshot[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const snapshots: PoolSnapshot[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const record = item as Partial<PoolSnapshot>
      if (typeof record.id !== 'string' || typeof record.savedAt !== 'number') continue
      if (!Array.isArray(record.events) || !Array.isArray(record.pools)) continue
      snapshots.push({
        id: record.id,
        savedAt: record.savedAt,
        reason: typeof record.reason === 'string' && record.reason.trim() ? record.reason : 'Auto save',
        events: record.events,
        pools: record.pools.filter((pool): pool is string => typeof pool === 'string'),
      })
    }
    return snapshots.slice(0, POOL_HISTORY_LIMIT)
  } catch {
    return []
  }
}

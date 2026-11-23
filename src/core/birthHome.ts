import { article } from './childhood'
import type { Race, SocialClass } from './types'

const ADJECTIVES = [
  'beautiful',
  'enormous',
  'crumbling',
  'modest',
  'ancient',
  'tidy',
  'gloomy',
  'warm',
  'grand',
  'weathered',
  'quiet',
  'sturdy',
]

const PLACES: Record<Race, { first: string[]; second: string[] }> = {
  Elf: {
    first: ['Silver', 'Moon', 'Star', 'Dawn', 'Willow', 'Ash', 'Night', 'Bright'],
    second: ['glen', 'mere', 'wood', 'vale', 'leaf', 'hollow', 'brook', 'spire'],
  },
  Human: {
    first: ['Bright', 'High', 'Stone', 'River', 'Gold', 'Fair', 'Red', 'White'],
    second: ['spire', 'ford', 'haven', 'field', 'keep', 'bridge', 'shire', 'burg'],
  },
  Dwarf: {
    first: ['Iron', 'Deep', 'Stone', 'Copper', 'Flint', 'Gold', 'Granite', 'Ember'],
    second: ['hold', 'delve', 'hall', 'forge', 'peak', 'mine', 'gate', 'vault'],
  },
}

const HOMES: Record<SocialClass, string[]> = {
  Peasant: ['cottage', 'hut', 'cabin', 'hovel', 'shack'],
  Journeyman: ['cottage', 'townhouse', 'workshop', 'tenement', 'house'],
  Merchant: ['townhouse', 'villa', 'shop', 'mansion', 'house'],
  Noble: ['manor', 'castle', 'estate', 'palace', 'hall'],
}

function pick(list: string[], random: () => number, avoid?: Set<string>): string {
  const pool = avoid ? list.filter((word) => !avoid.has(word)) : list
  const source = pool.length > 0 ? pool : list
  const index = Math.min(source.length - 1, Math.floor(random() * source.length))
  return source[index] ?? source[0]
}

export function birthHome(race: Race, socialClass: SocialClass, random: () => number = Math.random): string {
  const parts = PLACES[race]
  const place = `${pick(parts.first, random)}${pick(parts.second, random)}`
  const first = pick(ADJECTIVES, random)
  const second = pick(ADJECTIVES, random, new Set([first]))
  const home = pick(HOMES[socialClass], random)
  const className = socialClass.toLowerCase()
  const raceName = race.toLowerCase()
  return `You are born to a ${className} ${raceName} family living in ${place}. Your home is ${article(first)} ${first}, ${second} ${home}.`
}

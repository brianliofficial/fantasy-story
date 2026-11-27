import { article } from './childhood'
import type { BirthHomeWords, BirthPlace, Race, SocialClass } from './types'

export const DEFAULT_ADJECTIVES = [
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

export const DEFAULT_PLACES: Record<Race, BirthPlace> = {
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

export function defaultBirthHome(): BirthHomeWords {
  return {
    adjectives: [...DEFAULT_ADJECTIVES],
    places: {
      Elf: { first: [...DEFAULT_PLACES.Elf.first], second: [...DEFAULT_PLACES.Elf.second] },
      Human: { first: [...DEFAULT_PLACES.Human.first], second: [...DEFAULT_PLACES.Human.second] },
      Dwarf: { first: [...DEFAULT_PLACES.Dwarf.first], second: [...DEFAULT_PLACES.Dwarf.second] },
    },
  }
}

function wordsOr(list: string[] | undefined, fallback: string[]): string[] {
  const words = (list ?? []).map((word) => word.trim()).filter(Boolean)
  return words.length > 0 ? words : fallback
}

function pick(list: string[], random: () => number, avoid?: Set<string>): string {
  const pool = avoid ? list.filter((word) => !avoid.has(word)) : list
  const source = pool.length > 0 ? pool : list
  const index = Math.min(source.length - 1, Math.floor(random() * source.length))
  return source[index] ?? source[0]
}

export function birthHome(
  race: Race,
  socialClass: SocialClass,
  random: () => number = Math.random,
  words?: BirthHomeWords,
): string {
  const parts = words?.places[race]
  const place = `${pick(wordsOr(parts?.first, DEFAULT_PLACES[race].first), random)}${pick(wordsOr(parts?.second, DEFAULT_PLACES[race].second), random)}`
  const adjectives = wordsOr(words?.adjectives, DEFAULT_ADJECTIVES)
  const first = pick(adjectives, random)
  const second = pick(adjectives, random, new Set([first]))
  const home = pick(HOMES[socialClass], random)
  const className = socialClass.toLowerCase()
  const raceName = race.toLowerCase()
  return `You are born to a ${className} ${raceName} family living in ${place}. Your home is ${article(first)} ${first}, ${second} ${home}.`
}

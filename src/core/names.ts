import type { Gender, Race, RaceNames } from './types'

export const NAME_LIMIT = 24

export function cleanNamePart(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, NAME_LIMIT)
}

export function parseNameList(text: string): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const raw of text.split(/\n/)) {
    const name = cleanNamePart(raw)
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    names.push(name)
    if (names.length >= 60) break
  }
  return names
}

function randomIndex(random: () => number, length: number): number {
  if (length <= 1) return 0
  return Math.min(length - 1, Math.floor(random() * length))
}

export function pickDistinct(list: string[], random: () => number, avoid: Set<string>, fallback: string): string {
  const pool = list.map((item) => item.trim()).filter((name) => name && !avoid.has(name.toLowerCase()))
  if (pool.length > 0) return pool[randomIndex(random, pool.length)] ?? pool[0]
  if (!avoid.has(fallback.toLowerCase())) return fallback
  return `${fallback} ${avoid.size + 1}`
}

export function randomIdentity(
  names: RaceNames,
  gender: Gender,
  random: () => number = Math.random,
): { forename: string; surname: string } {
  const forenames = gender === 'female' ? names.femaleForenames : names.maleForenames
  return {
    forename: pickDistinct(forenames, random, new Set(), gender === 'female' ? 'Mira' : 'Alden'),
    surname: pickDistinct(names.surnames, random, new Set(), 'Hale'),
  }
}

export function defaultRaceNames(): Record<Race, RaceNames> {
  return {
    Elf: {
      maleForenames: ['Illdros', 'Aelar', 'Caelum', 'Vaelor', 'Lirien', 'Elandor', 'Sylvar', 'Theren'],
      femaleForenames: ['Ellanda', 'Siama', 'Lyra', 'Miriel', 'Aeris', 'Elysia', 'Naivara', 'Sariel'],
      surnames: ['Tevin', 'Moonbrook', 'Starwind', 'Silverglen', 'Dawnmere', 'Nightbloom'],
    },
    Human: {
      maleForenames: ['Aldric', 'Tomas', 'Henrik', 'Cedric', 'Marcus', 'Owen', 'Ellis', 'Rowan'],
      femaleForenames: ['Elena', 'Mara', 'Isolde', 'Brenna', 'Clara', 'Edith', 'Nora', 'Hana'],
      surnames: ['Harwick', 'Cole', 'Brennan', 'Hale', 'Mercer', 'Ashford', 'Pembroke', 'Langley'],
    },
    Dwarf: {
      maleForenames: ['Durgan', 'Bromli', 'Kazrin', 'Hargin', 'Tordek', 'Bram', 'Orsik', 'Vondal'],
      femaleForenames: ['Helga', 'Bruna', 'Magna', 'Sigrid', 'Freya', 'Thora', 'Dagna', 'Inga'],
      surnames: ['Stonehammer', 'Ironfoot', 'Deepdelve', 'Coppervein', 'Flintbeard', 'Goldmantle'],
    },
  }
}

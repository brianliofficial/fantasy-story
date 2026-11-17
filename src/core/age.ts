export interface AgeBand {
  tag: string
  pool: string
  minAge: number
  maxAge: number
  names: string[]
}

export const AGE_BANDS: AgeBand[] = [
  { tag: 'Infants', pool: 'Infant', minAge: 0, maxAge: 5, names: ['Infant', 'Infants'] },
  { tag: 'Child', pool: 'Child', minAge: 6, maxAge: 12, names: ['Child'] },
  { tag: 'Teenager', pool: 'Teenager', minAge: 13, maxAge: 18, names: ['Teenager'] },
  { tag: 'Adult', pool: 'Adult', minAge: 19, maxAge: 100, names: ['Adult'] },
]

export function ageTagFor(age: number): AgeBand | null {
  return AGE_BANDS.find((band) => age >= band.minAge && age <= band.maxAge) ?? null
}

export function agePoolFor(pool: string): AgeBand | null {
  const key = pool.trim().toLowerCase()
  return AGE_BANDS.find((band) => band.names.some((name) => name.toLowerCase() === key)) ?? null
}

export function ageTagLabel(band: AgeBand): string {
  return `${band.tag} · ${band.minAge}–${band.maxAge}`
}

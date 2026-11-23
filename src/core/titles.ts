import { nobleTitles } from './childhood'
import type { Life, Person } from './types'

const NOBLE_TITLES = new Set(nobleTitles())

export function isNobleTitle(value: string | undefined): value is string {
  return typeof value === 'string' && NOBLE_TITLES.has(value)
}

export function nobleTitle(random: () => number): string {
  const titles = nobleTitles()
  const index = Math.min(titles.length - 1, Math.floor(random() * titles.length))
  return titles[index] ?? titles[0]
}

export function personName(person: Pick<Person, 'name' | 'title' | 'occupation'>): string {
  const title = isNobleTitle(person.title) ? person.title : (isNobleTitle(person.occupation) ? person.occupation : '')
  return title ? `${title} ${person.name}` : person.name
}

export function lifeName(life: Pick<Life, 'name' | 'title'>): string {
  return isNobleTitle(life.title) ? `${life.title} ${life.name}` : life.name
}

export function ensureNobleTitles<T extends Pick<Life, 'socialClass' | 'title' | 'people'>>(life: T, random: () => number = Math.random): T {
  if (life.socialClass !== 'Noble') return life
  const title = isNobleTitle(life.title) ? life.title : nobleTitle(random)
  let changed = title !== life.title
  const people = life.people.map((person) => {
    if (person.role !== 'parent' && person.role !== 'sibling') return person
    if (isNobleTitle(person.title)) return person
    const rank = isNobleTitle(person.occupation) ? person.occupation : nobleTitle(random)
    changed = true
    return { ...person, title: rank }
  })
  return changed ? { ...life, title, people } : life
}

import { defaultConfig } from './defaults'
import { isRecord } from './guard'
import { cleanNamePart, parseNameList } from './names'
import type {
  CheckStat,
  EventOption,
  GameConfig,
  GameEventConfig,
  AgeWindow,
  Betrothal,
  Gender,
  HouseholdDuty,
  Life,
  LogEntry,
  Occupation,
  Person,
  Race,
  TeacherOffer,
  RaceBonus,
  RaceNames,
  RelationRole,
  SocialClass,
  StatChange,
  YearActivity,
} from './types'
import { CHECK_STATS, CLASSES, MAX_AGE, RACES } from './types'

function isRace(value: unknown): value is Race {
  return RACES.includes(value as Race)
}

function isClass(value: unknown): value is SocialClass {
  return CLASSES.includes(value as SocialClass)
}

function isCheckStat(value: unknown): value is CheckStat {
  return CHECK_STATS.includes(value as CheckStat)
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback
}

function readAge(value: unknown): number | undefined | null {
  if (value == null || value === '') return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const age = Math.round(value)
  if (age < 0 || age > MAX_AGE) return null
  return age
}

function statChange(value: unknown): StatChange {
  if (!isRecord(value)) return {}
  const effect: StatChange = {}
  for (const key of ['constitution', 'charisma', 'intelligence', 'gold', 'parentRelationship'] as const) {
    if (typeof value[key] === 'number' && Number.isFinite(value[key])) effect[key] = Math.round(value[key])
  }
  return effect
}

function sanitizeOption(value: unknown): EventOption | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.text !== 'string') return null
  if (!isRecord(value.success) || typeof value.success.log !== 'string') return null
  const option: EventOption = {
    id: value.id,
    text: value.text.slice(0, 80),
    success: { log: value.success.log.slice(0, 400), effect: statChange(value.success.effect) },
  }
  if (isCheckStat(value.checkStat)) option.checkStat = value.checkStat
  if (value.checkHouse === true) option.checkHouse = true
  if (value.clearHouse === true) option.clearHouse = true
  if (typeof value.threshold === 'number' && Number.isFinite(value.threshold)) {
    option.threshold = Math.max(0, Math.min(100, Math.round(value.threshold)))
  }
  if (isRecord(value.failure) && typeof value.failure.log === 'string' && value.failure.log.trim()) {
    option.failure = { log: value.failure.log.slice(0, 400), effect: statChange(value.failure.effect) }
  }
  return option
}

export function sanitizeEvent(value: unknown): GameEventConfig | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id) return null
  if (typeof value.type !== 'string' || !value.type.trim() || typeof value.title !== 'string' || typeof value.description !== 'string') return null
  const minAge = readAge(value.minAge)
  const maxAge = readAge(value.maxAge)
  if (minAge === null || maxAge === null) return null
  if (minAge != null && maxAge != null && minAge > maxAge) return null
  if (!Array.isArray(value.options)) return null
  const options = value.options.map(sanitizeOption).filter((option): option is EventOption => option !== null)
  if (options.length === 0) return null
  const event: GameEventConfig = {
    id: value.id,
    type: value.type.trim().slice(0, 40),
    title: value.title.slice(0, 60),
    description: value.description.slice(0, 600),
    options,
  }
  if (minAge != null) event.minAge = minAge
  if (maxAge != null) event.maxAge = maxAge
  if (Array.isArray(value.requiredRace)) {
    const races = value.requiredRace.filter(isRace)
    if (races.length > 0) event.requiredRace = races
  }
  if (Array.isArray(value.requiredClass)) {
    const classes = value.requiredClass.filter(isClass)
    if (classes.length > 0) event.requiredClass = classes
  }
  if (typeof value.showLimit === 'number' && Number.isFinite(value.showLimit)) {
    const cap = event.type === 'Anytime' ? 5 : 99
    event.showLimit = Math.max(1, Math.min(cap, Math.round(value.showLimit)))
  } else if (event.type === 'Anytime') {
    event.showLimit = 5
  } else if (event.type === 'Milestone') {
    event.showLimit = 1
  }
  if (typeof value.repeatAfter === 'number' && Number.isFinite(value.repeatAfter)) {
    event.repeatAfter = Math.max(0, Math.min(120, Math.round(value.repeatAfter)))
  } else if (event.id === 'Anytime_event_001') {
    event.repeatAfter = 10
  }
  return event
}

export function sanitizeEvents(value: unknown): GameEventConfig[] | null {
  if (!Array.isArray(value)) return null
  const events = value.map(sanitizeEvent).filter((event): event is GameEventConfig => event !== null)
  return events.length > 0 ? events : null
}

function bonus(value: unknown, fallback: RaceBonus): RaceBonus {
  if (!isRecord(value)) return fallback
  return {
    constitution: Math.max(-40, Math.min(40, numberOr(value.constitution, fallback.constitution))),
    charisma: Math.max(-40, Math.min(40, numberOr(value.charisma, fallback.charisma))),
    intelligence: Math.max(-40, Math.min(40, numberOr(value.intelligence, fallback.intelligence))),
  }
}

function nameList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback]
  return parseNameList(value.filter((item): item is string => typeof item === 'string').join('\n'))
}

function raceNames(value: unknown, fallback: RaceNames): RaceNames {
  if (!isRecord(value)) return {
    maleForenames: [...fallback.maleForenames],
    femaleForenames: [...fallback.femaleForenames],
    surnames: [...fallback.surnames],
  }
  return {
    maleForenames: nameList(value.maleForenames, fallback.maleForenames),
    femaleForenames: nameList(value.femaleForenames, fallback.femaleForenames),
    surnames: nameList(value.surnames, fallback.surnames),
  }
}

export function sanitizeConfig(value: unknown): GameConfig {
  const base = defaultConfig()
  if (!isRecord(value)) return base
  const races = isRecord(value.races) ? value.races : {}
  const names = isRecord(value.names) ? value.names : {}
  const housing = isRecord(value.housing) ? value.housing : {}
  const aging = isRecord(value.aging) ? value.aging : {}
  return {
    races: {
      Elf: bonus(races.Elf, base.races.Elf),
      Human: bonus(races.Human, base.races.Human),
      Dwarf: bonus(races.Dwarf, base.races.Dwarf),
    },
    names: {
      Elf: raceNames(names.Elf, base.names.Elf),
      Human: raceNames(names.Human, base.names.Human),
      Dwarf: raceNames(names.Dwarf, base.names.Dwarf),
    },
    housing: {
      Peasant: Math.max(0, numberOr(housing.Peasant, base.housing.Peasant)),
      Journeyman: Math.max(0, numberOr(housing.Journeyman, base.housing.Journeyman)),
      Merchant: Math.max(0, numberOr(housing.Merchant, base.housing.Merchant)),
      Noble: Math.max(0, numberOr(housing.Noble, base.housing.Noble)),
    },
    aging: {
      startAge: Math.max(1, Math.min(MAX_AGE, numberOr(aging.startAge, base.aging.startAge))),
      constitutionLossPerYear: Math.max(0, Math.min(20, numberOr(aging.constitutionLossPerYear, base.aging.constitutionLossPerYear))),
    },
    menus: {
      infant: ageWindow(isRecord(value.menus) ? value.menus.infant : undefined, base.menus.infant),
      childhood: ageWindow(isRecord(value.menus) ? value.menus.childhood : undefined, base.menus.childhood),
      job: ageWindow(isRecord(value.menus) ? value.menus.job : undefined, base.menus.job),
      school: ageWindow(isRecord(value.menus) ? value.menus.school : undefined, base.menus.school),
      romance: ageWindow(isRecord(value.menus) ? value.menus.romance : undefined, base.menus.romance),
      crime: ageWindow(isRecord(value.menus) ? value.menus.crime : undefined, base.menus.crime),
      guild: ageWindow(isRecord(value.menus) ? value.menus.guild : undefined, base.menus.guild),
      assets: ageWindow(isRecord(value.menus) ? value.menus.assets : undefined, base.menus.assets),
      activities: ageWindow(isRecord(value.menus) ? value.menus.activities : undefined, base.menus.activities),
    },
    classEvents: ageWindow(value.classEvents, base.classEvents),
    teenageAge: Math.max(0, Math.min(MAX_AGE, Math.round(numberOr(value.teenageAge, base.teenageAge)))),
  }
}

function ageWindow(value: unknown, fallback: AgeWindow): AgeWindow {
  if (!isRecord(value)) return { ...fallback }
  const minAge = Math.max(0, Math.min(MAX_AGE, Math.round(numberOr(value.minAge, fallback.minAge))))
  const window: AgeWindow = { minAge }
  if (value.maxAge != null && value.maxAge !== '') {
    window.maxAge = Math.max(minAge, Math.min(MAX_AGE, Math.round(numberOr(value.maxAge, minAge))))
  }
  return window
}

function sanitizeBetrothal(value: unknown): Betrothal | null {
  if (!isRecord(value) || typeof value.job !== 'string' || typeof value.forename !== 'string') return null
  const job = value.job.trim().slice(0, 48)
  const forename = cleanNamePart(value.forename)
  if (!job || !forename) return null
  return {
    job,
    forename,
    surname: typeof value.surname === 'string' ? cleanNamePart(value.surname) : '',
  }
}

function sanitizePerson(value: unknown): Person | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') return null
  if (value.role !== 'parent' && value.role !== 'sibling' && value.role !== 'friend' && value.role !== 'teacher') return null
  if (value.gender !== 'male' && value.gender !== 'female') return null
  const age = numberOr(value.age, -1)
  if (age < 0 || age > MAX_AGE + 40) return null
  const person: Person = {
    id: value.id,
    name: value.name.slice(0, 49),
    role: value.role as RelationRole,
    label: typeof value.label === 'string' ? value.label.slice(0, 24) : 'Relative',
    gender: value.gender as Gender,
    age,
    relationship: Math.max(0, Math.min(100, numberOr(value.relationship, 50))),
    alive: value.alive !== false,
  }
  if (typeof value.occupation === 'string' && value.occupation.trim()) {
    person.occupation = value.occupation.trim().slice(0, 48)
  }
  if (!person.alive) person.diedYearsAgo = Math.max(0, numberOr(value.diedYearsAgo, 0))
  return person
}

function sanitizeOccupation(value: unknown): Occupation | null {
  if (!isRecord(value) || typeof value.title !== 'string' || !value.title.trim()) return null
  return {
    title: value.title.trim().slice(0, 48),
    salary: Math.max(0, Math.min(100000, Math.round(numberOr(value.salary, 0)))),
  }
}

function sanitizeOffer(value: unknown): TeacherOffer | null {
  if (!isRecord(value) || !isRace(value.race)) return null
  if (typeof value.job !== 'string' || typeof value.forename !== 'string' || typeof value.subject !== 'string') return null
  if (!isRecord(value.roll) || !isCheckStat(value.roll.stat)) return null
  const forename = cleanNamePart(value.forename)
  const subject = value.subject.trim().slice(0, 48)
  if (!forename || !subject) return null
  return {
    race: value.race,
    job: value.job.trim().slice(0, 48),
    forename,
    surname: typeof value.surname === 'string' ? cleanNamePart(value.surname) : '',
    subject,
    ...(value.gender === 'male' || value.gender === 'female' ? { gender: value.gender } : {}),
    roll: {
      die: Math.max(1, Math.min(100, numberOr(value.roll.die, 1))),
      stat: value.roll.stat,
      statValue: numberOr(value.roll.statValue, 0),
      total: numberOr(value.roll.total, 0),
    },
  }
}

function sanitizeLog(value: unknown): LogEntry | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.text !== 'string') return null
  const age = numberOr(value.age, -1)
  if (age < 0 || age > MAX_AGE) return null
  return { id: value.id, age, text: value.text.slice(0, 400) }
}

const YEAR_ACTIVITIES: YearActivity[] = ['study', 'odd-job', 'seek-friend', 'rest']

export function sanitizeLife(value: unknown): Life | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || !value.name.trim()) return null
  if (!isRace(value.race) || !isClass(value.socialClass)) return null
  const age = numberOr(value.age, -1)
  if (age < 0 || age > MAX_AGE) return null
  if (!Array.isArray(value.people) || !Array.isArray(value.log)) return null
  const people = value.people.map(sanitizePerson).filter((person): person is Person => person !== null)
  const log = value.log.map(sanitizeLog).filter((item): item is LogEntry => item !== null)
  const house = isClass(value.house) ? value.house : null
  const pendingEvent = value.pendingEvent == null ? null : sanitizeEvent(value.pendingEvent)
  let pendingOutcome: Life['pendingOutcome'] = null
  if (isRecord(value.pendingOutcome) && typeof value.pendingOutcome.log === 'string' && typeof value.pendingOutcome.title === 'string') {
    pendingOutcome = {
      title: value.pendingOutcome.title.slice(0, 80),
      log: value.pendingOutcome.log.slice(0, 400),
      passed: value.pendingOutcome.passed !== false,
    }
    if (typeof value.pendingOutcome.changes === 'string' && value.pendingOutcome.changes.trim()) {
      pendingOutcome.changes = value.pendingOutcome.changes.slice(0, 160)
    }
    if (isRecord(value.pendingOutcome.roll) && isCheckStat(value.pendingOutcome.roll.stat)) {
      pendingOutcome.roll = {
        die: Math.max(1, Math.min(100, numberOr(value.pendingOutcome.roll.die, 1))),
        stat: value.pendingOutcome.roll.stat,
        statValue: numberOr(value.pendingOutcome.roll.statValue, 0),
        total: numberOr(value.pendingOutcome.roll.total, 0),
      }
    }
  }
  const legacy = value.name.trim().replace(/\s+/g, ' ').split(' ')
  const forename = typeof value.forename === 'string' && value.forename.trim()
    ? cleanNamePart(value.forename)
    : cleanNamePart(legacy[0] ?? '')
  const surname = typeof value.surname === 'string'
    ? cleanNamePart(value.surname)
    : cleanNamePart(legacy.slice(1).join(' '))
  const name = [forename, surname].filter(Boolean).join(' ') || value.name.trim().slice(0, 49)
  const gender: Gender = value.gender === 'female' ? 'female' : 'male'
  const occupation = sanitizeOccupation(value.occupation)
  const school = typeof value.school === 'string' && value.school.trim() ? value.school.trim().slice(0, 48) : null
  let duty: HouseholdDuty = value.duty === 'choosing' || value.duty === 'done' ? value.duty : 'ready'
  if (occupation || school) duty = 'done'
  return {
    id: value.id,
    name,
    forename: forename || name,
    surname,
    gender,
    race: value.race,
    socialClass: value.socialClass,
    age,
    constitution: Math.max(0, Math.min(100, numberOr(value.constitution, 0))),
    charisma: Math.max(0, Math.min(100, numberOr(value.charisma, 0))),
    intelligence: Math.max(0, Math.min(100, numberOr(value.intelligence, 0))),
    gold: Math.max(0, numberOr(value.gold, 0)),
    parentRelationship: Math.max(0, Math.min(100, numberOr(value.parentRelationship, 50))),
    people,
    house,
    occupation,
    school,
    tutorRelationship: value.tutorRelationship == null
      ? null
      : Math.max(0, Math.min(100, Math.round(numberOr(value.tutorRelationship, 0)))),
    merchantJobs: value.merchantJobs === true,
    romance: value.romance === true,
    betrothed: sanitizeBetrothal(value.betrothed),
    crime: value.crime === true,
    duty,
    log,
    alive: value.alive !== false,
    deathReason: typeof value.deathReason === 'string' ? value.deathReason.slice(0, 400) : null,
    pendingEvent,
    pendingOutcome,
    pendingOffer: sanitizeOffer(value.pendingOffer),
    usedThisYear: Array.isArray(value.usedThisYear)
      ? value.usedThisYear.filter((item): item is YearActivity => YEAR_ACTIVITIES.includes(item as YearActivity))
      : [],
    shownEvents: sanitizeShown(value.shownEvents),
    eventYears: sanitizeShown(value.eventYears),
  }
}

function sanitizeShown(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {}
  const shown: Record<string, number> = {}
  for (const [key, count] of Object.entries(value)) {
    if (!key || typeof count !== 'number' || !Number.isFinite(count)) continue
    shown[key.slice(0, 80)] = Math.max(0, Math.min(99, Math.round(count)))
  }
  return shown
}

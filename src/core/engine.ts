import {
  article,
  jobChanges,
  MERCHANT_SCHOOLS,
  NOBLE_SUBJECTS,
  offerSentence,
  payCap,
  raiseStep,
  resolveTrade,
  salaryFor,
  subjectsFor,
  TEACHER_JOBS,
  TEACHER_SUBJECTS,
  tradesFor,
  VAGRANT_SALARY,
  VAGRANT_TITLE,
} from './childhood'
import { agePoolFor } from './age'
import { birthHome } from './birthHome'
import { HOUSE_FIRE_ID, TEENAGE_ID } from './defaults'
import { ensureNobleTitles, lifeName, personName } from './titles'
import { uid } from './id'
import { cleanNamePart, pickDistinct, randomIdentity } from './names'
import type {
  AgeWindow,
  CheckStat,
  ChildhoodAction,
  EventOption,
  GameConfig,
  GameEventConfig,
  Gender,
  HeirRole,
  InfantAction,
  Life,
  LogEntry,
  NewCharacter,
  OutcomeView,
  Person,
  PersonActivity,
  SocialClass,
  StatChange,
  Stranger,
  TeacherOffer,
  YearActivity,
} from './types'
import { CLASSES, MAX_AGE, RACES } from './types'

const NAMES = ['Rowan', 'Nora', 'Casey', 'Priya', 'Leo', 'Hana', 'Omar', 'Mia', 'Luca', 'Eden', 'Quinn', 'Soren']
const ANYTIME_SHOW_LIMIT = 5

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function waiting(life: Life): boolean {
  return life.pendingEvent !== null || life.pendingOutcome !== null || life.pendingOffer !== null || (life.pendingLoss?.length ?? 0) > 0
}

export function canAge(life: Life): boolean {
  return life.alive && !waiting(life) && life.age < MAX_AGE
}

function randomInt(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1))
}

function pickName(random: () => number, taken: Set<string>): string {
  for (let attempt = 0; attempt < NAMES.length; attempt += 1) {
    const name = NAMES[randomInt(random, 0, NAMES.length - 1)] ?? NAMES[0]
    if (!taken.has(name)) return name
  }
  return `${NAMES[0]} ${taken.size + 1}`
}

function entry(age: number, text: string): LogEntry {
  return { id: uid(), age, text }
}

function makePerson(
  role: Person['role'],
  label: string,
  gender: Gender,
  age: number,
  relationship: number,
  random: () => number,
  taken: Set<string>,
  givenName?: string,
): Person {
  const name = givenName ?? pickName(random, taken)
  taken.add(name)
  return { id: uid(), name, role, label, gender, age, relationship, alive: true }
}

function rollConstitution(random: () => number, bonus = 0): number {
  return clampScore(randomInt(random, 50, 100) + bonus)
}

export function createLife(
  input: NewCharacter,
  config: GameConfig,
  random: () => number = Math.random,
): Life {
  const forename = cleanNamePart(input.forename) || 'Wanderer'
  const surname = cleanNamePart(input.surname) || 'Hale'
  const name = `${forename} ${surname}`
  const bonus = config.races[input.race]
  const constitution = clampScore(randomInt(random, 50, 100) + bonus.constitution)
  const charisma = clampScore(randomInt(random, 0, 100) + bonus.charisma)
  const intelligence = clampScore(randomInt(random, 0, 100) + bonus.intelligence)
  const pool = config.names[input.race]
  const avoid = new Set<string>([forename.toLowerCase()])
  const motherForename = pickDistinct(pool.femaleForenames, random, avoid, 'Mira')
  avoid.add(motherForename.toLowerCase())
  const fatherForename = pickDistinct(pool.maleForenames, random, avoid, 'Alden')
  const motherName = `${motherForename} ${surname}`
  const fatherName = `${fatherForename} ${surname}`
  const taken = new Set<string>([name, forename, motherName, fatherName, motherForename, fatherForename])
  const mother = makePerson('parent', 'Mother', 'female', randomInt(random, 22, 38), 74, random, taken, motherName)
  const father = makePerson('parent', 'Father', 'male', randomInt(random, 24, 40), 70, random, taken, fatherName)
  const siblings: Person[] = []
  const siblingCount = randomInt(random, 0, 2)
  for (let index = 0; index < siblingCount; index += 1) {
    const older = random() < 0.5
    const gender: Gender = random() < 0.5 ? 'male' : 'female'
    siblings.push(makePerson(
      'sibling',
      gender === 'male' ? 'Brother' : 'Sister',
      gender,
      Math.max(0, older ? randomInt(random, 1, 8) : 0),
      58,
      random,
      taken,
    ))
  }
  const trades = tradesFor(input.socialClass)
  const raised = [mother, father, ...siblings].map((person) => {
    if (person.role !== 'parent') return person
    const trade = trades[randomInt(random, 0, trades.length - 1)] ?? trades[0]
    return trade ? { ...person, occupation: trade.parent } : person
  })
  const people = raised.map((person) => {
    const constitution = rollConstitution(random, bonus.constitution)
    if (person.role !== 'parent') return { ...person, constitution }
    return {
      ...person,
      constitution,
      gold: salaryFor(person.occupation ?? ''),
    }
  })
  const noble = ensureNobleTitles({
    socialClass: input.socialClass,
    title: undefined,
    people,
  }, random)
  const shown = noble.people
  const rank = noble.title
  return {
    id: uid(),
    name,
    forename,
    surname,
    gender: input.gender,
    race: input.race,
    socialClass: input.socialClass,
    age: 0,
    constitution,
    charisma,
    intelligence,
    gold: 0,
    parentRelationship: 72,
    title: rank,
    people: shown,
    house: null,
    occupation: null,
    school: null,
    tutorRelationship: null,
    merchantJobs: false,
    romance: false,
    betrothed: null,
    crime: false,
    duty: 'ready',
    log: [
      entry(0, `You are a ${input.gender} ${input.socialClass.toLowerCase()} ${input.race.toLowerCase()} named ${lifeName({ name, title: rank })}. Your mother is ${personName(shown.find((person) => person.label === 'Mother') ?? mother)}. Your father is ${personName(shown.find((person) => person.label === 'Father') ?? father)}.`),
      entry(0, birthHome(input.race, input.socialClass, random)),
    ],
    alive: true,
    deathReason: null,
    pendingEvent: null,
    pendingOutcome: null,
    pendingOffer: null,
    pendingLoss: null,
    usedThisYear: [],
    shownEvents: {},
    eventYears: {},
  }
}

export function appearanceLimit(event: GameEventConfig): number | null {
  if (event.type === 'Anytime') {
    return Math.max(1, Math.min(ANYTIME_SHOW_LIMIT, Math.round(event.showLimit ?? ANYTIME_SHOW_LIMIT)))
  }
  if (event.type === 'Milestone') return Math.max(1, Math.round(event.showLimit ?? 1))
  if (event.showLimit == null) return null
  return Math.max(1, Math.round(event.showLimit))
}

function timesShown(life: Life, id: string): number {
  return life.shownEvents?.[id] ?? 0
}

function withinLimit(life: Life, event: GameEventConfig): boolean {
  const limit = appearanceLimit(event)
  return limit == null || timesShown(life, event.id) < limit
}

function yearsBetween(event: GameEventConfig): number | null {
  if (typeof event.repeatAfter === 'number' && Number.isFinite(event.repeatAfter)) {
    return Math.max(0, Math.round(event.repeatAfter))
  }
  if (event.id === HOUSE_FIRE_ID) return 10
  return null
}

function lastShownAge(life: Life, id: string): number | null {
  const recorded = life.eventYears?.[id]
  if (typeof recorded === 'number') return recorded
  if (timesShown(life, id) > 0) return Math.max(0, life.age - 1)
  return null
}

function cooledDown(life: Life, event: GameEventConfig): boolean {
  const gap = yearsBetween(event)
  if (gap == null || gap <= 0) return true
  const last = lastShownAge(life, event.id)
  if (last == null) return true
  return life.age >= last + gap
}

function canOffer(life: Life, event: GameEventConfig): boolean {
  return withinLimit(life, event) && cooledDown(life, event)
}

function present(life: Life, event: GameEventConfig): Life {
  return {
    ...life,
    pendingEvent: event,
    shownEvents: { ...life.shownEvents, [event.id]: timesShown(life, event.id) + 1 },
    eventYears: { ...life.eventYears, [event.id]: life.age },
  }
}

function livingParents(life: Life): Person[] {
  return life.people.filter((person) => person.role === 'parent' && person.alive)
}

export function applyEffect(life: Life, effect: StatChange): Life {
  const parentDelta = effect.parentRelationship ?? 0
  const people = life.people.map((person) => {
    if (person.role !== 'parent' || !person.alive || parentDelta === 0) return person
    return { ...person, relationship: clampScore(person.relationship + parentDelta) }
  })
  return {
    ...life,
    constitution: clampScore(life.constitution + (effect.constitution ?? 0)),
    charisma: clampScore(life.charisma + (effect.charisma ?? 0)),
    intelligence: clampScore(life.intelligence + (effect.intelligence ?? 0)),
    gold: Math.max(0, Math.round(life.gold + (effect.gold ?? 0))),
    parentRelationship: clampScore(life.parentRelationship + parentDelta),
    people,
  }
}

export function menuOpen(window: AgeWindow, age: number): boolean {
  if (age < window.minAge) return false
  if (window.maxAge != null && age > window.maxAge) return false
  return true
}

export function shows(config: GameConfig, key: keyof GameConfig['menus'], age: number): boolean {
  return menuOpen(config.menus[key], age)
}

export function eventMatches(event: GameEventConfig, life: Life): boolean {
  if (event.minAge != null && life.age < event.minAge) return false
  if (event.maxAge != null && life.age > event.maxAge) return false
  if (event.requiredRace && event.requiredRace.length > 0 && !event.requiredRace.includes(life.race)) return false
  if (event.requiredClass && event.requiredClass.length > 0 && !event.requiredClass.includes(life.socialClass)) return false
  if (event.requiredGender && event.requiredGender.length > 0 && !event.requiredGender.includes(life.gender)) return false
  return event.options.length > 0
}

function poolOpen(type: string, age: number, config: GameConfig, socialClass: SocialClass): boolean {
  const band = agePoolFor(type)
  if (band) return age >= band.minAge && age <= band.maxAge
  if (menuOpen(config.classEvents, age)) return type === 'Anytime' || type === socialClass
  return true
}

export function ensureParentBodies(life: Life, config: GameConfig, random: () => number = Math.random): Life {
  let changed = false
  const bonus = config.races[life.race].constitution
  const people = life.people.map((person) => {
    const constitution = typeof person.constitution === 'number'
      ? person.constitution
      : rollConstitution(random, bonus)
    const gold = person.role === 'parent'
      ? (typeof person.gold === 'number' ? person.gold : salaryFor(person.occupation ?? ''))
      : person.gold
    if (constitution === person.constitution && gold === person.gold) return person
    changed = true
    return gold === person.gold ? { ...person, constitution } : { ...person, constitution, gold }
  })
  return changed ? { ...life, people } : life
}

function carriedGold(person: Person): number {
  if (typeof person.gold === 'number') return Math.max(0, Math.round(person.gold))
  return salaryFor(person.occupation ?? '')
}

function agePeople(
  life: Life,
  years: number,
  random: () => number,
  config: GameConfig,
): { people: Person[]; gold: number; notices: string[] } {
  let gold = 0
  const notices: string[] = []
  const people = life.people.map((person) => {
    if (!person.alive) return { ...person, diedYearsAgo: (person.diedYearsAgo ?? 0) + years }
    const age = person.age + years
    let next: Person = { ...person, age }
    if (person.role === 'parent') {
      const start = typeof person.constitution === 'number'
        ? person.constitution
        : rollConstitution(random, config.races[life.race].constitution)
      const loss = randomInt(random, 0, 5)
      next = { ...next, constitution: Math.max(0, start - loss), gold: carriedGold(person) }
    }
    const wornOut = person.role === 'parent' && next.constitution === 0
    if (age < 80 && !wornOut) return next
    const purse = carriedGold(next)
    const relation = person.label.toLowerCase()
    const possessive = person.gender === 'female' ? 'her' : 'his'
    const cause = wornOut
      ? `${personName(person)}, your ${relation}, dies as ${possessive} constitution fails.`
      : `${personName(person)}, your ${relation}, dies peacefully at ${age}.`
    if (purse > 0) {
      gold += purse
      notices.push(`${cause} You inherit ${purse} gold.`)
    } else {
      notices.push(cause)
    }
    return { ...next, gold: 0, alive: false, diedYearsAgo: 0 }
  })
  return { people, gold, notices }
}

function die(life: Life, reason: string): Life {
  return {
    ...life,
    alive: false,
    deathReason: reason,
    pendingEvent: null,
    pendingLoss: null,
    constitution: 0,
    log: [...life.log, entry(life.age, reason)],
  }
}

export function ageUp(
  life: Life,
  events: GameEventConfig[],
  config: GameConfig,
  random: () => number = Math.random,
): Life {
  if (!life.alive || waiting(life)) return life
  if (life.age >= MAX_AGE) {
    return die(life, `${lifeName(life)} slips away at ${life.age}, at the end of a very long tale.`)
  }

  const age = life.age + 1
  const aged = agePeople(life, 1, random, config)
  let next: Life = {
    ...life,
    age,
    people: aged.people,
    gold: life.gold + aged.gold,
    usedThisYear: [],
    log: [...life.log, ...aged.notices.map((text) => entry(age, text))],
  }
  const job = next.occupation ?? (ofWorkingAge(next, config) ? { title: VAGRANT_TITLE, salary: VAGRANT_SALARY } : null)
  if (job && job.salary > 0) {
    const pay = job.salary
    next = {
      ...next,
      occupation: job,
      gold: next.gold + pay,
      log: [...next.log, entry(age, `You earn ${pay} gold for the year as ${article(job.title)} ${job.title}.`)],
    }
  }
  next = { ...next, pendingLoss: aged.notices.length > 0 ? aged.notices : null }
  if (age >= config.aging.startAge) {
    const loss = Math.max(0, config.aging.constitutionLossPerYear)
    if (loss > 0 && next.constitution - loss <= 0) {
      return die(applyEffect(next, { constitution: -loss }), `At ${age}, ${lifeName(life)}'s strength finally gives out.`)
    }
    if (loss > 0) next = applyEffect(next, { constitution: -loss })
  }

  const milestone = events.find((event) => event.type === 'Milestone' && eventMatches(event, next) && canOffer(next, event))
  if (milestone) {
    const logged = milestone.id === TEENAGE_ID && next.school
      ? { ...next, log: [...next.log, entry(next.age, 'You reach the end of your basic education.')] }
      : next
    return present(logged, milestone)
  }

  let eligible = events.filter((event) => (
    event.type !== 'Milestone'
    && eventMatches(event, next)
    && canOffer(next, event)
    && poolOpen(event.type, next.age, config, next.socialClass)
  ))
  const mandatory = eligible.filter((event) => event.mandatory)
  if (mandatory.length > 0) eligible = mandatory
  if (eligible.length === 0) {
    return {
      ...next,
      log: [...next.log, entry(age, `${lifeName(life)} spends age ${age} without a notable tale.`)],
    }
  }
  const event = eligible[randomInt(random, 0, eligible.length - 1)]
  return event ? present(next, event) : next
}

function statValue(life: Life, stat: CheckStat): number {
  return life[stat]
}

export function chooseOption(
  life: Life,
  optionId: string,
  _config?: GameConfig,
  random: () => number = Math.random,
): Life {
  if (!life.alive || !life.pendingEvent) return life
  if (life.pendingEvent.id === TEENAGE_ID) return resolveTeenage(life, optionId)
  const option = life.pendingEvent.options.find((item) => item.id === optionId)
  if (!option) return life
  const cost = option.goldCost ?? 0
  if (cost > life.gold) return life
  let passed = true
  let roll: OutcomeView['roll']
  if (option.checkLuck) {
    const die = randomInt(random, 0, 100)
    passed = die >= (option.threshold ?? 50)
    roll = { die, stat: 'luck', statValue: 0, total: die }
  } else if (option.checkStat) {
    const die = randomInt(random, 0, 100)
    const value = statValue(life, option.checkStat)
    const total = die + value
    passed = total >= (option.threshold ?? 50)
    roll = { die, stat: option.checkStat, statValue: value, total }
  }
  const outcome = passed || !option.failure ? option.success : option.failure
  if (!outcome) return life
  const paid = cost > 0 ? { ...life, gold: life.gold - cost } : life
  let next = applyEffect(paid, outcome.effect)
  if (option.clearHouse) next = { ...next, house: null }
  next = applyIdentity(next, option)
  const told = applyOutcomeLog(next, outcome.log, random, life.pendingEvent.nameStandIn ?? [])
  next = {
    ...told.life,
    pendingEvent: null,
    pendingOutcome: {
      title: nameKin(passed ? life.pendingEvent.title : 'It goes badly', next, random, life.pendingEvent.nameStandIn ?? []),
      log: told.text,
      passed,
      roll,
    },
    log: [...told.life.log, entry(life.age, told.text)],
  }
  if (next.constitution <= 0) {
    next = {
      ...next,
      alive: false,
      deathReason: told.text,
    }
  }
  return next
}

export function dismissOutcome(life: Life): Life {
  if (!life.pendingOutcome) return life
  return { ...life, pendingOutcome: null }
}

export function dismissLoss(life: Life): Life {
  if (!life.pendingLoss?.length) return life
  return { ...life, pendingLoss: null }
}

export const INFANT_MAX_AGE = 5
export const CHILDHOOD_MAX_AGE = 12

function shiftRelationships(life: Life, match: (person: Person) => boolean, delta: number): Life {
  const people = life.people.map((person) => {
    if (!match(person)) return person
    return { ...person, relationship: clampScore(person.relationship + delta) }
  })
  const next = { ...life, people }
  return { ...next, parentRelationship: averageParentScore(next) }
}

export function infantAction(
  life: Life,
  action: InfantAction,
  random: () => number = Math.random,
  config?: GameConfig,
): Life {
  const infant = config?.menus.infant ?? { minAge: 0, maxAge: INFANT_MAX_AGE }
  if (!life.alive || waiting(life) || !menuOpen(infant, life.age)) return life

  const stat: CheckStat = action === 'babble' || (action === 'story' && life.socialClass !== 'Peasant')
    ? 'intelligence'
    : action === 'play'
      ? 'constitution'
      : 'charisma'
  const statValue = life[stat]
  const die = randomInt(random, 1, 100)
  const total = die + statValue
  const passed = total > 50
  const roll = { die, stat, statValue, total }
  let title = 'Babble'
  let log = ''
  let changes = ''
  let next = life

  if (action === 'babble') {
    title = 'Babble'
    next = applyEffect(life, passed ? { charisma: 10 } : { charisma: -5 })
    log = passed ? 'You are learning to talk.' : "Nobody can understand what you're saying."
    changes = passed ? 'Charisma +10' : 'Charisma -5'
  } else if (action === 'cry') {
    title = 'Cry'
    const parents = livingParents(life)
    if (passed && parents.length > 0) {
      const parent = parents[randomInt(random, 0, parents.length - 1)] ?? parents[0]
      next = shiftRelationships(applyEffect(life, { constitution: 10 }), (person) => person.id === parent.id, 10)
      log = `Your ${personName(parent)} soothes you.`
      changes = `Constitution +10. ${personName(parent)} +10 relationship.`
    } else {
      next = shiftRelationships(life, (person) => person.role === 'parent' && person.alive, -20)
      log = 'You are left alone to cry.'
      changes = 'Both parents -20 relationship.'
    }
  } else if (action === 'play') {
    title = 'Play'
    next = applyEffect(life, passed ? { constitution: 15 } : { charisma: -15 })
    log = passed ? 'You have a great time toddling around.' : 'Nobody want to play with.'
    changes = passed ? 'Constitution +15' : 'Charisma -15'
  } else {
    title = 'Ask for a story'
    next = applyEffect(life, passed ? { intelligence: 15 } : { intelligence: -10 })
    log = life.socialClass === 'Peasant'
      ? (passed
        ? 'Though nobody in your family can read, your eyes light up with their spoken story.'
        : "Their simple stories don't catch your imagination.")
      : (passed
        ? 'Your family shows you a rare, illustrated storybook.'
        : 'You discover that books are quite boring.')
    changes = passed ? 'Intelligence +15' : 'Intelligence -10'
  }

  return {
    ...next,
    pendingOutcome: { title, log, passed, roll, changes },
    log: [...next.log, entry(life.age, log)],
  }
}

export function interact(life: Life, personId: string, activity: PersonActivity): Life {
  if (!life.alive || waiting(life)) return life
  const person = life.people.find((item) => item.id === personId && item.alive)
  if (!person) return life

  let relationship = person.relationship
  let log = ''
  let effect: StatChange = {}
  if (activity === 'compliment') {
    relationship += 8
    effect = { charisma: 1 }
    log = `You compliment ${personName(person)}. They look pleased.`
  } else if (activity === 'conversation') {
    relationship += 4
    effect = { charisma: 2 }
    log = `You talk with ${personName(person)} until the light changes.`
  } else if (activity === 'ask') {
    if (person.relationship < 45) {
      relationship -= 6
      log = `${personName(person)} refuses to hand over any coin.`
    } else {
      relationship -= 12
      effect = { gold: 40 }
      log = `${personName(person)} sighs and gives you 40 gold.`
    }
  } else if (life.gold < 30) {
    log = `You want to give ${personName(person)} a gift, but your purse is too light.`
  } else {
    relationship += 12
    effect = { gold: -30 }
    log = `You give ${personName(person)} a small gift. It cost 30 gold.`
  }

  const people = life.people.map((item) => (
    item.id === person.id ? { ...item, relationship: clampScore(relationship) } : item
  ))
  const changed = applyEffect({ ...life, people }, effect)
  const tutorRelationship = person.role === 'teacher' ? clampScore(relationship) : changed.tutorRelationship
  return {
    ...changed,
    tutorRelationship,
    parentRelationship: averageParentScore(changed),
    log: [...changed.log, entry(life.age, log)],
  }
}

function averageParentScore(life: Life): number {
  const parents = livingParents(life)
  if (parents.length === 0) return life.parentRelationship
  const total = parents.reduce((sum, person) => sum + person.relationship, 0)
  return clampScore(total / parents.length)
}

function matchesKin(person: Person, kind: string): boolean {
  if (kind === 'mother') return person.role === 'parent' && person.label === 'Mother'
  if (kind === 'father') return person.role === 'parent' && person.label === 'Father'
  if (kind === 'brother') return person.role === 'sibling' && person.label === 'Brother'
  if (kind === 'sister') return person.role === 'sibling' && person.label === 'Sister'
  if (kind === 'sibling') return person.role === 'sibling'
  if (kind === 'wholefamily') return person.role === 'parent' || person.role === 'sibling'
  return person.role === 'friend'
}

function livingRelations(life: Life, deaths: Set<string>): Person[] {
  return life.people.filter((person) => person.alive && !deaths.has(person.id))
}

function standInRelative(life: Life, deaths: Set<string>, random: () => number, gone: Person | undefined, mark: string): string {
  const relatives = livingRelations(life, deaths)
  const chosen = relatives.length === 0 ? undefined : relatives[randomInt(random, 0, relatives.length - 1)]
  if (!chosen) return gone ? `${personName(gone)} is already gone` : mark
  deaths.add(chosen.id)
  return `${personName(chosen)} dies`
}

function standInName(life: Life, blocked: Set<string>, random: () => number): string | undefined {
  const others = life.people.filter((person) => !blocked.has(person.id))
  const living = others.filter((person) => person.alive)
  const pool = living.length > 0 ? living : others
  if (pool.length === 0) return undefined
  const chosen = pool[randomInt(random, 0, pool.length - 1)]
  return chosen ? personName(chosen) : undefined
}

function kinMatches(life: Life, kind: string): Person[] {
  return life.people.filter((person) => matchesKin(person, kind))
}

function pickKin(people: Person[], kind: string, random: () => number): Person | undefined {
  if (people.length === 0) return undefined
  if (kind === 'mother' || kind === 'father') return people[0]
  return people[randomInt(random, 0, people.length - 1)]
}

function livingFirst(people: Person[]): Person[] {
  const living = people.filter((person) => person.alive)
  return living.length > 0 ? living : people
}

function standInPerson(life: Life, standIn: HeirRole[], random: () => number): Person | undefined {
  if (standIn.length === 0) return undefined
  for (const role of standIn) {
    const found = pickKin(livingFirst(kinMatches(life, role)), role, random)
    if (found) return found
  }
  if (life.people.length === 0) return undefined
  return pickKin(livingFirst(life.people), 'friend', random)
}

function kinPerson(life: Life, kind: string, random: () => number, standIn: HeirRole[]): Person | undefined {
  const matches = kinMatches(life, kind)
  const living = matches.filter((person) => person.alive)
  if (living.length > 0) return pickKin(living, kind, random)
  if (matches.length > 0) return undefined
  if (standIn.length === 0) return undefined
  return standInPerson(life, standIn, random)
}

export function nameKin(text: string, life: Life, random: () => number = Math.random, standIn: HeirRole[] = []): string {
  const withJobs = text.replace(/\[(mother|father|brother|sister|sibling|friend)_job\]/gi, (mark, who: string) => {
    const kind = who.toLowerCase()
    const matches = kinMatches(life, kind)
    const holder = pickKin(livingFirst(matches), kind, random) ?? (matches.length === 0 ? standInPerson(life, standIn, random) : undefined)
    return holder?.occupation || mark
  })
  return withJobs.replace(/\[(mother|father|brother|sister|sibling|friend)\]/gi, (mark, who: string) => {
    const kind = who.toLowerCase()
    const matches = kinMatches(life, kind)
    const living = matches.filter((person) => person.alive)
    if (living.length > 0) {
      const chosen = pickKin(living, kind, random)
      return chosen ? personName(chosen) : mark
    }
    if (matches.length === 0) {
      const chosen = kinPerson(life, kind, random, standIn)
      return chosen ? personName(chosen) : mark
    }
    return standInName(life, new Set(matches.map((person) => person.id)), random) ?? personName(matches[0]) ?? mark
  })
}

function inheritance(life: Life, deaths: Set<string>): { gold: number; note: string } {
  if (deaths.size === 0) return { gold: 0, note: '' }
  const notes: string[] = []
  let gold = 0
  life.people.forEach((person) => {
    if (!deaths.has(person.id)) return
    const purse = carriedGold(person)
    if (purse <= 0) return
    gold += purse
    notes.push(`You inherit ${purse} gold`)
  })
  return { gold, note: notes.length > 0 ? `${notes.join('. ')}.` : '' }
}

function applyOutcomeLog(
  life: Life,
  text: string,
  random: () => number,
  standIn: HeirRole[] = [],
): { life: Life; text: string } {
  const deaths = new Set<string>()
  const resolved = nameKin(text.replace(/\[(mother|father|brother|sister|sibling|friend|wholefamily)_die\]/gi, (mark, token: string) => {
    const kind = token.toLowerCase()
    const matches = life.people.filter((item) => matchesKin(item, kind))
    if (kind === 'wholefamily') {
      const family = matches.filter((item) => item.alive && !deaths.has(item.id))
      if (family.length === 0) return matches[0] ? `${personName(matches[0])} is already gone` : mark
      family.forEach((item) => deaths.add(item.id))
      return family.map((item) => `${personName(item)} dies`).join('. ')
    }
    const living = matches.find((item) => item.alive && !deaths.has(item.id))
    if (!living) return standInRelative(life, deaths, random, matches[0], mark)
    deaths.add(living.id)
    return `${personName(living)} dies`
  }), life, random, standIn)
  const willed = inheritance(life, deaths)
  const told = willed.note ? `${resolved} ${willed.note}` : resolved
  if (deaths.size === 0 && willed.gold === 0) return { life, text: told }
  const people = life.people.map((person) => (
    deaths.has(person.id) ? { ...person, alive: false, diedYearsAgo: 0, gold: 0 } : person
  ))
  const next = { ...life, people, gold: life.gold + willed.gold }
  return { life: { ...next, parentRelationship: averageParentScore(next) }, text: told }
}

function applyIdentity(life: Life, option: EventOption): Life {
  const age = option.setAge
  const race = option.setRace
  const socialClass = option.setClass
  if (age == null && !race && !socialClass) return life
  return {
    ...life,
    ...(age == null ? {} : { age: Math.max(0, Math.min(MAX_AGE, age)) }),
    ...(race ? { race } : {}),
    ...(socialClass ? { socialClass } : {}),
  }
}

export function yearActivity(life: Life, activity: YearActivity, random: () => number = Math.random): Life {
  if (!life.alive || waiting(life)) return life
  if (life.usedThisYear.includes(activity)) return life
  let effect: StatChange = {}
  let text = ''
  let people = life.people
  if (activity === 'study') {
    if (life.gold < 20) {
      text = 'The guild wants 20 gold for a lesson. You do not have it.'
    } else {
      effect = { gold: -20, intelligence: 4 }
      text = 'You pay 20 gold and study with the guild.'
    }
  } else if (activity === 'odd-job') {
    effect = { gold: 25, constitution: -2 }
    text = 'You take an odd job and earn 25 gold.'
  } else if (activity === 'rest') {
    effect = { constitution: 6 }
    text = 'You rest. A little strength comes back.'
  } else if (random() < 0.55 && life.people.filter((person) => person.role === 'friend' && person.alive).length < 6) {
    const taken = new Set(life.people.map((person) => person.name).concat(life.name))
    const friend = makePerson('friend', 'Friend', random() < 0.5 ? 'male' : 'female', life.age, 40, random, taken)
    people = [...life.people, friend]
    text = `${friend.name} becomes your friend.`
  } else {
    text = 'You look for company, but the road is quiet today.'
  }
  const next = applyEffect({ ...life, people }, effect)
  return {
    ...next,
    usedThisYear: [...life.usedThisYear, activity],
    log: [...next.log, entry(life.age, text)],
  }
}

const CLASS_RANK: SocialClass[] = CLASSES

export function buyHouse(life: Life, config: GameConfig, tier: SocialClass): Life {
  if (!life.alive || waiting(life)) return life
  const nextRank = CLASS_RANK.indexOf(tier)
  const currentRank = life.house ? CLASS_RANK.indexOf(life.house) : -1
  if (nextRank <= currentRank) return life
  const price = config.housing[tier]
  if (life.gold < price) return life
  const classRank = CLASS_RANK.indexOf(life.socialClass)
  return {
    ...life,
    gold: life.gold - price,
    house: tier,
    socialClass: nextRank > classRank ? tier : life.socialClass,
    log: [...life.log, entry(life.age, `${lifeName(life)} buys a ${tier.toLowerCase()} house for ${price} gold.`)],
  }
}

export function passedCheck(life: Life, option: EventOption): boolean {
  if (!option.checkStat) return true
  return statValue(life, option.checkStat) >= (option.threshold ?? 50)
}

function conclude(life: Life, patch: Partial<Life>, outcome: OutcomeView): Life {
  return {
    ...life,
    ...patch,
    pendingEvent: null,
    pendingOffer: null,
    pendingOutcome: outcome,
    log: [...life.log, entry(life.age, outcome.log)],
  }
}

function inChildhood(life: Life, config?: GameConfig): boolean {
  const childhood = config?.menus.childhood ?? { minAge: INFANT_MAX_AGE + 1, maxAge: CHILDHOOD_MAX_AGE }
  const infant = config?.menus.infant ?? { minAge: 0, maxAge: INFANT_MAX_AGE }
  return life.alive && !waiting(life) && menuOpen(childhood, life.age) && !menuOpen(infant, life.age)
}

function worksATrade(life: Life): boolean {
  return life.socialClass === 'Peasant' || life.socialClass === 'Journeyman'
}

function dutyParent(life: Life): Person | undefined {
  return livingParents(life)[0] ?? life.people.find((person) => person.role === 'parent')
}

function assignMissingTrades(life: Life, random: () => number): Life {
  const trades = tradesFor(life.socialClass)
  return {
    ...life,
    people: life.people.map((person) => {
      if (person.role !== 'parent' || person.occupation) return person
      const trade = trades[randomInt(random, 0, trades.length - 1)] ?? trades[0]
      return trade ? { ...person, occupation: trade.parent } : person
    }),
  }
}

export function childhoodAction(
  life: Life,
  action: ChildhoodAction,
  random: () => number = Math.random,
  config?: GameConfig,
): Life {
  if (!inChildhood(life, config)) return life
  const stat: CheckStat = action === 'mischief' ? 'charisma' : 'constitution'
  const value = life[stat]
  const die = randomInt(random, 1, 100)
  const total = die + value
  const passed = total > 50
  const roll = { die, stat, statValue: value, total }
  if (action === 'mischief') {
    const log = passed
      ? 'You cause some mischief and get away with it.'
      : 'You are caught making mischief.'
    return conclude(applyEffect(life, { charisma: passed ? 5 : -5 }), {}, {
      title: 'Cause mischief',
      log,
      passed,
      roll,
      changes: passed ? 'Charisma +5' : 'Charisma -5',
    })
  }
  const log = passed
    ? 'You play out in the wilderness.'
    : 'You get lost in the wilderness and come home exhausted.'
  return conclude(applyEffect(life, { constitution: passed ? 10 : -5 }), {}, {
    title: 'Play out in the wilderness',
    log,
    passed,
    roll,
    changes: passed ? 'Constitution +10' : 'Constitution -5',
  })
}

export function meetStrangers(
  life: Life,
  config: GameConfig,
  random: () => number = Math.random,
  count = 3,
): Stranger[] {
  const taken = new Set(life.people.map((person) => person.name.toLowerCase()).concat(life.name.toLowerCase()))
  const strangers: Stranger[] = []
  for (let index = 0; index < count; index += 1) {
    const race = RACES[randomInt(random, 0, RACES.length - 1)] ?? 'Human'
    const gender: Gender = random() < 0.5 ? 'male' : 'female'
    const identity = randomIdentity(config.names[race], gender, random)
    let name = `${identity.forename} ${identity.surname}`.trim()
    if (taken.has(name.toLowerCase())) name = `${name} ${index + 2}`
    taken.add(name.toLowerCase())
    strangers.push({
      id: uid(),
      name,
      race,
      gender,
      age: randomInt(random, 6, 12),
    })
  }
  return strangers
}

export function befriend(life: Life, stranger: Stranger, config?: GameConfig): Life {
  if (!inChildhood(life, config)) return life
  const name = stranger.name.trim()
  if (!name || life.people.some((person) => person.name.toLowerCase() === name.toLowerCase())) return life
  const friend: Person = {
    id: stranger.id || uid(),
    name,
    role: 'friend',
    label: 'Friend',
    gender: stranger.gender,
    age: Math.max(0, stranger.age),
    relationship: 40,
    constitution: rollConstitution(Math.random, config ? config.races[stranger.race].constitution : 0),
    alive: true,
  }
  const log = `You make a new friend named ${friend.name}.`
  return conclude({ ...life, people: [...life.people, friend] }, {}, {
    title: 'A new friend',
    log,
    passed: true,
    changes: friend.name,
  })
}

export function openHousehold(life: Life, random: () => number = Math.random, config?: GameConfig): Life {
  if (!inChildhood(life, config) || life.duty !== 'ready') return life
  const next = assignMissingTrades(life, random)
  const text = 'You are expected to take on responsibility of your household'
  return {
    ...next,
    duty: 'choosing',
    log: [...next.log, entry(life.age, text)],
  }
}

export function workWithParent(life: Life, parentId: string, config?: GameConfig): Life {
  if (!inChildhood(life, config) || life.duty !== 'choosing' || !worksATrade(life)) return life
  const parent = livingParents(life).find((person) => person.id === parentId)
  if (!parent) return life
  const trade = resolveTrade(life.socialClass, parent.occupation)
  const log = `You go to work with your ${parent.label.toLowerCase()} as ${article(trade.child)} ${trade.child}.`
  return conclude(life, {
    occupation: { title: trade.child, salary: trade.salary },
    duty: 'done',
  }, {
    title: 'A job',
    log,
    passed: true,
    changes: jobChanges(trade.child, trade.salary),
  })
}

export function seekTeacher(life: Life, config: GameConfig, random: () => number = Math.random): Life {
  if (!inChildhood(life, config) || life.duty !== 'choosing' || !worksATrade(life)) return life
  const value = life.charisma
  const die = randomInt(random, 1, 100)
  const total = die + value
  const roll = { die, stat: 'charisma' as const, statValue: value, total }
  if (total <= 75) {
    const log = 'Nobody offers to teach you for free.'
    return conclude(life, {}, { title: 'Seek a teacher', log, passed: false, roll, changes: '' })
  }
  const race = RACES[randomInt(random, 0, RACES.length - 1)] ?? 'Human'
  const job = TEACHER_JOBS[randomInt(random, 0, TEACHER_JOBS.length - 1)] ?? 'Scholar'
  const gender: Gender = random() < 0.5 ? 'male' : 'female'
  const identity = randomIdentity(config.names[race], gender, random)
  const subject = TEACHER_SUBJECTS[randomInt(random, 0, TEACHER_SUBJECTS.length - 1)] ?? 'Reading'
  const offer: TeacherOffer = {
    race,
    job,
    forename: identity.forename,
    surname: identity.surname,
    subject,
    gender,
    roll,
  }
  const log = offerSentence(offer)
  return {
    ...life,
    pendingOffer: offer,
    log: [...life.log, entry(life.age, log)],
  }
}

export function answerTeacher(life: Life, accept: boolean): Life {
  const offer = life.pendingOffer
  if (!life.alive || !offer) return life
  const cleared = { ...life, pendingOffer: null }
  if (accept && life.parentRelationship > 50) {
    const teacher: Person = {
      id: uid(),
      name: `${offer.forename} ${offer.surname}`.trim(),
      role: 'teacher',
      label: 'Teacher',
      gender: offer.gender ?? 'male',
      age: Math.max(life.age + 20, 30),
      relationship: 55,
      constitution: rollConstitution(Math.random),
      alive: true,
    }
    const log = 'Your parents consent'
    return conclude(
      { ...cleared, people: [...cleared.people, teacher], tutorRelationship: 55 },
      { school: offer.subject, duty: 'done' },
      {
      title: 'A teacher',
      log,
      passed: true,
      changes: `School: ${offer.subject}.`,
    })
  }
  const trade = resolveTrade(cleared.socialClass, dutyParent(cleared)?.occupation)
  const log = 'Your parents angrily refuse and put you to work, as is your place.'
  return conclude(cleared, {
    occupation: { title: trade.child, salary: trade.salary },
    duty: 'done',
  }, {
    title: 'Put to work',
    log,
    passed: false,
    changes: jobChanges(trade.child, trade.salary),
  })
}

export function runAway(life: Life, random: () => number = Math.random, config?: GameConfig): Life {
  if (!inChildhood(life, config) || life.duty !== 'choosing' || !worksATrade(life)) return life
  const value = life.constitution
  const die = randomInt(random, 1, 100)
  const total = die + value
  const passed = total > 50
  const roll = { die, stat: 'constitution' as const, statValue: value, total }
  if (passed) {
    const log = 'You flee your home, but have nowhere to go.'
    return conclude(applyEffect(life, { constitution: -10 }), {
      occupation: { title: VAGRANT_TITLE, salary: VAGRANT_SALARY },
      crime: true,
      duty: 'done',
    }, {
      title: 'Run away',
      log,
      passed: true,
      roll,
      changes: `${jobChanges(VAGRANT_TITLE, VAGRANT_SALARY)} Constitution -10. Crime menu unlocked.`,
    })
  }
  const trade = resolveTrade(life.socialClass, dutyParent(life)?.occupation)
  const log = 'They catch you and beat you soundly. Back to work it is'
  return conclude(life, {
    occupation: { title: trade.child, salary: trade.salary },
    duty: 'done',
  }, {
    title: 'Run away',
    log,
    passed: false,
    roll,
    changes: jobChanges(trade.child, trade.salary),
  })
}

export function enroll(life: Life, subject: string, config?: GameConfig): Life {
  if (!inChildhood(life, config) || life.duty !== 'choosing') return life
  if (life.socialClass === 'Noble') {
    if (!NOBLE_SUBJECTS.includes(subject)) return life
    const log = `You begin lessons in ${subject}.`
    return conclude(life, { school: subject, duty: 'done' }, {
      title: 'School',
      log,
      passed: true,
      changes: `School: ${subject}.`,
    })
  }
  if (life.socialClass !== 'Merchant') return life
  const course = MERCHANT_SCHOOLS.find((item) => item.subject === subject)
  if (!course) return life
  if (life.gold < course.price) {
    const log = `You cannot afford lessons in ${subject}.`
    return conclude(life, {}, {
      title: 'School',
      log,
      passed: false,
      changes: `${course.price} gold`,
    })
  }
  const log = `You pay ${course.price} gold and begin lessons in ${subject}.`
  return conclude({ ...life, gold: life.gold - course.price }, { school: subject, duty: 'done' }, {
    title: 'School',
    log,
    passed: true,
    changes: `School: ${subject}. ${course.price} gold.`,
  })
}

function ofWorkingAge(life: Life, config?: GameConfig): boolean {
  const window = config?.menus.job ?? { minAge: INFANT_MAX_AGE + 1 }
  return life.alive && !waiting(life) && menuOpen(window, life.age)
}

function inSchoolYears(life: Life, config?: GameConfig): boolean {
  const window = config?.menus.school ?? { minAge: INFANT_MAX_AGE + 1 }
  return life.alive && !waiting(life) && menuOpen(window, life.age)
}

function resolveTeenage(life: Life, optionId: string): Life {
  const trade = tradesFor(life.socialClass).find((item) => item.child === optionId)
  if (!trade) return life
  if (life.constitution !== 100) {
    return conclude(life, {}, {
      title: 'Teenage',
      log: 'Your constitution is not 100, so you cannot take this job.',
      passed: false,
    })
  }
  return conclude(life, {
    occupation: { title: trade.child, salary: trade.salary },
  }, {
    title: 'Teenage',
    log: `You find work as ${article(trade.child)} ${trade.child}.`,
    passed: true,
    changes: jobChanges(trade.child, trade.salary),
  })
}

export function takeJob(life: Life, title: string, config?: GameConfig): Life {
  if (!ofWorkingAge(life, config)) return life
  const trade = tradesFor(life.socialClass).find((item) => item.child === title)
  if (!trade) return life
  const log = `You find work as ${article(trade.child)} ${trade.child}.`
  return conclude(life, {
    occupation: { title: trade.child, salary: trade.salary },
  }, {
    title: 'Find a new job',
    log,
    passed: true,
    changes: jobChanges(trade.child, trade.salary),
  })
}

export function askForGold(life: Life, random: () => number = Math.random, config?: GameConfig): Life {
  if (!ofWorkingAge(life, config)) return life
  const current = life.occupation ?? { title: VAGRANT_TITLE, salary: VAGRANT_SALARY }
  const cap = payCap(life.socialClass)
  if (current.salary >= cap) {
    const log = 'Your wages are already as high as this work allows.'
    return conclude(life, {}, { title: 'Ask for more gold', log, passed: false })
  }
  const value = life.charisma
  const die = randomInt(random, 1, 100)
  const total = die + value
  const passed = total > 50
  const roll = { die, stat: 'charisma' as const, statValue: value, total }
  if (!passed) {
    const log = 'They refuse to pay you any more.'
    return conclude(life, {}, { title: 'Ask for more gold', log, passed: false, roll })
  }
  const salary = Math.min(cap, current.salary + raiseStep(life.socialClass))
  const log = `Your pay rises to ${salary} gold per year.`
  return conclude(life, {
    occupation: { title: current.title, salary },
  }, {
    title: 'Ask for more gold',
    log,
    passed: true,
    roll,
    changes: jobChanges(current.title, salary),
  })
}

export function changeSubject(life: Life, subject: string, config?: GameConfig): Life {
  if (!inSchoolYears(life, config) || !life.school) return life
  if (!subjectsFor(life.socialClass).includes(subject) || life.school === subject) return life
  const log = `You change your studies to ${subject}.`
  return conclude(life, { school: subject }, {
    title: 'Change subject',
    log,
    passed: true,
    changes: `School: ${subject}.`,
  })
}

export function quitSchool(life: Life, config?: GameConfig): Life {
  if (!inSchoolYears(life, config) || !life.school) return life
  const log = 'You quit your lessons.'
  return conclude(life, { school: null }, {
    title: 'Quit',
    log,
    passed: true,
    changes: 'School menu closed.',
  })
}

export function studyHard(life: Life, random: () => number = Math.random, config?: GameConfig): Life {
  if (!inSchoolYears(life, config) || !life.school) return life
  const value = life.intelligence
  const die = randomInt(random, 1, 100)
  const total = die + value
  const passed = total > 50
  const roll = { die, stat: 'intelligence' as const, statValue: value, total }
  const log = passed
    ? 'You study hard and the lesson stays with you.'
    : 'The lesson slips away no matter how hard you study.'
  return conclude(applyEffect(life, { intelligence: passed ? 10 : -5 }), {}, {
    title: 'Study hard',
    log,
    passed,
    roll,
    changes: passed ? 'Intelligence +10' : 'Intelligence -5',
  })
}

import {
  article,
  jobChanges,
  MERCHANT_SCHOOLS,
  NOBLE_SUBJECTS,
  offerSentence,
  payCap,
  raiseStep,
  resolveTrade,
  subjectsFor,
  TEACHER_JOBS,
  TEACHER_SUBJECTS,
  tradesFor,
  VAGRANT_SALARY,
  VAGRANT_TITLE,
} from './childhood'
import { agePoolFor } from './age'
import { HOUSE_FIRE_ID, TEENAGE_ID } from './defaults'
import { uid } from './id'
import { cleanNamePart, pickDistinct, randomIdentity } from './names'
import type {
  AgeWindow,
  Betrothal,
  CheckStat,
  ChildhoodAction,
  EventOption,
  GameConfig,
  GameEventConfig,
  Gender,
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
  return life.pendingEvent !== null || life.pendingOutcome !== null || life.pendingOffer !== null
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
  const people = [mother, father, ...siblings].map((person) => {
    if (person.role !== 'parent') return person
    const trade = trades[randomInt(random, 0, trades.length - 1)] ?? trades[0]
    return trade ? { ...person, occupation: trade.parent } : person
  })
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
    people,
    house: null,
    occupation: null,
    school: null,
    tutorRelationship: null,
    merchantJobs: false,
    romance: false,
    betrothed: null,
    crime: false,
    duty: 'ready',
    log: [entry(0, `You are a ${input.gender} ${input.socialClass.toLowerCase()} ${input.race.toLowerCase()} named ${name}. Your mother is ${motherName}. Your father is ${fatherName}.`)],
    alive: true,
    deathReason: null,
    pendingEvent: null,
    pendingOutcome: null,
    pendingOffer: null,
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
  return event.options.length > 0
}

function poolOpen(type: string, age: number, config: GameConfig, socialClass: SocialClass): boolean {
  const band = agePoolFor(type)
  if (band) return age >= band.minAge && age <= band.maxAge
  if (menuOpen(config.classEvents, age)) return type === 'Anytime' || type === socialClass
  return true
}

function agePeople(life: Life, years: number): Person[] {
  return life.people.map((person) => {
    if (!person.alive) return { ...person, diedYearsAgo: (person.diedYearsAgo ?? 0) + years }
    const age = person.age + years
    if (age >= 80) {
      return { ...person, age, alive: false, diedYearsAgo: 0 }
    }
    return { ...person, age }
  })
}

function deathNotices(before: Person[], after: Person[]): string[] {
  return before.flatMap((person) => {
    if (!person.alive) return []
    const aged = after.find((item) => item.id === person.id)
    if (!aged || aged.alive) return []
    return [`${aged.name}, your ${person.label.toLowerCase()}, dies peacefully at ${aged.age}.`]
  })
}

function die(life: Life, reason: string): Life {
  return {
    ...life,
    alive: false,
    deathReason: reason,
    pendingEvent: null,
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
    return die(life, `${life.name} slips away at ${life.age}, at the end of a very long tale.`)
  }

  const age = life.age + 1
  const agedPeople = agePeople(life, 1)
  const notices = deathNotices(life.people, agedPeople)
  let next: Life = {
    ...life,
    age,
    people: agedPeople,
    usedThisYear: [],
    log: [...life.log, ...notices.map((text) => entry(age, text))],
  }
  if (next.occupation && next.occupation.salary > 0) {
    const pay = next.occupation.salary
    next = {
      ...next,
      gold: next.gold + pay,
      log: [...next.log, entry(age, `You earn ${pay} gold for the year as ${article(next.occupation.title)} ${next.occupation.title}.`)],
    }
  }
  if (age >= config.aging.startAge) {
    const loss = Math.max(0, config.aging.constitutionLossPerYear)
    if (loss > 0 && next.constitution - loss <= 0) {
      return die(applyEffect(next, { constitution: -loss }), `At ${age}, ${life.name}'s strength finally gives out.`)
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
  if (eligible.length === 0) {
    return {
      ...next,
      log: [...next.log, entry(age, `${life.name} spends age ${age} without a notable tale.`)],
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
  config?: GameConfig,
  random: () => number = Math.random,
): Life {
  if (!life.alive || !life.pendingEvent) return life
  if (life.pendingEvent.id === TEENAGE_ID) return resolveTeenage(life, config, random)
  const option = life.pendingEvent.options.find((item) => item.id === optionId)
  if (!option) return life
  const housePrice = config ? Math.max(0, config.housing[life.socialClass]) : 0
  let passed = true
  let roll: OutcomeView['roll']
  if (option.checkHouse) {
    passed = Boolean(config) && life.gold >= housePrice
  } else if (option.checkLuck) {
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
  let next = applyEffect(life, outcome.effect)
  if (option.checkHouse && passed && config) {
    next = { ...next, gold: Math.max(0, next.gold - housePrice), house: life.socialClass }
  } else if ((option.checkHouse && !passed) || option.clearHouse) {
    next = { ...next, house: null }
  }
  const told = applyOutcomeLog(next, outcome.log, random)
  next = {
    ...told.life,
    pendingEvent: null,
    pendingOutcome: {
      title: passed ? life.pendingEvent.title : 'It goes badly',
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
      log = `Your ${parent.name} soothes you.`
      changes = `Constitution +10. ${parent.name} +10 relationship.`
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
    log = `You compliment ${person.name}. They look pleased.`
  } else if (activity === 'conversation') {
    relationship += 4
    effect = { charisma: 2 }
    log = `You talk with ${person.name} until the light changes.`
  } else if (activity === 'ask') {
    if (person.relationship < 45) {
      relationship -= 6
      log = `${person.name} refuses to hand over any coin.`
    } else {
      relationship -= 12
      effect = { gold: 40 }
      log = `${person.name} sighs and gives you 40 gold.`
    }
  } else if (life.gold < 30) {
    log = `You want to give ${person.name} a gift, but your purse is too light.`
  } else {
    relationship += 12
    effect = { gold: -30 }
    log = `You give ${person.name} a small gift. It cost 30 gold.`
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

function livingRelatives(life: Life, deaths: Set<string>): Person[] {
  return life.people.filter((person) => (
    (person.role === 'parent' || person.role === 'sibling') && person.alive && !deaths.has(person.id)
  ))
}

function standInRelative(life: Life, deaths: Set<string>, random: () => number, gone: Person | undefined, mark: string): string {
  const relatives = livingRelatives(life, deaths)
  const chosen = relatives.length === 0 ? undefined : relatives[randomInt(random, 0, relatives.length - 1)]
  if (!chosen) return gone ? `${gone.name} is already gone` : mark
  deaths.add(chosen.id)
  return `${chosen.name} dies`
}

function applyOutcomeLog(life: Life, text: string, random: () => number): { life: Life; text: string } {
  const deaths = new Set<string>()
  const resolved = text.replace(/\[(mother|father|brother|sister|sibling|friend)\]\s*dies?\b|\[wholefamily\](?:\s*dies?\b)?/gi, (mark, who?: string) => {
    const kind = (who ?? 'wholefamily').toLowerCase()
    const matches = life.people.filter((item) => matchesKin(item, kind))
    if (kind === 'wholefamily') {
      const family = matches.filter((item) => item.alive && !deaths.has(item.id))
      if (family.length === 0) return matches[0] ? `${matches[0].name} is already gone` : mark
      family.forEach((item) => deaths.add(item.id))
      return family.map((item) => `${item.name} dies`).join('. ')
    }
    const living = matches.find((item) => item.alive && !deaths.has(item.id))
    if ((kind === 'mother' || kind === 'friend') && !living) return standInRelative(life, deaths, random, matches[0], mark)
    const person = living ?? matches[0]
    if (!person) return mark
    if (!person.alive || deaths.has(person.id)) return `${person.name} is already gone`
    deaths.add(person.id)
    return `${person.name} dies`
  })
  if (deaths.size === 0) return { life, text: resolved }
  const people = life.people.map((person) => (
    deaths.has(person.id) ? { ...person, alive: false, diedYearsAgo: 0 } : person
  ))
  const next = { ...life, people }
  return { life: { ...next, parentRelationship: averageParentScore(next) }, text: resolved }
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
    log: [...life.log, entry(life.age, `${life.name} buys a ${tier.toLowerCase()} house for ${price} gold.`)],
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

function tutorScore(life: Life): number {
  if (typeof life.tutorRelationship === 'number') return life.tutorRelationship
  const teacher = life.people.find((person) => person.role === 'teacher' && person.alive)
  return teacher?.relationship ?? 0
}

function resolveTeenage(life: Life, config: GameConfig | undefined, random: () => number): Life {
  const subject = life.school ?? 'your lessons'
  let log = 'You have no studies to continue.'
  let school = life.school
  let merchantJobs = life.merchantJobs
  let betrothed = life.betrothed
  if (life.socialClass === 'Peasant') {
    if (tutorScore(life) > 80) log = `Your teacher is happy to continue teaching you in ${subject}.`
    else {
      log = 'Your teacher has reached the limit of their generosity.'
      school = null
    }
  } else if (life.socialClass === 'Merchant') {
    merchantJobs = true
    log = life.parentRelationship > 50
      ? 'Your parents cover the fees.'
      : 'Your parents refuse to cover the fees.'
  } else if (life.socialClass === 'Noble' && life.gender === 'female') {
    const trades = tradesFor('Noble')
    const trade = trades[randomInt(random, 0, trades.length - 1)] ?? trades[0]
    const raceNames = config?.names[life.race]
    const identity = raceNames
      ? randomIdentity(raceNames, 'male', random)
      : { forename: 'Aldric', surname: 'Hale' }
    const match: Betrothal = {
      job: trade?.child ?? 'Knight',
      forename: identity.forename,
      surname: identity.surname,
    }
    betrothed = match
    school = null
    log = `Your parents have betrothed you to ${match.job} ${match.forename} ${match.surname} and expect you to focus on preparing to marry him, not an education.`
  } else if (life.school) {
    log = 'You continue your studies.'
  }
  return conclude(life, { school, merchantJobs, betrothed }, {
    title: 'Teenage',
    log,
    passed: true,
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
  if (!life.occupation) {
    const log = 'You have no job to ask wages from.'
    return conclude(life, {}, { title: 'Ask for more gold', log, passed: false })
  }
  const cap = payCap(life.socialClass)
  if (life.occupation.salary >= cap) {
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
  const salary = Math.min(cap, life.occupation.salary + raiseStep(life.socialClass))
  const log = `Your pay rises to ${salary} gold per year.`
  return conclude(life, {
    occupation: { title: life.occupation.title, salary },
  }, {
    title: 'Ask for more gold',
    log,
    passed: true,
    roll,
    changes: jobChanges(life.occupation.title, salary),
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

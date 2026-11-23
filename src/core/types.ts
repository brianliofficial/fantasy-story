export type Race = 'Elf' | 'Human' | 'Dwarf'
export type SocialClass = 'Peasant' | 'Journeyman' | 'Merchant' | 'Noble'
export const DEFAULT_POOLS = ['Anytime', 'Infant', 'Child', 'Teenager', 'Adult', 'Peasant', 'Journeyman', 'Merchant', 'Noble', 'Elf', 'Milestone'] as const
export type EventType = (typeof DEFAULT_POOLS)[number]
export type CheckStat = 'constitution' | 'charisma' | 'intelligence'
export type KinRole = 'mother' | 'father' | 'brother' | 'sister' | 'sibling' | 'friend'
export type HeirRole = 'father' | 'mother' | 'brother' | 'sister'
export type RelationRole = 'parent' | 'sibling' | 'friend' | 'teacher'
export type MenuKey = 'infant' | 'childhood' | 'job' | 'school' | 'romance' | 'crime' | 'guild' | 'assets' | 'activities'
export type Gender = 'male' | 'female'
export type PersonActivity = 'compliment' | 'conversation' | 'ask' | 'gift'
export type YearActivity = 'study' | 'odd-job' | 'seek-friend' | 'rest'
export type InfantAction = 'babble' | 'cry' | 'play' | 'story'
export type ChildhoodAction = 'mischief' | 'wilderness'
export type HouseholdDuty = 'ready' | 'choosing' | 'done'

export interface StatChange {
  constitution?: number
  charisma?: number
  intelligence?: number
  gold?: number
  parentRelationship?: number
}

export interface EventOption {
  id: string
  text: string
  checkStat?: CheckStat
  checkLuck?: boolean
  goldCost?: number
  workWith?: KinRole
  setAge?: number
  setRace?: Race
  setClass?: SocialClass
  clearHouse?: boolean
  threshold?: number
  success: {
    log: string
    effect: StatChange
  }
  failure?: {
    log: string
    effect: StatChange
  }
}

export interface GameEventConfig {
  id: string
  type: string
  title: string
  description: string
  minAge?: number
  maxAge?: number
  requiredRace?: Race[]
  requiredClass?: SocialClass[]
  requiredGender?: Gender[]
  showLimit?: number
  repeatAfter?: number
  mandatory?: boolean
  nameStandIn?: HeirRole[]
  options: EventOption[]
}

export interface RaceBonus {
  constitution: number
  charisma: number
  intelligence: number
}

export interface RaceNames {
  maleForenames: string[]
  femaleForenames: string[]
  surnames: string[]
}

export interface NewCharacter {
  forename: string
  surname: string
  gender: Gender
  race: Race
  socialClass: SocialClass
}

export interface AgeWindow {
  minAge: number
  maxAge?: number
}

export interface GameConfig {
  races: Record<Race, RaceBonus>
  names: Record<Race, RaceNames>
  housing: Record<SocialClass, number>
  aging: {
    startAge: number
    constitutionLossPerYear: number
  }
  menus: Record<MenuKey, AgeWindow>
  classEvents: AgeWindow
  teenageAge: number
}

export interface Person {
  id: string
  name: string
  role: RelationRole
  label: string
  gender: Gender
  age: number
  relationship: number
  alive: boolean
  occupation?: string
  title?: string
  constitution?: number
  gold?: number
  diedYearsAgo?: number
}

export interface Stranger {
  id: string
  name: string
  race: Race
  gender: Gender
  age: number
}

export interface Occupation {
  title: string
  salary: number
}

export interface TeacherOffer {
  race: Race
  job: string
  forename: string
  surname: string
  subject: string
  gender?: Gender
  roll: OutcomeRoll
}

export interface Betrothal {
  job: string
  forename: string
  surname: string
}

export interface LogEntry {
  id: string
  age: number
  text: string
}

export interface OutcomeRoll {
  die: number
  stat: CheckStat | 'luck'
  statValue: number
  total: number
}

export interface OutcomeView {
  title: string
  log: string
  passed: boolean
  roll?: OutcomeRoll
  changes?: string
}

export interface Life {
  id: string
  name: string
  forename: string
  surname: string
  gender: Gender
  race: Race
  socialClass: SocialClass
  title?: string
  age: number
  constitution: number
  charisma: number
  intelligence: number
  gold: number
  parentRelationship: number
  people: Person[]
  house: SocialClass | null
  occupation: Occupation | null
  school: string | null
  tutorRelationship: number | null
  merchantJobs: boolean
  romance: boolean
  betrothed: Betrothal | null
  crime: boolean
  duty: HouseholdDuty
  log: LogEntry[]
  alive: boolean
  deathReason: string | null
  pendingEvent: GameEventConfig | null
  pendingOutcome: OutcomeView | null
  pendingOffer: TeacherOffer | null
  pendingLoss: string[] | null
  usedThisYear: YearActivity[]
  shownEvents: Record<string, number>
  eventYears: Record<string, number>
}

export const RACES: Race[] = ['Elf', 'Human', 'Dwarf']
export const CLASSES: SocialClass[] = ['Peasant', 'Journeyman', 'Merchant', 'Noble']
export const GENDERS: Gender[] = ['male', 'female']
export const CHECK_STATS: CheckStat[] = ['constitution', 'charisma', 'intelligence']
export const KIN_ROLES: KinRole[] = ['mother', 'father', 'brother', 'sister', 'sibling', 'friend']
export const HEIR_ROLES: HeirRole[] = ['father', 'mother', 'brother', 'sister']
export const MAX_AGE = 120

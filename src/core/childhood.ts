import type { SocialClass, TeacherOffer } from './types'

export interface Trade {
  parent: string
  child: string
  salary: number
}

export const PEASANT_TRADES: Trade[] = [
  { parent: 'Farmer', child: 'Farmer', salary: 8 },
  { parent: 'Woodcutter', child: 'Woodcutter', salary: 7 },
  { parent: 'Fisher', child: 'Fisher', salary: 6 },
  { parent: 'Labourer', child: 'Labourer', salary: 5 },
  { parent: 'Militiaman', child: 'Militiaman', salary: 10 },
  { parent: 'Trapper', child: 'Trapper', salary: 9 },
  { parent: 'Forager', child: 'Forager', salary: 3 },
  { parent: 'Shepherd', child: 'Shepherd', salary: 4 },
]

export const JOURNEYMAN_TRADES: Trade[] = [
  { parent: 'Smith', child: 'Smith', salary: 36 },
  { parent: 'Carpenter', child: 'Carpenter', salary: 28 },
  { parent: 'Butcher', child: 'Butcher', salary: 22 },
  { parent: 'Dressmaker', child: 'Dressmaker', salary: 18 },
  { parent: 'Farrier', child: 'Farrier', salary: 32 },
  { parent: 'Jeweller', child: 'Jeweller', salary: 50 },
  { parent: 'Mason', child: 'Mason', salary: 40 },
]

const MERCHANT_TRADES: Trade[] = [
  { parent: 'Trader', child: 'Trader', salary: 180 },
  { parent: 'Clerk', child: 'Clerk', salary: 80 },
  { parent: 'Priest', child: 'Priest', salary: 120 },
  { parent: 'Scribe', child: 'Scribe', salary: 90 },
  { parent: 'Cartographer', child: 'Cartographer', salary: 150 },
  { parent: 'Explorer', child: 'Explorer', salary: 200 },
  { parent: 'Ship captain', child: 'Ship captain', salary: 400 },
  { parent: 'Bard', child: 'Bard', salary: 70 },
  { parent: 'Dancer', child: 'Dancer', salary: 60 },
  { parent: 'Mummer', child: 'Mummer', salary: 55 },
]

const NOBLE_TRADES: Trade[] = [
  { parent: 'Knight', child: 'Knight', salary: 600 },
  { parent: 'Courtier', child: 'Courtier', salary: 550 },
  { parent: 'Councillor', child: 'Councillor', salary: 700 },
  { parent: 'Baron', child: 'Baron', salary: 750 },
  { parent: 'Lord', child: 'Lord', salary: 820 },
  { parent: 'Duke', child: 'Duke', salary: 900 },
  { parent: 'Grand Prince', child: 'Grand Prince', salary: 1000 },
]

export const MERCHANT_SCHOOLS: { subject: string; price: number }[] = [
  { subject: 'Letters', price: 40 },
  { subject: 'Arithmetic', price: 80 },
  { subject: 'History', price: 60 },
  { subject: 'Trade', price: 120 },
]

export const NOBLE_SUBJECTS = ['Letters', 'Arithmetic', 'History', 'Herbalism', 'Music', 'Etiquette', 'Law', 'Rhetoric']

export const TEACHER_JOBS = ['Scholar', 'Scribe', 'Priest', 'Tutor']
export const TEACHER_SUBJECTS = ['Reading', 'Letters', 'Arithmetic', 'Herbalism', 'History']

export const VAGRANT_TITLE = 'Vagrant'
export const VAGRANT_SALARY = 1

const FALLBACK_TRADE: Trade = { parent: 'Labourer', child: 'Labourer', salary: 5 }

export function payCap(socialClass: SocialClass): number {
  if (socialClass === 'Peasant') return 10
  if (socialClass === 'Journeyman') return 50
  if (socialClass === 'Merchant') return 500
  return 1000
}

export function raiseStep(socialClass: SocialClass): number {
  if (socialClass === 'Peasant') return 1
  if (socialClass === 'Journeyman') return 5
  if (socialClass === 'Merchant') return 25
  return 50
}

export function subjectsFor(socialClass: SocialClass): string[] {
  if (socialClass === 'Merchant') return MERCHANT_SCHOOLS.map((course) => course.subject)
  if (socialClass === 'Noble') return [...NOBLE_SUBJECTS]
  return [...TEACHER_SUBJECTS]
}

export function tradesFor(socialClass: SocialClass): Trade[] {
  if (socialClass === 'Peasant') return PEASANT_TRADES
  if (socialClass === 'Journeyman') return JOURNEYMAN_TRADES
  if (socialClass === 'Merchant') return MERCHANT_TRADES
  return NOBLE_TRADES
}

export function article(word: string): 'a' | 'an' {
  return /^[aeiou]/i.test(word) ? 'an' : 'a'
}

export function salaryFor(title: string): number {
  const trades = [...PEASANT_TRADES, ...JOURNEYMAN_TRADES, ...MERCHANT_TRADES, ...NOBLE_TRADES]
  return trades.find((trade) => trade.parent === title || trade.child === title)?.salary ?? 0
}

export function resolveTrade(socialClass: SocialClass, occupation?: string): Trade {
  const trades = tradesFor(socialClass)
  const found = trades.find((trade) => trade.parent === occupation || trade.child === occupation)
  return found ?? trades[0] ?? FALLBACK_TRADE
}

export function offerSentence(offer: TeacherOffer): string {
  const race = offer.race.toLowerCase()
  const job = offer.job.toLowerCase()
  const lead = article(race) === 'an' ? 'An' : 'A'
  return `${lead} ${race} ${job} named ${offer.forename} ${offer.surname} agrees to teach you ${offer.subject}. Do you accept?`
}

export function jobChanges(title: string, salary: number): string {
  return `Job: ${title}. Salary: ${salary} gold per year.`
}

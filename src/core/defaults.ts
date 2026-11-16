import { uid } from './id'
import { defaultRaceNames } from './names'
import type { EventOption, GameConfig, GameEventConfig } from './types'

export const defaultConfig = (): GameConfig => ({
  races: {
    Elf: { constitution: -10, charisma: 20, intelligence: 0 },
    Human: { constitution: 5, charisma: 5, intelligence: 5 },
    Dwarf: { constitution: 20, charisma: -10, intelligence: 0 },
  },
  names: defaultRaceNames(),
  housing: {
    Peasant: 500,
    Journeyman: 1000,
    Merchant: 5000,
    Noble: 10000,
  },
  aging: {
    startAge: 46,
    constitutionLossPerYear: 2,
  },
  menus: {
    infant: { minAge: 0, maxAge: 5 },
    childhood: { minAge: 6, maxAge: 12 },
    job: { minAge: 6 },
    school: { minAge: 6 },
    romance: { minAge: 16 },
    crime: { minAge: 6 },
    guild: { minAge: 13 },
    assets: { minAge: 13 },
    activities: { minAge: 13 },
  },
  classEvents: { minAge: 7, maxAge: 13 },
  teenageAge: 16,
})

function option(
  id: string,
  text: string,
  successLog: string,
  successEffect: EventOption['success']['effect'],
  check?: Pick<EventOption, 'checkStat' | 'threshold' | 'failure'>,
): EventOption {
  return {
    id,
    text,
    checkStat: check?.checkStat,
    threshold: check?.threshold,
    success: { log: successLog, effect: successEffect },
    failure: check?.failure,
  }
}

export const HOUSE_FIRE_ID = 'Anytime_event_001'

export function houseFireEvent(): GameEventConfig {
  return {
    id: HOUSE_FIRE_ID,
    type: 'Anytime',
    title: 'House fire',
    description: 'Your home catches fire and burns down.',
    showLimit: 5,
    repeatAfter: 10,
    options: [
      {
        id: 'rebuild',
        text: 'Rebuild better',
        checkHouse: true,
        success: {
          log: 'Our new home is the envy of your neighbours.',
          effect: { charisma: 10 },
        },
        failure: {
          log: 'You live on the street.',
          effect: { constitution: -20 },
        },
      },
      {
        id: 'street',
        text: 'Live on the street',
        clearHouse: true,
        success: {
          log: 'You live on the street.',
          effect: { constitution: -20 },
        },
      },
    ],
  }
}

export function withHouseFire(events: GameEventConfig[]): GameEventConfig[] {
  if (!events.some((event) => event.id === HOUSE_FIRE_ID)) return [houseFireEvent(), ...events]
  return events.map((event) => (
    event.id === HOUSE_FIRE_ID && event.repeatAfter == null ? { ...event, repeatAfter: 10 } : event
  ))
}

export const TEENAGE_ID = 'Milestone_event_2_teenage'

export function teenageMilestone(): GameEventConfig {
  return {
    id: TEENAGE_ID,
    type: 'Milestone',
    title: 'Teenage',
    description: 'You reach the end of your basic education.',
    minAge: 16,
    maxAge: 16,
    showLimit: 1,
    options: [
      option('continue', 'Continue to study', 'You decide what comes next.', {}),
    ],
  }
}

export const CHILDHOOD_ID = 'Milestone_event_1_childhood'

export function childhoodMilestone(): GameEventConfig {
  return {
    id: CHILDHOOD_ID,
    type: 'Milestone',
    title: 'Childhood',
    description: 'You are expected to take on responsibilities of your household.',
    minAge: 6,
    maxAge: 6,
    showLimit: 1,
    options: [
      option('continue', 'Continue', 'You face what your household asks of you.', {}),
    ],
  }
}

export function withChildhood(events: GameEventConfig[]): GameEventConfig[] {
  if (events.some((event) => event.id === CHILDHOOD_ID)) return events
  return [...events, childhoodMilestone()]
}

export function withTeenage(events: GameEventConfig[]): GameEventConfig[] {
  if (events.some((event) => event.id === TEENAGE_ID)) return events
  return [...events, teenageMilestone()]
}

export function seedEvents(): GameEventConfig[] {
  return [
    houseFireEvent(),
    {
      id: 'first-cry',
      type: 'Infant',
      title: 'First cry',
      description: 'The midwife lifts you into the lantern light. The whole cottage is waiting to hear you.',
      minAge: 0,
      maxAge: 1,
      options: [
        option('cry', 'Cry with all your lungs', 'Your cry fills the cottage, and everyone laughs in relief.', { constitution: 4, parentRelationship: 6 }),
        option('quiet', 'Blink and stay quiet', 'You watch the room in silence. They say you already look clever.', { intelligence: 4, parentRelationship: 2 }),
      ],
    },
    {
      id: 'wooden-horse',
      type: 'Child',
      title: 'The wooden horse',
      description: 'A carved horse waits by the hearth. Your sibling wants it too.',
      minAge: 4,
      maxAge: 10,
      options: [
        option('share', 'Share it', 'You take turns until the fire burns low.', { charisma: 4, parentRelationship: 4 }),
        option('keep', 'Keep it', 'You hug the horse and refuse to let go.', { constitution: 1, parentRelationship: -6 }),
      ],
    },
    {
      id: 'field-work',
      type: 'Peasant',
      title: 'A day in the fields',
      description: 'The steward needs hands before the rain. The work is muddy and long.',
      minAge: 12,
      maxAge: 40,
      requiredClass: ['Peasant'],
      options: [
        option('work', 'Work until dusk', 'Your back aches, but the steward pays you in coin.', { constitution: -2, gold: 40 }),
        option('slip', 'Slip away to the river', 'You escape the mud. The steward notices.', { charisma: -3, parentRelationship: -4 }),
      ],
    },
    {
      id: 'star-lesson',
      type: 'Elf',
      title: 'Lesson under the stars',
      description: 'An elder elf offers to teach you the old names of the constellations.',
      minAge: 8,
      maxAge: 30,
      requiredRace: ['Elf'],
      options: [
        option('listen', 'Listen all night', 'The star names settle in your memory.', { intelligence: 8 }),
        option('wander', 'Wander off', 'You follow a fox instead. The elder sighs.', { charisma: 2, intelligence: -2 }),
      ],
    },
    {
      id: 'market-day',
      type: 'Anytime',
      title: 'Market day',
      description: 'A merchant spreads silk and spices across a creaking cart and watches who comes close.',
      showLimit: 5,
      minAge: 14,
      maxAge: 70,
      options: [
        option(
          'haggle',
          'Haggle for a better price',
          'You talk the price down and pocket the difference.',
          { gold: 35, charisma: 3 },
          {
            checkStat: 'charisma',
            threshold: 50,
            failure: {
              log: 'The merchant laughs and you walk away poorer in pride.',
              effect: { charisma: -4, gold: -10 },
            },
          },
        ),
        option('pass', 'Keep walking', 'You leave the bright stalls behind.', { intelligence: 1 }),
      ],
    },
    {
      id: 'name-day',
      type: 'Milestone',
      title: 'Name day',
      description: 'The village gathers for your name day. Someone asks what you will become.',
      minAge: 18,
      maxAge: 18,
      showLimit: 1,
      options: [
        option('declare', 'Declare your ambition', 'People remember the way you said it.', { charisma: 6, parentRelationship: 4 }),
        option('toast', 'Raise a quiet toast', 'You drink with your family and let the night be simple.', { constitution: 2, parentRelationship: 8 }),
      ],
    },
    childhoodMilestone(),
    teenageMilestone(),
  ]
}

export function blankEvent(): GameEventConfig {
  return {
    id: uid(),
    type: 'Anytime',
    title: '',
    description: '',
    minAge: 0,
    maxAge: 80,
    showLimit: 5,
    options: [
      {
        id: uid(),
        text: '',
        threshold: 50,
        success: { log: '', effect: {} },
        failure: { log: '', effect: {} },
      },
    ],
  }
}

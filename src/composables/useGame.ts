import { computed, inject, provide, ref, watch, type InjectionKey, type Ref } from 'vue'
import { seedEvents, defaultConfig, withHouseFire, withTeenage } from '../core/defaults'
import {
  ageUp,
  answerTeacher,
  befriend,
  buyHouse,
  childhoodAction,
  chooseOption,
  createLife,
  dismissOutcome,
  askForGold,
  changeSubject,
  enroll,
  infantAction,
  interact,
  openHousehold,
  quitSchool,
  runAway,
  seekTeacher,
  studyHard,
  takeJob,
  workWithParent,
  yearActivity,
} from '../core/engine'
import { sanitizeConfig, sanitizeEvents, sanitizeLife } from '../core/sanitize'
import { sanitizePools, defaultPools } from '../core/pools'
import type {
  ChildhoodAction,
  GameConfig,
  GameEventConfig,
  InfantAction,
  Life,
  PersonActivity,
  NewCharacter,
  SocialClass,
  Stranger,
  YearActivity,
} from '../core/types'

const LIFE_KEY = 'fantasylife.life'
const EVENTS_KEY = 'fantasylife.events'
const CONFIG_KEY = 'fantasylife.config'
const POOLS_KEY = 'fantasylife.pools'

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as unknown : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export interface GameStore {
  life: Ref<Life | null>
  events: Ref<GameEventConfig[]>
  pools: Ref<string[]>
  config: Ref<GameConfig>
  hasLife: Ref<boolean>
  start: (input: NewCharacter) => void
  age: () => void
  choose: (optionId: string) => void
  dismiss: () => void
  visit: (personId: string, activity: PersonActivity) => void
  act: (activity: YearActivity) => void
  infant: (action: InfantAction) => void
  childhood: (action: ChildhoodAction) => void
  household: () => void
  work: (parentId: string) => void
  teacher: () => void
  answer: (accept: boolean) => void
  runaway: () => void
  lessons: (subject: string) => void
  addFriend: (stranger: Stranger) => void
  findJob: (title: string) => void
  askGold: () => void
  changeStudy: (subject: string) => void
  quitLessons: () => void
  study: () => void
  purchase: (tier: SocialClass) => void
  saveEvents: (events: GameEventConfig[]) => void
  savePools: (pools: string[]) => void
  saveConfig: (config: GameConfig) => void
  resetEvents: () => void
  resetConfig: () => void
  forgetLife: () => void
}

const gameKey: InjectionKey<GameStore> = Symbol('fantasylife')

function withClassPools(pools: string[]): string[] {
  const next = [...pools]
  for (const name of ['Journeyman', 'Merchant', 'Noble']) {
    if (!next.some((pool) => pool.toLowerCase() === name.toLowerCase())) next.push(name)
  }
  return next
}

export function provideGame(): GameStore {
  const savedLife = sanitizeLife(read(LIFE_KEY))
  const savedEvents = sanitizeEvents(read(EVENTS_KEY))
  const life = ref<Life | null>(savedLife)
  const events = ref<GameEventConfig[]>(withHouseFire(withTeenage(savedEvents ?? seedEvents())))
  const pools = ref<string[]>(withClassPools(sanitizePools(read(POOLS_KEY), events.value)))
  const config = ref<GameConfig>(sanitizeConfig(read(CONFIG_KEY)))
  const hasLife = computed(() => life.value !== null)

  watch(life, (value) => {
    if (value) write(LIFE_KEY, value)
    else localStorage.removeItem(LIFE_KEY)
  }, { deep: true })
  watch(events, (value) => write(EVENTS_KEY, value), { deep: true })
  watch(pools, (value) => write(POOLS_KEY, value), { deep: true })
  watch(config, (value) => write(CONFIG_KEY, value), { deep: true })

  const update = (next: Life) => {
    life.value = next
  }

  const store: GameStore = {
    life,
    events,
    pools,
    config,
    hasLife,
    start(input) {
      life.value = createLife(input, config.value)
    },
    age() {
      if (!life.value) return
      update(ageUp(life.value, events.value, config.value))
    },
    choose(optionId) {
      if (!life.value) return
      update(chooseOption(life.value, optionId, config.value))
    },
    dismiss() {
      if (!life.value) return
      update(dismissOutcome(life.value))
    },
    visit(personId, activity) {
      if (!life.value) return
      update(interact(life.value, personId, activity))
    },
    act(activity) {
      if (!life.value) return
      update(yearActivity(life.value, activity))
    },
    infant(action) {
      if (!life.value) return
      update(infantAction(life.value, action, Math.random, config.value))
    },
    childhood(action) {
      if (!life.value) return
      update(childhoodAction(life.value, action, Math.random, config.value))
    },
    household() {
      if (!life.value) return
      update(openHousehold(life.value, Math.random, config.value))
    },
    work(parentId) {
      if (!life.value) return
      update(workWithParent(life.value, parentId, config.value))
    },
    teacher() {
      if (!life.value) return
      update(seekTeacher(life.value, config.value))
    },
    answer(accept) {
      if (!life.value) return
      update(answerTeacher(life.value, accept))
    },
    runaway() {
      if (!life.value) return
      update(runAway(life.value, Math.random, config.value))
    },
    lessons(subject) {
      if (!life.value) return
      update(enroll(life.value, subject, config.value))
    },
    addFriend(stranger) {
      if (!life.value) return
      update(befriend(life.value, stranger, config.value))
    },
    findJob(title) {
      if (!life.value) return
      update(takeJob(life.value, title, config.value))
    },
    askGold() {
      if (!life.value) return
      update(askForGold(life.value, Math.random, config.value))
    },
    changeStudy(subject) {
      if (!life.value) return
      update(changeSubject(life.value, subject, config.value))
    },
    quitLessons() {
      if (!life.value) return
      update(quitSchool(life.value, config.value))
    },
    study() {
      if (!life.value) return
      update(studyHard(life.value, Math.random, config.value))
    },
    purchase(tier) {
      if (!life.value) return
      update(buyHouse(life.value, config.value, tier))
    },
    saveEvents(next) {
      events.value = next
      pools.value = withClassPools(sanitizePools(pools.value, next))
    },
    savePools(next) {
      pools.value = withClassPools(sanitizePools(next, events.value))
    },
    saveConfig(next) {
      config.value = next
    },
    resetEvents() {
      events.value = withTeenage(seedEvents())
      pools.value = defaultPools()
    },
    resetConfig() {
      config.value = defaultConfig()
    },
    forgetLife() {
      life.value = null
    },
  }

  provide(gameKey, store)
  return store
}

export function useGame(): GameStore {
  const store = inject(gameKey)
  if (!store) throw new Error('Game store is missing')
  return store
}

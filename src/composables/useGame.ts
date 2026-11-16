import { computed, inject, provide, ref, watch, type InjectionKey, type Ref } from 'vue'
import { CHILDHOOD_ID, childhoodMilestone, defaultConfig } from '../core/defaults'
import { loadEventLedger, supabaseConfigured } from '../core/ledger'
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
  showChildhoodMilestone,
  quitSchool,
  runAway,
  seekTeacher,
  studyHard,
  takeJob,
  workWithParent,
  yearActivity,
} from '../core/engine'
import { sanitizeConfig, sanitizeLife } from '../core/sanitize'
import { ledgerPools, sameLedger } from '../core/pools'
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
const CONFIG_KEY = 'fantasylife.config'
const RETIRED_EVENT_KEYS = ['fantasylife.events', 'fantasylife.pools']

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
  showHousehold: () => void
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
  refreshLedger: () => Promise<boolean>
  ledgerStamp: () => number
  acknowledgeLedger: (stamp: number) => void
  saveConfig: (config: GameConfig) => void
  resetConfig: () => void
  forgetLife: () => void
  ledgerNotice: Ref<{ ok: boolean; text: string } | null>
}

const gameKey: InjectionKey<GameStore> = Symbol('fantasylife')

export function provideGame(): GameStore {
  for (const key of RETIRED_EVENT_KEYS) localStorage.removeItem(key)
  const savedLife = sanitizeLife(read(LIFE_KEY))
  const life = ref<Life | null>(savedLife)
  const events = ref<GameEventConfig[]>([])
  const pools = ref<string[]>([])
  const config = ref<GameConfig>(sanitizeConfig(read(CONFIG_KEY)))
  const hasLife = computed(() => life.value !== null)
  const ledgerNotice = ref<{ ok: boolean; text: string } | null>(null)
  let revision = 0
  let acked = 0

  watch(life, (value) => {
    if (value) write(LIFE_KEY, value)
    else localStorage.removeItem(LIFE_KEY)
  }, { deep: true })
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
    showHousehold() {
      if (!life.value) return
      const card = events.value.find((event) => event.id === CHILDHOOD_ID) ?? childhoodMilestone()
      update(showChildhoodMilestone(life.value, card))
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
    ledgerNotice,
    saveEvents(next) {
      revision += 1
      events.value = next
      pools.value = ledgerPools(pools.value, next)
    },
    savePools(next) {
      revision += 1
      pools.value = ledgerPools(next, events.value)
    },
    async refreshLedger() {
      if (!supabaseConfigured() || revision !== acked) return false
      const seen = revision
      try {
        const remote = await loadEventLedger()
        if (revision !== seen || revision !== acked) return false
        const nextPools = ledgerPools(remote.pools, remote.events)
        if (sameLedger(events.value, pools.value, remote.events, nextPools)) return false
        events.value = remote.events
        pools.value = nextPools
        return true
      } catch {
        return false
      }
    },
    ledgerStamp() {
      return revision
    },
    acknowledgeLedger(stamp) {
      if (stamp > acked) acked = stamp
    },
    saveConfig(next) {
      config.value = next
    },
    resetConfig() {
      config.value = defaultConfig()
    },
    forgetLife() {
      life.value = null
    },
  }

  provide(gameKey, store)
  void alignLedger()
  return store

  async function alignLedger() {
    if (!supabaseConfigured()) {
      ledgerNotice.value = { ok: false, text: 'Supabase is not configured.' }
      return
    }
    const seen = revision
    try {
      const remote = await loadEventLedger()
      if (revision !== seen) return
      events.value = remote.events
      pools.value = ledgerPools(remote.pools, remote.events)
      const count = `${remote.events.length} event${remote.events.length === 1 ? '' : 's'} are set`
      ledgerNotice.value = { ok: true, text: `Event pool loaded. ${count}.` }
    } catch (caught) {
      ledgerNotice.value = {
        ok: false,
        text: caught instanceof Error ? caught.message : 'Could not reach Supabase.',
      }
    }
  }
}

export function useGame(): GameStore {
  const store = inject(gameKey)
  if (!store) throw new Error('Game store is missing')
  return store
}

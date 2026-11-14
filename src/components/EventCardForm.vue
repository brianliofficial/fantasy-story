<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { uid } from '../core/id'
import { cloneData } from '../core/clone'
import type { CheckStat, EventOption, GameEventConfig, Race, SocialClass, StatChange } from '../core/types'
import { CHECK_STATS, CLASSES, RACES } from '../core/types'

const props = defineProps<{ event: GameEventConfig; error?: string; pools: string[] }>()
const emit = defineEmits<{ change: [event: GameEventConfig]; save: [event: GameEventConfig]; remove: [id: string] }>()

const effectKeys = ['constitution', 'charisma', 'intelligence', 'gold', 'parentRelationship'] as const
const optionIndex = ref(0)
const logSide = ref<'success' | 'failure'>('success')

const current = computed(() => props.event.options[optionIndex.value] ?? props.event.options[0])
const hasCheck = computed(() => Boolean(current.value?.checkStat || current.value?.checkHouse))

watch(() => props.event.options.length, (length) => {
  if (optionIndex.value >= length) optionIndex.value = Math.max(0, length - 1)
})

watch(hasCheck, (value) => {
  if (!value) logSide.value = 'success'
})

function clone(): GameEventConfig {
  return cloneData(props.event)
}

function commit(next: GameEventConfig) {
  emit('change', next)
}

function update(patch: Partial<GameEventConfig>) {
  commit({ ...clone(), ...patch })
}

function setAge(key: 'minAge' | 'maxAge', raw: string) {
  update({ [key]: raw.trim() === '' ? undefined : Number(raw) })
}

function toggleRace(race: Race) {
  const currentRaces = new Set(props.event.requiredRace ?? [])
  if (currentRaces.has(race)) currentRaces.delete(race)
  else currentRaces.add(race)
  update({ requiredRace: currentRaces.size ? [...currentRaces] : undefined })
}

function toggleClass(socialClass: SocialClass) {
  const currentClasses = new Set(props.event.requiredClass ?? [])
  if (currentClasses.has(socialClass)) currentClasses.delete(socialClass)
  else currentClasses.add(socialClass)
  update({ requiredClass: currentClasses.size ? [...currentClasses] : undefined })
}

function selectOption(index: number) {
  optionIndex.value = index
  logSide.value = 'success'
}

function addOption() {
  if (props.event.options.length >= 4) return
  const options = [...props.event.options, { id: uid(), text: '', threshold: 50, success: { log: '', effect: {} } }]
  optionIndex.value = options.length - 1
  logSide.value = 'success'
  update({ options })
}

function deleteOption() {
  if (!current.value || props.event.options.length <= 1) return
  update({ options: props.event.options.filter((item) => item.id !== current.value.id) })
}

function updateOption(optionId: string, patch: Partial<EventOption>) {
  update({
    options: props.event.options.map((option) => (option.id === optionId ? { ...option, ...patch } : option)),
  })
}

function updateEffect(optionId: string, side: 'success' | 'failure', key: keyof StatChange, raw: string) {
  const option = props.event.options.find((item) => item.id === optionId)
  if (!option) return
  const currentSide = side === 'success' ? option.success : (option.failure ?? { log: '', effect: {} })
  const effect = { ...currentSide.effect }
  if (raw.trim() === '') delete effect[key]
  else effect[key] = Number(raw)
  const next = { ...currentSide, effect }
  if (side === 'success') updateOption(optionId, { success: next })
  else updateOption(optionId, { failure: next })
}

function checkValue(option: EventOption): string {
  if (option.checkHouse) return 'house'
  return option.checkStat ?? ''
}

function setCheck(optionId: string, value: string) {
  const option = props.event.options.find((item) => item.id === optionId)
  if (!option) return
  if (value === 'house') {
    updateOption(optionId, {
      checkHouse: true,
      checkStat: undefined,
      failure: option.failure ?? { log: '', effect: {} },
    })
    return
  }
  if (!value) {
    updateOption(optionId, { checkHouse: undefined, checkStat: undefined })
    return
  }
  updateOption(optionId, {
    checkHouse: undefined,
    checkStat: value as CheckStat,
    threshold: option.threshold ?? 50,
    failure: option.failure ?? { log: '', effect: {} },
  })
}

const poolOptions = computed(() => (
  props.pools.includes(props.event.type) ? props.pools : [props.event.type, ...props.pools]
))
</script>

<template>
  <article class="event-card">
    <header>
      <p class="hint">{{ event.id }}</p>
      <div class="choice-row">
        <span class="badge">{{ event.type }}</span>
      </div>
      <label class="field">Title
        <input :value="event.title" maxlength="60" @input="update({ title: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="field">Pool
        <select :value="event.type" @change="update({ type: ($event.target as HTMLSelectElement).value })">
          <option v-for="pool in poolOptions" :key="pool" :value="pool">{{ pool }}</option>
        </select>
      </label>
    </header>
    <section>
      <h2>Trigger rules</h2>
      <div class="effect-grid">
        <label class="field">Min age
          <input :value="event.minAge ?? ''" type="number" min="0" max="120" placeholder="Any" @input="setAge('minAge', ($event.target as HTMLInputElement).value)" />
        </label>
        <label class="field">Max age
          <input :value="event.maxAge ?? ''" type="number" min="0" max="120" placeholder="Any" @input="setAge('maxAge', ($event.target as HTMLInputElement).value)" />
        </label>
      </div>
      <p class="hint">Leave an age blank to leave that side open. Leave both blank and the event can happen at any age.</p>
      <p class="hint">Race filter. Leave all off to allow every race.</p>
      <div class="toggle-row">
        <button v-for="race in RACES" :key="race" type="button" class="pill" :class="{ 'is-selected': event.requiredRace?.includes(race) }" @click="toggleRace(race)">{{ race }}</button>
      </div>
      <p class="hint">Class filter. Leave all off to allow every class.</p>
      <div class="toggle-row">
        <button v-for="item in CLASSES" :key="item" type="button" class="pill" :class="{ 'is-selected': event.requiredClass?.includes(item) }" @click="toggleClass(item)">{{ item }}</button>
      </div>
    </section>
    <label class="field">Event
      <textarea :value="event.description" rows="4" maxlength="600" @input="update({ description: ($event.target as HTMLTextAreaElement).value })" />
    </label>
    <div class="tab-set">
    <div class="tab-bar" role="tablist" aria-label="Options">
      <button
        v-for="(option, index) in event.options"
        :key="option.id"
        type="button"
        class="tab"
        role="tab"
        :aria-selected="optionIndex === index"
        :class="{ 'is-selected': optionIndex === index }"
        @click="selectOption(index)"
      >Option {{ index + 1 }}</button>
      <button type="button" class="tab-plus" aria-label="Add option" :disabled="event.options.length >= 4" @click="addOption">+</button>
      <button type="button" class="tab-delete" :disabled="event.options.length <= 1" @click="deleteOption">Delete option</button>
    </div>
    <section v-if="current" class="option-card tab-panel">
      <h2>Option {{ optionIndex + 1 }}</h2>
      <label class="field">Option text
        <input :value="current.text" maxlength="80" @input="updateOption(current.id, { text: ($event.target as HTMLInputElement).value })" />
      </label>
      <div class="effect-grid">
        <label class="field">Check
          <select :value="checkValue(current)" @change="setCheck(current.id, ($event.target as HTMLSelectElement).value)">
            <option value="">None</option>
            <option value="house">House price</option>
            <option v-for="stat in CHECK_STATS" :key="stat" :value="stat">{{ stat }}</option>
          </select>
        </label>
        <label v-if="current.checkStat" class="field">Threshold
          <input :value="current.threshold ?? 50" type="number" min="0" max="100" @input="updateOption(current.id, { threshold: Number(($event.target as HTMLInputElement).value) })" />
        </label>
      </div>
      <p v-if="current.checkHouse" class="hint">Succeeds when gold covers this class's house price from Game config. The price is spent on success.</p>
      <div class="tab-set">
      <div class="tab-bar" role="tablist" aria-label="Outcome logs">
        <button type="button" class="tab" role="tab" :aria-selected="logSide === 'success'" :class="{ 'is-selected': logSide === 'success' }" @click="logSide = 'success'">Success log</button>
        <button v-if="hasCheck" type="button" class="tab" role="tab" :aria-selected="logSide === 'failure'" :class="{ 'is-selected': logSide === 'failure' }" @click="logSide = 'failure'">Failure log</button>
      </div>
      <div class="tab-panel log-panel">
      <template v-if="logSide === 'success'">
        <label class="field">Success log
          <textarea :value="current.success.log" rows="2" maxlength="400" @input="updateOption(current.id, { success: { ...current.success, log: ($event.target as HTMLTextAreaElement).value } })" />
        </label>
        <div class="effect-grid">
          <label v-for="key in effectKeys" :key="`s-${key}`" class="field">{{ key }}
            <input :value="current.success.effect[key] ?? ''" type="number" @input="updateEffect(current.id, 'success', key, ($event.target as HTMLInputElement).value)" />
          </label>
        </div>
      </template>
      <template v-else>
        <label class="field">Failure log
          <textarea :value="current.failure?.log ?? ''" rows="2" maxlength="400" @input="updateOption(current.id, { failure: { log: ($event.target as HTMLTextAreaElement).value, effect: current.failure?.effect ?? {} } })" />
        </label>
        <div class="effect-grid">
          <label v-for="key in effectKeys" :key="`f-${key}`" class="field">{{ key }}
            <input :value="current.failure?.effect[key] ?? ''" type="number" @input="updateEffect(current.id, 'failure', key, ($event.target as HTMLInputElement).value)" />
          </label>
        </div>
      </template>
      </div>
      </div>
    </section>
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div class="choice-row">
      <button type="button" class="btn btn-primary" @click="emit('save', event)">Save card</button>
      <button type="button" class="btn btn-danger" @click="emit('remove', event.id)">Delete</button>
    </div>
  </article>
</template>

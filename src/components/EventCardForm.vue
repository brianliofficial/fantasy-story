<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { agePoolFor } from '../core/age'
import { uid } from '../core/id'
import { cloneData } from '../core/clone'
import type { CheckStat, EventOption, GameEventConfig, Race, SocialClass, StatChange } from '../core/types'
import { CHECK_STATS, CLASSES, RACES } from '../core/types'

const props = defineProps<{ event: GameEventConfig; error?: string; pools: string[] }>()
const emit = defineEmits<{ change: [event: GameEventConfig]; save: [event: GameEventConfig]; remove: [id: string] }>()

const effectKeys = ['constitution', 'charisma', 'intelligence', 'gold', 'parentRelationship'] as const
const optionIndex = ref(0)
const logSide = ref<'success' | 'failure'>('success')
const effectDrafts = ref<Record<string, string>>({})

const current = computed(() => props.event.options[optionIndex.value] ?? props.event.options[0])
const hasCheck = computed(() => Boolean(current.value?.checkStat || current.value?.checkLuck))

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

function deleteOptionAt(index: number) {
  if (props.event.options.length <= 1) return
  const options = props.event.options.filter((_, itemIndex) => itemIndex !== index)
  if (optionIndex.value >= options.length) optionIndex.value = options.length - 1
  else if (index < optionIndex.value) optionIndex.value -= 1
  update({ options })
}

function updateOption(optionId: string, patch: Partial<EventOption>) {
  update({
    options: props.event.options.map((option) => (option.id === optionId ? { ...option, ...patch } : option)),
  })
}

function draftKey(optionId: string, side: 'success' | 'failure', key: keyof StatChange) {
  return `${optionId}:${side}:${key}`
}

function effectValue(optionId: string, side: 'success' | 'failure', key: keyof StatChange, value: number | undefined) {
  const id = draftKey(optionId, side, key)
  if (Object.prototype.hasOwnProperty.call(effectDrafts.value, id)) return effectDrafts.value[id]
  return value == null ? '' : String(value)
}

function rememberDraft(id: string, raw: string) {
  effectDrafts.value = { ...effectDrafts.value, [id]: raw }
}

function forgetDraft(id: string) {
  if (!Object.prototype.hasOwnProperty.call(effectDrafts.value, id)) return
  const next = { ...effectDrafts.value }
  delete next[id]
  effectDrafts.value = next
}

function updateEffect(optionId: string, side: 'success' | 'failure', key: keyof StatChange, raw: string) {
  const option = props.event.options.find((item) => item.id === optionId)
  if (!option) return
  const id = draftKey(optionId, side, key)
  const currentSide = side === 'success' ? option.success : (option.failure ?? { log: '', effect: {} })
  const effect = { ...currentSide.effect }
  if (raw.trim() === '') {
    forgetDraft(id)
    delete effect[key]
  } else if (/^-?\d+$/.test(raw.trim())) {
    forgetDraft(id)
    effect[key] = Number(raw)
  } else if (/^-?\d*$/.test(raw)) {
    rememberDraft(id, raw)
    return
  } else {
    return
  }
  const next = { ...currentSide, effect }
  if (side === 'success') updateOption(optionId, { success: next })
  else updateOption(optionId, { failure: next })
}

function setShowLimit(raw: string) {
  if (raw.trim() === '') {
    update({ showLimit: undefined })
    return
  }
  if (!/^\d+$/.test(raw.trim())) return
  const cap = props.event.type === 'Anytime' ? 5 : 99
  update({ showLimit: Math.max(1, Math.min(cap, Number(raw))) })
}

function setRepeatAfter(raw: string) {
  if (raw.trim() === '') {
    update({ repeatAfter: undefined })
    return
  }
  if (!/^\d+$/.test(raw.trim())) return
  update({ repeatAfter: Math.max(0, Math.min(120, Number(raw))) })
}

function checkValue(option: EventOption): string {
  if (option.checkLuck) return 'luck'
  return option.checkStat ?? ''
}

function setCheck(optionId: string, value: string) {
  const option = props.event.options.find((item) => item.id === optionId)
  if (!option) return
  const failure = option.failure ?? { log: '', effect: {} }
  if (value === 'luck') {
    updateOption(optionId, {
      checkLuck: true,
      checkStat: undefined,
      threshold: option.threshold ?? 50,
      failure,
    })
    return
  }
  if (!value) {
    updateOption(optionId, { checkLuck: undefined, checkStat: undefined })
    return
  }
  updateOption(optionId, {
    checkLuck: undefined,
    checkStat: value as CheckStat,
    threshold: option.threshold ?? 50,
    failure,
  })
}

const poolOptions = computed(() => (
  props.pools.includes(props.event.type) ? props.pools : [props.event.type, ...props.pools]
))
const poolBand = computed(() => agePoolFor(props.event.type))
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
      <p v-if="poolBand" class="hint">This pool matches the {{ poolBand.tag }} tag, ages {{ poolBand.minAge }}–{{ poolBand.maxAge }}.</p>
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
        <label class="field">Life log times
          <input :value="event.showLimit ?? ''" type="text" inputmode="text" :placeholder="event.type === 'Anytime' ? '5' : event.type === 'Milestone' ? '1' : 'Any'" @input="setShowLimit(($event.target as HTMLInputElement).value)" />
        </label>
        <label class="field">Years between
          <input :value="event.repeatAfter ?? ''" type="text" inputmode="text" placeholder="1" @input="setRepeatAfter(($event.target as HTMLInputElement).value)" />
        </label>
      </div>
      <p class="hint">Leave an age blank to leave that side open. Leave both blank and the event can happen at any age.</p>
      <label class="check-row">
        <input type="checkbox" :checked="event.mandatory === true" @change="update({ mandatory: ($event.target as HTMLInputElement).checked || undefined })" />
        Mandatory
      </label>
      <p v-if="event.type === 'Anytime'" class="hint">Anytime events appear at most 5 times in one life. Years between keeps a repeat from happening again until that many years have passed.</p>
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
      <div
        v-for="(option, index) in event.options"
        :key="option.id"
        class="tab"
        role="tab"
        tabindex="0"
        :aria-selected="optionIndex === index"
        :class="{ 'is-selected': optionIndex === index }"
        @click="selectOption(index)"
        @keydown.enter.prevent="selectOption(index)"
      >
        <span>Option {{ index + 1 }}</span>
        <button
          type="button"
          class="tab-x"
          :aria-label="`Remove option ${index + 1}`"
          :disabled="event.options.length <= 1"
          @click.stop="deleteOptionAt(index)"
        >×</button>
      </div>
      <button type="button" class="tab-plus" aria-label="Add option" :disabled="event.options.length >= 4" @click="addOption">+</button>
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
            <option value="luck">Luck</option>
            <option v-for="stat in CHECK_STATS" :key="stat" :value="stat">{{ stat }}</option>
          </select>
        </label>
        <label v-if="current.checkStat || current.checkLuck" class="field">Threshold
          <input :value="current.threshold ?? 50" type="number" min="0" max="100" @input="updateOption(current.id, { threshold: Number(($event.target as HTMLInputElement).value) })" />
        </label>
      </div>
      <p v-if="current.checkLuck" class="hint">Rolls 0–100. No attribute is added. Success when the roll reaches the threshold.</p>
      <div class="tab-set">
      <div class="tab-bar" role="tablist" aria-label="Outcome logs">
        <button type="button" class="tab" role="tab" :aria-selected="logSide === 'success'" :class="{ 'is-selected': logSide === 'success' }" @click="logSide = 'success'">Success log</button>
        <button v-if="hasCheck" type="button" class="tab" role="tab" :aria-selected="logSide === 'failure'" :class="{ 'is-selected': logSide === 'failure' }" @click="logSide = 'failure'">Failure log</button>
      </div>
      <p class="hint">Write [mother], [father], [brother], [sister], [sibling], or [friend] and that character's name is shown instead. Write [mother_die] when that person dies. [father_die], [brother_die], [sister_die], [sibling_die], and [friend_die] follow the same rule.</p>
      <div class="tab-panel log-panel">
      <template v-if="logSide === 'success'">
        <label class="field">Success log
          <textarea :value="current.success.log" rows="2" maxlength="400" @input="updateOption(current.id, { success: { ...current.success, log: ($event.target as HTMLTextAreaElement).value } })" />
        </label>
        <div class="effect-grid">
          <label v-for="key in effectKeys" :key="`s-${key}`" class="field">{{ key }}
            <input :value="effectValue(current.id, 'success', key, current.success.effect[key])" type="text" inputmode="text" autocomplete="off" @input="updateEffect(current.id, 'success', key, ($event.target as HTMLInputElement).value)" />
          </label>
        </div>
      </template>
      <template v-else>
        <label class="field">Failure log
          <textarea :value="current.failure?.log ?? ''" rows="2" maxlength="400" @input="updateOption(current.id, { failure: { log: ($event.target as HTMLTextAreaElement).value, effect: current.failure?.effect ?? {} } })" />
        </label>
        <div class="effect-grid">
          <label v-for="key in effectKeys" :key="`f-${key}`" class="field">{{ key }}
            <input :value="effectValue(current.id, 'failure', key, current.failure?.effect[key])" type="text" inputmode="text" autocomplete="off" @input="updateEffect(current.id, 'failure', key, ($event.target as HTMLInputElement).value)" />
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

<style lang="scss" scoped>
.check-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  font-weight: 700;

  input {
    width: 18px;
    height: 18px;
    accent-color: #c9a252;
  }
}

.event-card {
  background: var(--card);
  border-radius: 16px;
  border: 1px solid var(--line);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  h2 { margin: 0; font-size: 1.05rem; }
}

.tab-set { display: flex; flex-direction: column; }

.tab-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 2px;
  border-bottom: 1px solid var(--line);
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 -1px;
  min-height: 40px;
  border: 1px solid transparent;
  border-bottom: 0;
  border-radius: 10px 10px 0 0;
  background: transparent;
  color: var(--muted);
  padding: 8px 12px 8px 16px;
  font-weight: 700;
  cursor: pointer;

  &.is-selected {
    background: #1b1511;
    color: var(--ink);
    border-color: var(--line);
  }
}

.option-card .tab.is-selected { background: #15100c; }

.tab-x {
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font-size: 1rem;
  line-height: 1;
  padding: 0;

  &:hover { color: #e8c77b; }
}

.tab-plus {
  width: 40px;
  min-height: 40px;
  margin: 0 0 4px 6px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: transparent;
  color: #e8c77b;
  font-family: Cinzel, Georgia, serif;
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1;
  padding: 0;
}

.tab-panel {
  border: 1px solid var(--line);
  border-top: 0;
  border-radius: 0 0 14px 14px;
}

.log-panel {
  background: #15100c;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.effect-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
</style>

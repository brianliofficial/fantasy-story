<script setup lang="ts">
import { ref } from 'vue'
import EventBoard from '../components/EventBoard.vue'
import EventCardForm from '../components/EventCardForm.vue'
import { useGame } from '../composables/useGame'
import { cloneData } from '../core/clone'
import { blankEvent } from '../core/defaults'
import { appendEvent, moveEvent } from '../core/pools'
import type { AgeWindow, GameEventConfig, MenuKey } from '../core/types'
import { eventError } from '../core/validate'

const { events, pools, config, saveEvents, savePools, resetEvents } = useGame()

const menuRows: { key: MenuKey; label: string }[] = [
  { key: 'infant', label: 'Infant' },
  { key: 'childhood', label: 'Childhood' },
  { key: 'job', label: 'Job' },
  { key: 'school', label: 'School' },
  { key: 'romance', label: 'Romance' },
  { key: 'crime', label: 'Crime' },
  { key: 'guild', label: 'Guild' },
  { key: 'assets', label: 'Assets' },
  { key: 'activities', label: 'Activities' },
]

function ageNumber(raw: string, fallback: number): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.min(120, Math.round(parsed)))
}

function setMenu(key: MenuKey, edge: 'min' | 'max', event: Event) {
  const raw = (event.target as HTMLInputElement).value
  const current = config.value.menus[key]
  if (edge === 'min') {
    const minAge = ageNumber(raw, current.minAge)
    const next: AgeWindow = { minAge }
    if (current.maxAge != null) next.maxAge = Math.max(minAge, current.maxAge)
    config.value.menus[key] = next
    return
  }
  if (raw.trim() === '') {
    config.value.menus[key] = { minAge: current.minAge }
    return
  }
  config.value.menus[key] = {
    minAge: current.minAge,
    maxAge: Math.max(current.minAge, ageNumber(raw, current.minAge)),
  }
}

function setClassEvents(edge: 'min' | 'max', event: Event) {
  const raw = (event.target as HTMLInputElement).value
  const current = config.value.classEvents
  if (edge === 'min') {
    const minAge = ageNumber(raw, current.minAge)
    const next: AgeWindow = { minAge }
    if (current.maxAge != null) next.maxAge = Math.max(minAge, current.maxAge)
    config.value.classEvents = next
    return
  }
  if (raw.trim() === '') {
    config.value.classEvents = { minAge: current.minAge }
    return
  }
  config.value.classEvents = {
    minAge: current.minAge,
    maxAge: Math.max(current.minAge, ageNumber(raw, current.minAge)),
  }
}

function setTeenage(event: Event) {
  config.value.teenageAge = ageNumber((event.target as HTMLInputElement).value, config.value.teenageAge)
}
const editing = ref<GameEventConfig | null>(null)
const error = ref('')
const pendingDelete = ref('')

function open(id: string) {
  const event = events.value.find((item) => item.id === id)
  if (!event) return
  editing.value = cloneData(event)
  error.value = ''
}

function add(pool: string) {
  const event = blankEvent()
  event.type = pool
  editing.value = event
  error.value = ''
}

function change(event: GameEventConfig) {
  editing.value = event
}

function save(event: GameEventConfig) {
  const message = eventError(event)
  if (message) {
    error.value = message
    editing.value = event
    return
  }
  saveEvents(appendEvent(events.value, event))
  editing.value = null
  error.value = ''
}

function remove(id: string) {
  saveEvents(events.value.filter((item: { id: string }) => item.id !== id))
  editing.value = null
}

function move(id: string, pool: string, index: number) {
  saveEvents(moveEvent(events.value, id, pool, index))
}

function addPool(name: string) {
  savePools([...pools.value, name])
}

function removePool(pool: string) {
  const count = events.value.filter((event) => event.type === pool).length
  if (count > 0) {
    pendingDelete.value = pool
    return
  }
  savePools(pools.value.filter((item) => item !== pool))
}

function confirmRemovePool() {
  const pool = pendingDelete.value
  saveEvents(events.value.filter((event) => event.type !== pool))
  savePools(pools.value.filter((item) => item !== pool))
  pendingDelete.value = ''
  if (editing.value?.type === pool) editing.value = null
}

function restore() {
  resetEvents()
  editing.value = null
  error.value = ''
}
</script>

<template>
  <div class="page page-wide pool-page">
    <header class="admin-head">
      <h1>Event pool</h1>
      <nav class="admin-links">
        <RouterLink to="/admin/config">Config</RouterLink>
        <RouterLink to="/">Game</RouterLink>
      </nav>
    </header>
    <p class="pool-note">Each column is a pool. Drag a card by the handle, or open it to edit the full event.</p>
    <section class="pool-settings">
      <h2>Pool setting</h2>
      <p>Set the ages when each menu appears. Leave the last age blank to keep it open.</p>
      <div class="settings-grid">
        <label v-for="row in menuRows" :key="row.key" class="field">
          <span>{{ row.label }}</span>
          <span class="age-pair">
            <input type="number" min="0" max="120" :value="config.menus[row.key].minAge" :aria-label="`${row.label} from`" @input="setMenu(row.key, 'min', $event)">
            <input type="number" min="0" max="120" :value="config.menus[row.key].maxAge ?? ''" :aria-label="`${row.label} to`" placeholder="open" @input="setMenu(row.key, 'max', $event)">
          </span>
        </label>
        <label class="field">
          <span>Class events</span>
          <span class="age-pair">
            <input type="number" min="0" max="120" :value="config.classEvents.minAge" aria-label="Class events from" @input="setClassEvents('min', $event)">
            <input type="number" min="0" max="120" :value="config.classEvents.maxAge ?? ''" aria-label="Class events to" placeholder="open" @input="setClassEvents('max', $event)">
          </span>
        </label>
        <label class="field">
          <span>Teenage milestone</span>
          <input type="number" min="0" max="120" :value="config.teenageAge" aria-label="Teenage milestone age" @input="setTeenage">
        </label>
      </div>
    </section>
    <div class="choice-row pool-toolbar">
      <button type="button" class="btn" @click="restore">Restore defaults</button>
    </div>
    <EventBoard
      :pools="pools"
      :events="events"
      @move="move"
      @open="open"
      @add="add"
      @add-pool="addPool"
      @remove-pool="removePool"
    />
    <div v-if="editing" class="modal-backdrop" @click.self="editing = null">
      <div class="modal editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <h2 id="editor-title">{{ editing.title || 'New event' }}</h2>
        <EventCardForm :event="editing" :pools="pools" :error="error" @change="change" @save="save" @remove="remove" />
        <button type="button" class="btn" @click="editing = null">Close</button>
      </div>
    </div>
    <div v-if="pendingDelete" class="modal-backdrop" @click.self="pendingDelete = ''">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="delete-pool-title">
        <h2 id="delete-pool-title">Delete {{ pendingDelete }}?</h2>
        <p>The events in this pool will be deleted too.</p>
        <div class="choice-row">
          <button type="button" class="btn" @click="pendingDelete = ''">Cancel</button>
          <button type="button" class="btn btn-danger" @click="confirmRemovePool">Delete</button>
        </div>
      </section>
    </div>
  </div>
</template>

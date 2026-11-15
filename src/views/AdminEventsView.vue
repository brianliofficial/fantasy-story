<script setup lang="ts">
import { ref } from 'vue'
import EventBoard from '../components/EventBoard.vue'
import EventCardForm from '../components/EventCardForm.vue'
import { useGame } from '../composables/useGame'
import { cloneData } from '../core/clone'
import { blankEvent } from '../core/defaults'
import { appendEvent, moveEvent } from '../core/pools'
import type { GameEventConfig } from '../core/types'
import { eventError } from '../core/validate'

const { events, pools, saveEvents, savePools, resetEvents } = useGame()
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

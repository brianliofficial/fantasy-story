<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import EventBoard from '../components/EventBoard.vue'
import EventCardForm from '../components/EventCardForm.vue'
import { useGame } from '../composables/useGame'
import { cloneData } from '../core/clone'
import { blankEvent } from '../core/defaults'
import { saveEventLedger, supabaseConfigured } from '../core/ledger'
import { appendEvent, duplicateEvent, moveEvent } from '../core/pools'
import { eventPoolWorkbook, readEventPoolWorkbook } from '../core/spreadsheet'
import type { GameEventConfig } from '../core/types'
import { eventError } from '../core/validate'

const { events, pools, saveEvents, savePools, ledgerNotice, refreshLedger, ledgerStamp, acknowledgeLedger } = useGame()
const editing = ref<GameEventConfig | null>(null)
const error = ref('')
const pendingDelete = ref('')
const incoming = ref<{ events: GameEventConfig[]; pools: string[] } | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const notice = ref<{ ok: boolean; text: string; label: string } | null>(null)
const configured = supabaseConfigured()
let noticeTimer = 0
let uploadQueue = Promise.resolve()
let writes = 0
let pollTimer = 0

watch(ledgerNotice, (value) => {
  if (!value) return
  const label = value.ok ? (value.text.startsWith('Event pool loaded') ? 'Loaded' : 'Saved') : 'Not saved'
  showNotice(value.ok, value.text, label)
  armPoll()
}, { immediate: true })

function armPoll() {
  if (pollTimer || !configured) return
  pollTimer = window.setInterval(() => { void pullRemote() }, 2000)
  document.addEventListener('visibilitychange', onVisible)
}

function onVisible() {
  if (!document.hidden) void pullRemote()
}

async function pullRemote() {
  if (writes > 0 || document.hidden) return
  const changed = await refreshLedger()
  if (!changed) return
  const count = `${events.value.length} event${events.value.length === 1 ? '' : 's'} are set`
  showNotice(true, `Event pool updated. ${count}.`, 'Updated')
}

onUnmounted(() => {
  window.clearInterval(pollTimer)
  document.removeEventListener('visibilitychange', onVisible)
})

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

function showNotice(ok: boolean, text: string, label = ok ? 'Saved' : 'Not saved') {
  notice.value = { ok, text, label }
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => {
    notice.value = null
  }, 6000)
}

function upload(nextEvents: GameEventConfig[], nextPools: string[], title: string) {
  const stamp = ledgerStamp()
  const count = `${nextEvents.length} event${nextEvents.length === 1 ? '' : 's'} are set`
  writes += 1
  uploadQueue = uploadQueue.then(async () => {
    try {
      if (!configured) {
        acknowledgeLedger(stamp)
        showNotice(true, `${title} saved. ${count}.`)
        return
      }
      await saveEventLedger(nextEvents, nextPools)
      acknowledgeLedger(stamp)
      showNotice(true, `${title} saved. ${count}.`)
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : 'Supabase did not accept the event.'
      showNotice(false, detail)
    } finally {
      writes -= 1
    }
  })
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
  upload(events.value, pools.value, event.title.trim() || 'Event')
}

function remove(id: string) {
  saveEvents(events.value.filter((item: { id: string }) => item.id !== id))
  editing.value = null
  upload(events.value, pools.value, 'Event')
}

function duplicate(id: string) {
  const source = events.value.find((item) => item.id === id)
  if (!source) return
  saveEvents(duplicateEvent(events.value, id))
  upload(events.value, pools.value, `${source.title.trim() || 'Event'} copy`)
}

function move(id: string, pool: string, index: number) {
  saveEvents(moveEvent(events.value, id, pool, index))
  upload(events.value, pools.value, 'Event pool')
}

function addPool(name: string) {
  savePools([...pools.value, name])
  upload(events.value, pools.value, 'Pool')
}

function removePool(pool: string) {
  const count = events.value.filter((event) => event.type === pool).length
  if (count > 0) {
    pendingDelete.value = pool
    return
  }
  savePools(pools.value.filter((item) => item !== pool))
  upload(events.value, pools.value, 'Pool')
}

function exportExcel() {
  const bytes = eventPoolWorkbook(events.value, pools.value)
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'fantasy-life-event-pool.xlsx'
  link.click()
  URL.revokeObjectURL(url)
  const count = `${events.value.length} event${events.value.length === 1 ? '' : 's'}`
  showNotice(true, `Exported ${count}.`, 'Exported')
}

async function stageImport(event: Event) {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    incoming.value = readEventPoolWorkbook(await file.arrayBuffer())
  } catch (caught) {
    incoming.value = null
    showNotice(false, caught instanceof Error ? caught.message : 'That Excel file could not be read.')
  }
}

function confirmImport() {
  const next = incoming.value
  if (!next) return
  saveEvents(next.events)
  savePools(next.pools)
  incoming.value = null
  if (editing.value) editing.value = null
  upload(events.value, pools.value, 'Event pool')
}

function confirmRemovePool() {
  const pool = pendingDelete.value
  saveEvents(events.value.filter((event) => event.type !== pool))
  savePools(pools.value.filter((item) => item !== pool))
  pendingDelete.value = ''
  if (editing.value?.type === pool) editing.value = null
  upload(events.value, pools.value, 'Pool')
}

</script>

<template>
  <div class="page page-wide pool-page">
    <header class="admin-head">
      <h1>Event pool</h1>
      <nav class="admin-links">
        <button type="button" class="text-link" @click="exportExcel">Export Excel</button>
        <button type="button" class="text-link" @click="fileInput?.click()">Import Excel</button>
        <input ref="fileInput" class="sr-only" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" @change="stageImport" />
        <RouterLink to="/admin/config">Config</RouterLink>
        <RouterLink to="/">Game</RouterLink>
      </nav>
    </header>
    <p class="pool-note">Each column is a pool. Infant is the Infants tag, ages 0–5. Child is ages 6–12. Teenager is ages 13–18. Adult is ages 19–100. Drag empty space to move sideways. Drag a card by the handle, or open it to edit the full event.</p>
    <aside v-if="notice" class="save-notice" :class="{ 'is-error': !notice.ok }" role="status">
      <strong>{{ notice.label }}</strong>
      <p>{{ notice.text }}</p>
    </aside>
    <EventBoard
      :pools="pools"
      :events="events"
      @move="move"
      @open="open"
      @add="add"
      @remove="remove"
      @duplicate="duplicate"
      @add-pool="addPool"
      @remove-pool="removePool"
    />
    <div v-if="editing" class="modal-backdrop">
      <div class="modal editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <button type="button" class="modal-x" aria-label="Close" @click="editing = null">×</button>
        <div class="editor-body">
          <h2 id="editor-title">{{ editing.title || 'New event' }}</h2>
          <EventCardForm :event="editing" :pools="pools" :error="error" @change="change" @save="save" @remove="remove" />
          <button type="button" class="btn" @click="editing = null">Close</button>
        </div>
      </div>
    </div>
    <div v-if="incoming" class="modal-backdrop" @click.self="incoming = null">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="import-pool-title">
        <h2 id="import-pool-title">Replace the event pool?</h2>
        <p>This file has {{ incoming.events.length }} event{{ incoming.events.length === 1 ? '' : 's' }}. Importing it overwrites the current pool and saves it to Supabase.</p>
        <div class="choice-row">
          <button type="button" class="btn" @click="incoming = null">Cancel</button>
          <button type="button" class="btn btn-primary" @click="confirmImport">Import</button>
        </div>
      </section>
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

<style lang="scss" scoped>
.pool-page {
  width: 100%;
  max-width: none;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.pool-note { margin: 10px 16px; }

.save-notice {
  position: fixed;
  z-index: 40;
  top: 88px;
  left: 16px;
  width: min(280px, calc(100vw - 32px));
  margin: 0;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #231b15;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);

  strong { display: block; margin-bottom: 4px; color: #e8c77b; }
  p { margin: 0; color: var(--ink); }

  &.is-error strong { color: #e7b2b2; }
}

.editor-modal {
  position: relative;
  width: min(100%, 640px);
  overflow: visible;

  :deep(.event-card) { border: 0; padding: 0; box-shadow: none; }
}

.editor-body {
  max-height: min(85dvh, 720px);
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-x {
  position: absolute;
  top: -39px;
  right: -30px;
  z-index: 2;
  width: 36px;
  height: 36px;
  min-height: 36px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #130e0b;
  color: #e8c77b;
  font-size: 1.4rem;
  line-height: 1;
}
</style>

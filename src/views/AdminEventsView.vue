<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import EventBoard from '../components/EventBoard.vue'
import EventCardForm from '../components/EventCardForm.vue'
import { useGame } from '../composables/useGame'
import { cloneData } from '../core/clone'
import { blankEvent } from '../core/defaults'
import { loadPoolHistory, saveEventLedger, savePoolHistoryRows, supabaseConfigured } from '../core/ledger'
import { POOL_HISTORY_KEY, readPoolHistory, rememberSnapshot, type PoolSnapshot } from '../core/poolHistory'
import { appendEvent, duplicateEvent, moveEvent } from '../core/pools'
import { eventPoolWorkbook, readEventPoolWorkbook } from '../core/spreadsheet'
import type { GameEventConfig } from '../core/types'
import { eventError } from '../core/validate'

const { events, pools, saveEvents, savePools, ledgerNotice, refreshLedger, ledgerStamp, acknowledgeLedger } = useGame()
const editing = ref<GameEventConfig | null>(null)
const error = ref('')
const pendingDelete = ref('')
const pendingCard = ref('')
const historyOpen = ref(false)
const menuOpen = ref(false)
const history = ref<PoolSnapshot[]>(readPoolHistory(localStorage.getItem(POOL_HISTORY_KEY)))
const narrowQuery = window.matchMedia('(max-width: 720px)')
let historyBusy = 0
let historyTableMissing = false
let historyChain: Promise<void> = Promise.resolve()
const incoming = ref<{ events: GameEventConfig[]; pools: string[] } | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const notice = ref<{ ok: boolean; text: string; label: string } | null>(null)
const configured = supabaseConfigured()
let noticeTimer = 0
let uploadQueue = Promise.resolve()
let writes = 0
let pollTimer = 0

const pendingDeleteCount = computed(() => events.value.filter((event) => event.type === pendingDelete.value).length)
const pendingCardTitle = computed(() => events.value.find((event) => event.id === pendingCard.value)?.title.trim() || 'Untitled')

function onNarrow() {
  if (!narrowQuery.matches) menuOpen.value = false
}

onMounted(() => narrowQuery.addEventListener('change', onNarrow))

function remember(reason: string, manual = false) {
  const eventsCopy = cloneData(events.value)
  const poolsCopy = [...pools.value]
  const now = Date.now()
  historyChain = historyChain.then(() => storeHistory(eventsCopy, poolsCopy, reason, now, manual), () => storeHistory(eventsCopy, poolsCopy, reason, now, manual))
}

async function storeHistory(eventsCopy: GameEventConfig[], poolsCopy: string[], reason: string, now: number, manual: boolean) {
  historyBusy += 1
  try {
    let base = history.value
    if (configured && !historyTableMissing) {
      try {
        base = await loadPoolHistory()
      } catch (caught) {
        noteHistoryError(caught)
      }
    }
    const next = rememberSnapshot(base, eventsCopy, poolsCopy, reason, now, manual)
    history.value = next
    localStorage.setItem(POOL_HISTORY_KEY, JSON.stringify(next))
    if (next === base || !configured || historyTableMissing) return
    await savePoolHistoryRows(next)
  } catch (caught) {
    noteHistoryError(caught)
  } finally {
    historyBusy -= 1
  }
}

async function pullHistory() {
  if (!configured || historyBusy > 0 || historyTableMissing) return
  try {
    const remote = await loadPoolHistory()
    if (remote.length === 0) {
      const local = readPoolHistory(localStorage.getItem(POOL_HISTORY_KEY))
      if (local.length > 0) {
        history.value = local
        historyBusy += 1
        try {
          await savePoolHistoryRows(local)
        } finally {
          historyBusy -= 1
        }
        return
      }
    }
    history.value = remote
    localStorage.setItem(POOL_HISTORY_KEY, JSON.stringify(remote))
  } catch (caught) {
    noteHistoryError(caught)
  }
}

function noteHistoryError(caught: unknown) {
  const detail = caught instanceof Error ? caught.message : 'Pool history was not shared.'
  if (/pool_history|PGRST205|42P01|schema cache/i.test(detail)) {
    if (historyTableMissing) return
    historyTableMissing = true
    showNotice(false, 'Shared pool history needs the new Supabase table. Copies on this browser are still kept.')
    return
  }
  showNotice(false, detail)
}

historyChain = pullHistory()
const historyReady = historyChain

function queueHistoryRefresh() {
  historyChain = historyChain.then(() => pullHistory(), () => pullHistory())
}

function openHistory() {
  historyOpen.value = true
  queueHistoryRefresh()
}

function savePoolHistory() {
  remember('Manual save', true)
  const count = `${events.value.length} event${events.value.length === 1 ? '' : 's'}`
  showNotice(true, `Pool history saved. ${count}.`, 'Saved')
}

function savedWhen(savedAt: number) {
  return new Date(savedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function showNotice(ok: boolean, text: string, label = ok ? 'Saved' : 'Not saved') {
  notice.value = { ok, text, label }
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => {
    notice.value = null
  }, 6000)
}

watch(ledgerNotice, (value) => {
  if (!value) return
  const label = value.ok ? (value.text.startsWith('Event pool loaded') ? 'Loaded' : 'Saved') : 'Not saved'
  showNotice(value.ok, value.text, label)
  if (value.ok && value.text.startsWith('Event pool loaded')) void historyReady.then(() => remember('Auto save'))
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
  queueHistoryRefresh()
  if (!changed) return
  const count = `${events.value.length} event${events.value.length === 1 ? '' : 's'} are set`
  showNotice(true, `Event pool updated. ${count}.`, 'Updated')
}

onUnmounted(() => {
  window.clearInterval(pollTimer)
  document.removeEventListener('visibilitychange', onVisible)
  narrowQuery.removeEventListener('change', onNarrow)
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
  remember(`Before saving ${event.title.trim() || 'Untitled'}`)
  saveEvents(appendEvent(events.value, event))
  editing.value = null
  error.value = ''
  upload(events.value, pools.value, event.title.trim() || 'Event')
}

function remove(id: string) {
  if (!events.value.some((item) => item.id === id)) return
  pendingCard.value = id
}

function confirmRemoveCard() {
  const id = pendingCard.value
  const source = events.value.find((item) => item.id === id)
  if (!source) {
    pendingCard.value = ''
    return
  }
  remember(`Before deleting ${source.title.trim() || 'Untitled'}`)
  saveEvents(events.value.filter((item) => item.id !== id))
  pendingCard.value = ''
  editing.value = null
  upload(events.value, pools.value, 'Event')
}

function duplicate(id: string) {
  const source = events.value.find((item) => item.id === id)
  if (!source) return
  remember(`Before duplicating ${source.title.trim() || 'Untitled'}`)
  saveEvents(duplicateEvent(events.value, id))
  upload(events.value, pools.value, `${source.title.trim() || 'Event'} copy`)
}

function move(id: string, pool: string, index: number) {
  const source = events.value.find((item) => item.id === id)
  if (!source) return
  remember(`Before moving ${source.title.trim() || 'Untitled'}`)
  saveEvents(moveEvent(events.value, id, pool, index))
  upload(events.value, pools.value, 'Event pool')
}

function addPool(name: string) {
  remember(`Before adding ${name}`)
  savePools([...pools.value, name])
  upload(events.value, pools.value, 'Pool')
}

function removePool(pool: string) {
  pendingDelete.value = pool
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
  remember('Before replacing the event pool')
  saveEvents(next.events)
  savePools(next.pools)
  incoming.value = null
  if (editing.value) editing.value = null
  upload(events.value, pools.value, 'Event pool')
}

function confirmRemovePool() {
  const pool = pendingDelete.value
  if (!pool) return
  remember(`Before deleting ${pool}`)
  saveEvents(events.value.filter((event) => event.type !== pool))
  savePools(pools.value.filter((item) => item !== pool))
  pendingDelete.value = ''
  if (editing.value?.type === pool) editing.value = null
  upload(events.value, pools.value, 'Pool')
}

function restoreSnapshot(snapshot: PoolSnapshot) {
  remember('Before restoring a saved copy')
  saveEvents(cloneData(snapshot.events))
  savePools([...snapshot.pools])
  historyOpen.value = false
  if (editing.value) editing.value = null
  upload(events.value, pools.value, 'Event pool')
}

</script>

<template>
  <div class="page page-wide pool-page">
    <button v-if="menuOpen" type="button" class="nav-backdrop" aria-label="Close menu" @click="menuOpen = false" />
    <header class="admin-head">
      <h1>Event pool</h1>
      <button type="button" class="nav-toggle" :aria-expanded="menuOpen" aria-controls="pool-actions" @click="menuOpen = !menuOpen">
        <span class="nav-bars" aria-hidden="true"><span></span><span></span><span></span></span>
        {{ menuOpen ? 'Close' : 'Menu' }}
      </button>
      <nav id="pool-actions" class="admin-links" :class="{ 'is-open': menuOpen }" @click="menuOpen = false">
        <button type="button" class="text-link" @click="savePoolHistory">Save pool history</button>
        <button type="button" class="text-link" @click="openHistory">Event pool history</button>
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
    <div v-if="historyOpen" class="modal-backdrop">
      <section class="modal history-dialog" role="dialog" aria-modal="true" aria-labelledby="pool-history-title">
        <h2 id="pool-history-title">Event pool history</h2>
        <p>The last five copies are shared with everyone on this event pool. Older copies are deleted.</p>
        <div v-if="history.length === 0" class="hint">No copies yet. A copy is kept before each change.</div>
        <div v-else class="history-list">
          <article v-for="snapshot in history" :key="snapshot.id" class="history-row">
            <div>
              <strong>{{ savedWhen(snapshot.savedAt) }}</strong>
              <p>{{ snapshot.reason }}</p>
              <p>{{ snapshot.events.length }} event{{ snapshot.events.length === 1 ? '' : 's' }} · {{ snapshot.pools.join(', ') }}</p>
            </div>
            <button type="button" class="btn" @click="restoreSnapshot(snapshot)">Restore</button>
          </article>
        </div>
        <button type="button" class="btn" @click="historyOpen = false">Close</button>
      </section>
    </div>
    <div v-if="pendingDelete" class="modal-backdrop">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="delete-pool-title">
        <h2 id="delete-pool-title">Delete {{ pendingDelete }}?</h2>
        <p v-if="pendingDeleteCount === 0">This pool has no events. Press Confirm to delete it.</p>
        <p v-else>This pool and its {{ pendingDeleteCount }} event{{ pendingDeleteCount === 1 ? '' : 's' }} will be deleted. Press Confirm to delete it.</p>
        <div class="choice-row">
          <button type="button" class="btn" @click="pendingDelete = ''">Cancel</button>
          <button type="button" class="btn btn-danger" @click="confirmRemovePool">Confirm</button>
        </div>
      </section>
    </div>
    <div v-if="pendingCard" class="modal-backdrop">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="delete-card-title">
        <h2 id="delete-card-title">Delete {{ pendingCardTitle }}?</h2>
        <p>Press Confirm to delete this event.</p>
        <div class="choice-row">
          <button type="button" class="btn" @click="pendingCard = ''">Cancel</button>
          <button type="button" class="btn btn-danger" @click="confirmRemoveCard">Confirm</button>
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

.history-dialog {
  width: min(100%, 560px);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: min(50dvh, 420px);
  overflow: auto;
}

.history-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;

  strong { display: block; color: #e8c77b; }
  p { margin: 2px 0 0; color: var(--muted); font-size: 0.92rem; }
  .btn { flex: none; }
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

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { usePoolDrag } from '../composables/usePoolDrag'
import { agePoolFor, ageTagLabel } from '../core/age'
import { MAX_AGE, type GameEventConfig } from '../core/types'

const props = defineProps<{
  pools: string[]
  events: GameEventConfig[]
}>()

const emit = defineEmits<{
  move: [id: string, pool: string, index: number]
  open: [id: string]
  add: [pool: string]
  addPool: [name: string]
  removePool: [pool: string]
  remove: [id: string]
  duplicate: [id: string]
}>()

const boardRef = ref<HTMLElement | null>(null)
const poolName = ref('')
const poolError = ref('')
const panning = ref(false)
const moving = ref<GameEventConfig | null>(null)

function ruleNote(card: GameEventConfig): string {
  const notes: string[] = []
  if (card.mandatory) notes.push('Mandatory')
  else if (typeof card.possible === 'number') notes.push(`Only possible ${card.possible}%`)
  if (card.gate?.stat && card.gate.op && card.gate.amount != null) notes.push(`${card.gate.stat} ${card.gate.op} ${card.gate.amount}`)
  return notes.length > 0 ? ` · ${notes.join(' · ')}` : ''
}
const { drag, begin } = usePoolDrag(boardRef, (id, pool, index) => emit('move', id, pool, index))
let panPointer = -1
let panOrigin = 0
let panScroll = 0

function canPan(target: EventTarget | null) {
  return target instanceof Element
    && !target.closest('button, a, input, textarea, select, label, .pool-card')
}

function startPan(event: PointerEvent) {
  if (event.button !== 0 || !canPan(event.target)) return
  const board = boardRef.value
  if (!board) return
  panPointer = event.pointerId
  panOrigin = event.clientX
  panScroll = board.scrollLeft
  panning.value = true
  window.addEventListener('pointermove', movePan)
  window.addEventListener('pointerup', endPan)
  window.addEventListener('pointercancel', endPan)
  try { board.setPointerCapture(event.pointerId) } catch { /* the pointer can end before capture */ }
}

function movePan(event: PointerEvent) {
  if (!panning.value || event.pointerId !== panPointer) return
  const board = boardRef.value
  if (!board) return
  event.preventDefault()
  board.scrollLeft = panScroll - (event.clientX - panOrigin)
}

function endPan(event: PointerEvent) {
  if (event.pointerId !== panPointer) return
  panning.value = false
  panPointer = -1
  window.removeEventListener('pointermove', movePan)
  window.removeEventListener('pointerup', endPan)
  window.removeEventListener('pointercancel', endPan)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', movePan)
  window.removeEventListener('pointerup', endPan)
  window.removeEventListener('pointercancel', endPan)
})

const columns = computed(() => props.pools.map((pool) => ({
  pool,
  tag: agePoolFor(pool),
  events: props.events.filter((event) => event.type === pool),
})))

function submitPool() {
  const name = poolName.value.trim()
  if (!name) {
    poolError.value = 'Name this pool.'
    return
  }
  if (props.pools.some((pool) => pool.toLowerCase() === name.toLowerCase())) {
    poolError.value = 'That pool already exists.'
    return
  }
  poolError.value = ''
  poolName.value = ''
  emit('addPool', name)
}

function onGrip(event: PointerEvent, card: GameEventConfig) {
  event.preventDefault()
  begin(event, card.id, card.title || 'Untitled')
}

function moveBy(card: GameEventConfig, delta: -1 | 1) {
  const column = columns.value.find((item) => item.pool === card.type)
  if (!column) return
  const index = column.events.findIndex((item) => item.id === card.id)
  const next = index + delta
  if (index < 0 || next < 0 || next >= column.events.length) return
  emit('move', card.id, card.type, next)
}

function moveAcross(card: GameEventConfig, delta: -1 | 1) {
  const index = props.pools.indexOf(card.type)
  const pool = props.pools[index + delta]
  if (!pool) return
  emit('move', card.id, pool, 0)
}

function otherPools(card: GameEventConfig | null): string[] {
  if (!card) return []
  return props.pools.filter((pool) => pool !== card.type)
}

function confirmMove(pool: string) {
  const card = moving.value
  if (!card || !pool || pool === card.type) return
  const index = props.events.filter((event) => event.type === pool).length
  moving.value = null
  emit('move', card.id, pool, index)
}
</script>

<template>
  <div
    ref="boardRef"
    class="pool-board"
    :class="{ 'is-panning': panning }"
    @pointerdown="startPan"
  >
    <section v-for="column in columns" :key="column.pool" class="pool-column" :data-pool="column.pool">
      <header class="pool-head">
        <div>
          <h2>{{ column.pool }}</h2>
          <p v-if="column.tag" class="pool-tag">{{ ageTagLabel(column.tag) }}</p>
        </div>
        <button type="button" class="text-btn" @click="emit('removePool', column.pool)">Delete</button>
      </header>
      <div class="pool-cards">
        <template v-for="(card, index) in column.events" :key="card.id">
          <div v-if="drag?.active && drag.overPool === column.pool && drag.overIndex === index" class="drop-line" />
          <article
            class="pool-card"
            :class="{ 'is-hidden': drag?.active && drag.eventId === card.id }"
            :data-card-id="card.id"
          >
            <button
              type="button"
              class="grip"
              :aria-label="`Move ${card.title || 'Untitled'}. Arrow keys also change the order.`"
              @pointerdown="onGrip($event, card)"
              @keydown.up.prevent="moveBy(card, -1)"
              @keydown.down.prevent="moveBy(card, 1)"
              @keydown.left.prevent="moveAcross(card, -1)"
              @keydown.right.prevent="moveAcross(card, 1)"
            >
              ::
            </button>
            <button type="button" class="pool-card-body" @click="emit('open', card.id)">
              <strong>{{ card.title || 'Untitled' }}</strong>
              <span v-if="card.minAge == null && card.maxAge == null">Any age{{ ruleNote(card) }}</span>
              <span v-else>Age {{ card.minAge ?? 0 }}–{{ card.maxAge ?? MAX_AGE }}{{ ruleNote(card) }}</span>
            </button>
            <div class="card-menu">
              <button type="button" class="icon-btn" :aria-label="`Duplicate ${card.title || 'Untitled'}`" @click="emit('duplicate', card.id)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="2"/></svg>
              </button>
              <button type="button" class="icon-btn" :aria-label="`Move ${card.title || 'Untitled'}`" @click="moving = card">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button type="button" class="icon-btn is-danger" :aria-label="`Delete ${card.title || 'Untitled'}`" @click="emit('remove', card.id)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M8 7l1 13h6l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
          </article>
        </template>
        <div v-if="drag?.active && drag.overPool === column.pool && drag.overIndex === column.events.length" class="drop-line" />
        <p v-if="column.events.length === 0" class="hint">No events in this pool.</p>
      </div>
      <button type="button" class="btn btn-block" @click="emit('add', column.pool)">Add event</button>
    </section>
    <form class="pool-column pool-create" @submit.prevent="submitPool">
      <h2>New pool</h2>
      <label class="field">Name
        <input v-model="poolName" maxlength="40" placeholder="For example, War" />
      </label>
      <p v-if="poolError" class="form-error">{{ poolError }}</p>
      <button type="submit" class="btn btn-primary btn-block">Add pool</button>
    </form>
    <div v-if="moving" class="modal-backdrop">
      <section class="modal move-dialog" role="dialog" aria-modal="true" aria-labelledby="move-card-title">
        <h2 id="move-card-title">Move {{ moving.title || 'Untitled' }}</h2>
        <p>Which event pool should this card move to?</p>
        <div class="choice-row">
          <button v-for="pool in otherPools(moving)" :key="pool" type="button" class="btn" @click="confirmMove(pool)">{{ pool }}</button>
        </div>
        <button type="button" class="btn" @click="moving = null">Cancel</button>
      </section>
    </div>
    <div
      v-if="drag?.active"
      class="drag-ghost"
      :style="{ width: `${drag.width}px`, height: `${drag.height}px`, transform: `translate(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px)` }"
    >
      {{ drag.title }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
.pool-board {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 0 16px 16px;
  align-items: stretch;
  cursor: grab;

  &.is-panning { cursor: grabbing; user-select: none; }

  input, textarea, select { cursor: text; }
}

.pool-column {
  flex: 0 0 min(320px, 86vw);
  background: #1b1511;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 100%;
}

.pool-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;

  h2 { margin: 0; font-size: 1rem; }
}

.pool-tag { margin: 2px 0 0; color: #c9a252; font-size: 0.75rem; }

.pool-cards {
  flex: 1;
  min-height: 48px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pool-card {
  display: flex;
  gap: 8px;
  align-items: stretch;
  cursor: default;
  background: #231b15;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 8px;

  &.is-hidden { display: none; }
}

.grip {
  width: 44px;
  min-height: 44px;
  border: 0;
  border-radius: 10px;
  background: #130e0b;
  color: var(--ink);
  font-weight: 800;
  letter-spacing: -1px;
  touch-action: none;
}

.pool-card-body {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  border: 0;
  background: transparent;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0;

  strong { overflow-wrap: anywhere; }
  span { color: var(--muted); font-size: 0.85rem; }
}

.card-menu {
  flex: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  min-height: 32px;
  padding: 0;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #130e0b;
  color: #e8c77b;

  svg { width: 16px; height: 16px; }
  &.is-danger { color: #e7b2b2; border-color: rgba(140, 35, 35, 0.55); }
}

.move-dialog { width: min(100%, 480px); }

.drop-line { height: 4px; border-radius: 999px; background: var(--blue); }

.text-btn {
  border: 0;
  background: transparent;
  min-height: 44px;
  color: var(--danger);
  font-weight: 700;
}

.pool-create {
  background: #231b15;
  border: 1px solid var(--line);
  border-radius: 16px;

  h2 { margin: 0; font-size: 1rem; }
}

.drag-ghost {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  background: #231b15;
  color: var(--ink);
  border: 1px solid var(--gold);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
  font-weight: 700;
  pointer-events: none;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePoolDrag } from '../composables/usePoolDrag'
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
}>()

const boardRef = ref<HTMLElement | null>(null)
const poolName = ref('')
const poolError = ref('')
const { drag, begin } = usePoolDrag(boardRef, (id, pool, index) => emit('move', id, pool, index))

const columns = computed(() => props.pools.map((pool) => ({
  pool,
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
</script>

<template>
  <div ref="boardRef" class="pool-board">
    <section v-for="column in columns" :key="column.pool" class="pool-column" :data-pool="column.pool">
      <header class="pool-head">
        <h2>{{ column.pool }}</h2>
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
              <span v-if="card.minAge == null && card.maxAge == null">Any age</span>
              <span v-else>Age {{ card.minAge ?? 0 }}–{{ card.maxAge ?? MAX_AGE }}</span>
            </button>
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
    <div
      v-if="drag?.active"
      class="drag-ghost"
      :style="{ width: `${drag.width}px`, height: `${drag.height}px`, transform: `translate(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px)` }"
    >
      {{ drag.title }}
    </div>
  </div>
</template>

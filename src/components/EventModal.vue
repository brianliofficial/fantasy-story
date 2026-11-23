<script setup lang="ts">
import { nameKin } from '../core/engine'
import type { GameEventConfig, Life } from '../core/types'

const props = defineProps<{ life: Life; event: GameEventConfig }>()
const emit = defineEmits<{ choose: [optionId: string] }>()
const standIn = props.event.nameStandIn ?? []
const title = nameKin(props.event.title, props.life, Math.random, standIn)
const description = nameKin(props.event.description, props.life, Math.random, standIn)
const options = props.event.options.map((option) => ({
  id: option.id,
  text: nameKin(option.text, props.life, Math.random, standIn),
  cost: option.goldCost ?? 0,
}))
function unaffordable(cost: number): boolean {
  return cost > props.life.gold
}
</script>

<template>
  <div class="modal-backdrop">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="event-title">
      <p class="badge">{{ event.type }}</p>
      <h2 id="event-title">{{ title }}</h2>
      <p>{{ description }}</p>
      <button
        v-for="option in options"
        :key="option.id"
        type="button"
        class="choice"
        :disabled="unaffordable(option.cost)"
        @click="emit('choose', option.id)"
      >
        <span>{{ option.text }}<small v-if="option.cost > 0">{{ option.cost }} gold</small></span>
      </button>
    </section>
  </div>
</template>

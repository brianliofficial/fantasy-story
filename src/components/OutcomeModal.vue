<script setup lang="ts">
import { computed } from 'vue'
import type { OutcomeView } from '../core/types'

const props = defineProps<{ outcome: OutcomeView }>()
const emit = defineEmits<{ close: [] }>()

const statLabel = computed(() => {
  const stat = props.outcome.roll?.stat
  if (stat === 'constitution') return 'Constitution'
  if (stat === 'charisma') return 'Charisma'
  if (stat === 'intelligence') return 'Intelligence'
  return ''
})
</script>

<template>
  <div class="modal-backdrop">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="outcome-title">
      <p class="badge">{{ outcome.passed ? 'Success' : 'Failure' }}</p>
      <h2 id="outcome-title">{{ outcome.title }}</h2>
      <div v-if="outcome.roll" class="roll">
        <span>Roll</span>
        <strong>{{ outcome.roll.die }}</strong>
        <span v-if="statLabel">+ {{ statLabel }} {{ outcome.roll.statValue }}</span>
        <span>Total {{ outcome.roll.total }}</span>
      </div>
      <p>{{ outcome.log }}</p>
      <p v-if="outcome.changes" class="hint">{{ outcome.changes }}</p>
      <button type="button" class="btn btn-green btn-block" @click="emit('close')">Continue</button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { offerSentence } from '../core/childhood'
import type { TeacherOffer } from '../core/types'

const props = defineProps<{ offer: TeacherOffer }>()
const emit = defineEmits<{ answer: [accept: boolean] }>()

const sentence = computed(() => offerSentence(props.offer))
const statLabel = computed(() => {
  if (props.offer.roll.stat === 'charisma') return 'Charisma'
  if (props.offer.roll.stat === 'constitution') return 'Constitution'
  return 'Intelligence'
})
</script>

<template>
  <div class="modal-backdrop">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="offer-title">
      <p class="badge">A teacher</p>
      <h2 id="offer-title">Do you accept?</h2>
      <div class="roll">
        <span>Roll</span>
        <strong>{{ offer.roll.die }}</strong>
        <span v-if="offer.roll.statValue !== 0">+ {{ statLabel }} {{ offer.roll.statValue }}</span>
        <span>Total {{ offer.roll.total }}</span>
      </div>
      <p>{{ sentence }}</p>
      <div class="choice-row">
        <button type="button" class="btn btn-green" @click="emit('answer', true)">Yes</button>
        <button type="button" class="btn" @click="emit('answer', false)">No</button>
      </div>
    </section>
  </div>
</template>

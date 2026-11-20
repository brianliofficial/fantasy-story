<script setup lang="ts">
import { nameKin } from '../core/engine'
import type { GameEventConfig, Life } from '../core/types'

const props = defineProps<{ life: Life; event: GameEventConfig }>()
const emit = defineEmits<{ choose: [optionId: string] }>()
const title = nameKin(props.event.title, props.life)
const description = nameKin(props.event.description, props.life)
const options = props.event.options.map((option) => ({ id: option.id, text: nameKin(option.text, props.life) }))
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
        @click="emit('choose', option.id)"
      >
        <span>{{ option.text }}</span>
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { GameEventConfig, Life } from '../core/types'

defineProps<{ life: Life; event: GameEventConfig }>()
const emit = defineEmits<{ choose: [optionId: string] }>()
</script>

<template>
  <div class="modal-backdrop">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="event-title">
      <p class="badge">{{ event.type }}</p>
      <h2 id="event-title">{{ event.title }}</h2>
      <p>{{ event.description }}</p>
      <button
        v-for="option in event.options"
        :key="option.id"
        type="button"
        class="choice"
        @click="emit('choose', option.id)"
      >
        <span>{{ option.text }}</span>
        <!-- <small v-if="option.checkHouse">{{ config.housing[life.socialClass].toLocaleString('en-US') }} g</small>
        <small v-else-if="option.checkStat">{{ option.checkStat }} {{ option.threshold ?? 50 }}+</small> -->
      </button>
    </section>
  </div>
</template>

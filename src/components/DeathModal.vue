<script setup lang="ts">
import type { Life } from '../core/types'

defineProps<{ life: Life }>()
const emit = defineEmits<{ home: [] }>()
</script>

<template>
  <div class="modal-backdrop">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="death-title">
      <p class="badge">Death</p>
      <h2 id="death-title">{{ life.name }}</h2>
      <p>Died at age {{ life.age }}.</p>
      <p>{{ life.deathReason }}</p>
      <button type="button" class="btn btn-green btn-block" @click="emit('home')">Close</button>
    </section>
  </div>
</template>

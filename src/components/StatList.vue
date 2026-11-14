<script setup lang="ts">
import type { Life } from '../core/types'

defineProps<{ life: Life }>()

const bars = [
  { key: 'constitution', label: 'Constitution', color: '#2f8253' },
  { key: 'charisma', label: 'Charisma', color: '#a62b2b' },
  { key: 'intelligence', label: 'Intelligence', color: '#c9a252' },
] as const
</script>

<template>
  <div class="stack" style="padding: 0">
    <div v-for="bar in bars" :key="bar.key" class="stat">
      <span>{{ bar.label }}</span>
      <div class="track" role="meter" :aria-valuenow="life[bar.key]" aria-valuemin="0" aria-valuemax="100" :aria-label="bar.label">
        <div class="fill" :style="{ width: `${life[bar.key]}%`, background: bar.color }" />
      </div>
      <span>{{ life[bar.key] }}</span>
    </div>
  </div>
</template>

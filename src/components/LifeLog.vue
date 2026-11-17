<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { LogEntry } from '../core/types'

const props = defineProps<{ entries: LogEntry[] }>()
const scroller = ref<HTMLElement | null>(null)

watch(() => props.entries.at(-1)?.id ?? '', async () => {
  await nextTick()
  const node = scroller.value
  if (!node) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  node.scrollTo({ top: node.scrollHeight, behavior: reduce ? 'auto' : 'smooth' })
}, { immediate: true })
</script>

<template>
  <div ref="scroller" class="log-scroll" aria-label="Life log">
    <article v-for="entry in entries" :key="entry.id" class="log-entry">
      <strong>Age {{ entry.age }}</strong>
      <p>{{ entry.text }}</p>
    </article>
  </div>
</template>

<style lang="scss" scoped>
.log-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px 16px;

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb { background: #6e5326; border-radius: 999px; }
}

.log-entry {
  margin: 0 0 14px;

  strong { display: block; color: var(--blue-dark); font-size: 0.92rem; }
  p { margin: 2px 0 0; }
}
</style>

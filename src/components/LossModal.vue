<script setup lang="ts">
defineProps<{ lines: string[] }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="modal-backdrop">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="loss-title">
      <p class="badge">Death</p>
      <h2 id="loss-title">Passed away</h2>
      <p v-for="(line, index) in lines" :key="index">{{ line }}</p>
      <button type="button" class="btn btn-green btn-block" @click="emit('close')">Continue</button>
    </section>
  </div>
</template>

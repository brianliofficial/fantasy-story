<script setup lang="ts">
import { provideGame } from './composables/useGame'

provideGame()
</script>

<template>
  <router-view />
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import BottomDock from '../components/BottomDock.vue'
import { shows } from '../core/engine'
import { useGame } from '../composables/useGame'

const router = useRouter()
const { life, config } = useGame()

watch(life, (value) => {
  if (!value) router.replace('/')
  else if (!shows(config.value, 'romance', value.age)) router.replace('/play')
}, { immediate: true })
</script>

<template>
  <div v-if="life && shows(config, 'romance', life.age)" class="play">
    <header class="page-head">
      <RouterLink class="back" to="/play">Close</RouterLink>
      <h1>Romance</h1>
      <span />
    </header>
    <main class="stage">
      <article v-if="life.betrothed" class="card">
        <h2>{{ life.betrothed.job }} {{ life.betrothed.forename }} {{ life.betrothed.surname }}</h2>
        <p>Your parents have betrothed you.</p>
      </article>
      <article v-else class="card">
        <h2>Romance</h2>
        <p>The romance menu is open.</p>
      </article>
    </main>
    <BottomDock />
  </div>
</template>

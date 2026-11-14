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
  else if (!value.crime || !shows(config.value, 'crime', value.age)) router.replace('/play')
}, { immediate: true })
</script>

<template>
  <div v-if="life && life.crime" class="play">
    <header class="page-head">
      <RouterLink class="back" to="/play">Close</RouterLink>
      <h1>Crime</h1>
      <span />
    </header>
    <main class="stage">
      <article class="card">
        <h2>The streets</h2>
        <p>You have nowhere to go. The crime menu is unlocked.</p>
      </article>
    </main>
    <BottomDock />
  </div>
</template>

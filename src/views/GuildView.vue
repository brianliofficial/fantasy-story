<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import BottomDock from '../components/BottomDock.vue'
import { useGame } from '../composables/useGame'
import { shows } from '../core/engine'

const router = useRouter()
const { life, config, act } = useGame()
watch(life, (value) => {
  if (!value) router.replace('/')
  else if (!shows(config.value, 'guild', value.age)) router.replace('/play')
}, { immediate: true })
</script>

<template>
  <div v-if="life" class="play">
    <header class="page-head">
      <RouterLink class="back" to="/play">Close</RouterLink>
      <h1>Guild</h1>
      <span />
    </header>
    <main class="stage">
      <section class="card">
        <h2>{{ life.socialClass }} of the {{ life.race }} folk</h2>
        <p>A lesson at the guild costs 20 gold and sharpens intelligence. You can take one lesson each year.</p>
        <button type="button" class="btn btn-primary" :disabled="!life.alive || life.usedThisYear.includes('study')" @click="act('study')">
          Study
        </button>
      </section>
    </main>
    <BottomDock />
  </div>
</template>

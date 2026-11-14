<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import BottomDock from '../components/BottomDock.vue'
import { useGame } from '../composables/useGame'
import { shows } from '../core/engine'
import { CLASSES, type SocialClass } from '../core/types'

const router = useRouter()
const { life, config, purchase } = useGame()
watch(life, (value) => {
  if (!value) router.replace('/')
  else if (!shows(config.value, 'assets', value.age)) router.replace('/play')
}, { immediate: true })

const rank = CLASSES

function owned(tier: SocialClass): boolean {
  if (!life.value?.house) return false
  return rank.indexOf(life.value.house) >= rank.indexOf(tier)
}
</script>

<template>
  <div v-if="life" class="play">
    <header class="page-head">
      <RouterLink class="back" to="/play">Close</RouterLink>
      <h1>Assets</h1>
      <span />
    </header>
    <main class="stage">
      <section class="card">
        <h2>Finances</h2>
        <p>Gold: <strong>{{ life.gold.toLocaleString('en-US') }} g</strong></p>
        <p class="hint">Current house: {{ life.house ?? 'None' }}</p>
      </section>
      <h2 class="group-label">Housing</h2>
      <button
        v-for="tier in CLASSES"
        :key="tier"
        type="button"
        class="house-row"
        :disabled="owned(tier) || life.gold < config.housing[tier] || !life.alive"
        @click="purchase(tier)"
      >
        <span>
          <strong>{{ tier }} house</strong>
          <small style="display:block">{{ config.housing[tier].toLocaleString('en-US') }} g</small>
        </span>
        <span>{{ owned(tier) ? 'Owned' : 'Buy' }}</span>
      </button>
    </main>
    <BottomDock />
  </div>
</template>

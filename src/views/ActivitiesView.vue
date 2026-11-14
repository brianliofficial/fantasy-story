<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import BottomDock from '../components/BottomDock.vue'
import { useGame } from '../composables/useGame'
import { shows } from '../core/engine'
import type { YearActivity } from '../core/types'

const router = useRouter()
const { life, config, act } = useGame()
watch(life, (value) => {
  if (!value) router.replace('/')
  else if (!shows(config.value, 'activities', value.age)) router.replace('/play')
}, { immediate: true })

const actions: { id: YearActivity; title: string; detail: string }[] = [
  { id: 'odd-job', title: 'Odd job', detail: 'Earn 25 gold and lose a little strength' },
  { id: 'seek-friend', title: 'Look for a friend', detail: 'Someone on the road may join you' },
  { id: 'rest', title: 'Rest', detail: 'Recover constitution' },
]
</script>

<template>
  <div v-if="life" class="play">
    <header class="page-head">
      <RouterLink class="back" to="/play">Close</RouterLink>
      <h1>Activities</h1>
      <span />
    </header>
    <main class="stage">
      <button
        v-for="action in actions"
        :key="action.id"
        type="button"
        class="choice"
        :disabled="!life.alive || life.usedThisYear.includes(action.id)"
        @click="act(action.id)"
      >
        <span><strong>{{ action.title }}</strong><br><small>{{ action.detail }}</small></span>
      </button>
      <p v-if="life.log.length" class="hint">{{ life.log[life.log.length - 1]?.text }}</p>
    </main>
    <BottomDock />
  </div>
</template>

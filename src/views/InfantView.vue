<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import BottomDock from '../components/BottomDock.vue'
import DeathModal from '../components/DeathModal.vue'
import EventModal from '../components/EventModal.vue'
import OutcomeModal from '../components/OutcomeModal.vue'
import { useGame } from '../composables/useGame'
import { shows } from '../core/engine'
import type { InfantAction } from '../core/types'

const router = useRouter()
const { life, config, infant, choose, dismiss, forgetLife } = useGame()

watch(life, (value) => {
  if (!value) router.replace('/')
  else if (!shows(config.value, 'infant', value.age) || value.pendingOutcome || value.pendingEvent) router.replace('/play')
}, { immediate: true })

const actions: { id: InfantAction; title: string }[] = [
  { id: 'babble', title: 'Babble' },
  { id: 'cry', title: 'Cry' },
  { id: 'play', title: 'Play' },
  { id: 'story', title: 'Ask for a story' },
]

function closeDeath() {
  forgetLife()
  router.push('/')
}
</script>

<template>
  <div v-if="life" class="play">
    <header class="page-head">
      <RouterLink class="back" to="/play">Close</RouterLink>
      <h1>Infant</h1>
      <span />
    </header>
    <main class="stage">
      <p class="hint">Ages 0 to 5. Each choice rolls 1–100 and adds the matching score. Over 50 succeeds.</p>
      <button
        v-for="action in actions"
        :key="action.id"
        type="button"
        class="choice"
        :disabled="!life.alive || life.pendingEvent !== null || life.pendingOutcome !== null"
        @click="infant(action.id)"
      >
        <strong>{{ action.title }}</strong>
      </button>
    </main>
    <BottomDock />
    <EventModal v-if="life.pendingEvent" :life="life" :event="life.pendingEvent" @choose="choose" />
    <OutcomeModal v-else-if="life.pendingOutcome" :outcome="life.pendingOutcome" @close="dismiss" />
    <DeathModal v-else-if="!life.alive" :life="life" @home="closeDeath" />
  </div>
</template>

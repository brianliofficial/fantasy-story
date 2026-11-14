<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import BottomDock from '../components/BottomDock.vue'
import DeathModal from '../components/DeathModal.vue'
import EventModal from '../components/EventModal.vue'
import LifeLog from '../components/LifeLog.vue'
import OfferModal from '../components/OfferModal.vue'
import OutcomeModal from '../components/OutcomeModal.vue'
import StatList from '../components/StatList.vue'
import { useGame } from '../composables/useGame'

const router = useRouter()
const { life, choose, dismiss, answer, forgetLife } = useGame()

watch(life, (value) => {
  if (!value) router.replace('/')
}, { immediate: true })

const initial = computed(() => life.value?.name.slice(0, 1).toUpperCase() ?? '')

function closeDeath() {
  forgetLife()
  router.push('/')
}
</script>

<template>
  <div v-if="life" class="play">
    <header class="topbar">
      <div class="identity">
        <div class="avatar" aria-hidden="true">{{ initial }}</div>
        <div>
          <h1>{{ life.name }}</h1>
          <p>{{ life.gender === 'female' ? 'Female' : 'Male' }} · {{ life.race }} · {{ life.socialClass }}</p>
        </div>
      </div>
      <p class="gold">{{ life.gold.toLocaleString('en-US') }} g<span>Gold</span></p>
    </header>
    <section class="log-pane" aria-label="Life log">
      <LifeLog :entries="life.log" />
    </section>
    <main class="stage">
      <p class="hint">Age {{ life.age }}</p>
      <StatList :life="life" />
    </main>
    <BottomDock />
    <EventModal v-if="life.pendingEvent" :life="life" :event="life.pendingEvent" @choose="choose" />
    <OfferModal v-else-if="life.pendingOffer" :offer="life.pendingOffer" @answer="answer" />
    <OutcomeModal v-else-if="life.pendingOutcome" :outcome="life.pendingOutcome" @close="dismiss" />
    <DeathModal v-else-if="!life.alive" :life="life" @home="closeDeath" />
  </div>
</template>

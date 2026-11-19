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
import { ageTagFor } from '../core/age'
import { canAge } from '../core/engine'
import { useGame } from '../composables/useGame'

const router = useRouter()
const { life, choose, dismiss, answer, forgetLife, age } = useGame()

watch(life, (value) => {
  if (!value) router.replace('/')
}, { immediate: true })

const initial = computed(() => life.value?.name.slice(0, 1).toUpperCase() ?? '')
const ageTag = computed(() => (life.value ? ageTagFor(life.value.age) : null))

function closeDeath() {
  forgetLife()
  router.push('/')
}
</script>

<template>
  <div v-if="life" class="play play-log">
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
    <div class="age-seam">
      <button type="button" class="age-orb" :disabled="!canAge(life)" @click="age"><span>Age<br>Up</span></button>
    </div>
    <main class="stage">
      <p class="hint">Age {{ life.age }}<template v-if="ageTag"> · {{ ageTag.tag }}</template></p>
      <StatList :life="life" />
    </main>
    <BottomDock />
    <EventModal v-if="life.pendingEvent" :life="life" :event="life.pendingEvent" @choose="choose" />
    <OfferModal v-else-if="life.pendingOffer" :offer="life.pendingOffer" @answer="answer" />
    <OutcomeModal v-else-if="life.pendingOutcome" :outcome="life.pendingOutcome" @close="dismiss" />
    <DeathModal v-else-if="!life.alive" :life="life" @home="closeDeath" />
  </div>
</template>

<style lang="scss" scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(90deg, rgba(122, 93, 41, 0.28), rgba(201, 162, 82, 0.22), rgba(122, 93, 41, 0.28));
  color: var(--ink);
  border-bottom: 1px solid var(--line);
}

.identity {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;

  h1, p { margin: 0; }
  h1 { font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  p { color: var(--muted); font-size: 0.95rem; }
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #241b14;
  color: #e8c77b;
  border: 1px solid var(--gold);
  font-weight: 800;
  flex: none;
}

.gold {
  color: #e8c77b;
  font-weight: 700;
  text-align: right;
  font-family: Cinzel, Georgia, serif;

  span { display: block; color: var(--muted); font-size: 0.75rem; font-weight: 600; }
}

.play-log {
  padding-bottom: calc(65px + var(--safe-bottom));

  .stage { flex: none; }
}

.log-pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #15100c;
  border-bottom: 1px solid var(--line);
}

.play-log :deep(.log-scroll) { padding-bottom: 58px; }

.age-seam {
  position: relative;
  z-index: 3;
  height: 0;
  display: flex;
  justify-content: center;
}

.age-orb {
  width: 86px;
  height: 86px;
  margin-top: -43px;
  padding: 0;
  display: grid;
  place-items: center;
  border: 4px solid #c9a252;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 40%, #2f7d4e, #18472c 72%);
  color: #f2e6d0;
  font-family: Cinzel, Georgia, serif;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.05;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.16);

  span { display: block; text-align: center; }
}
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BottomDock from '../components/BottomDock.vue'
import DeathModal from '../components/DeathModal.vue'
import { meetStrangers, shows } from '../core/engine'
import type { ChildhoodAction, Stranger } from '../core/types'
import { useGame } from '../composables/useGame'

const router = useRouter()
const { life, config, childhood, showHousehold, addFriend, forgetLife } = useGame()
const strangers = ref<Stranger[]>([])

watch(life, (value) => {
  if (!value) {
    router.replace('/')
    return
  }
  if (value.duty === 'choosing' && !value.pendingEvent && !value.pendingOutcome && !value.pendingOffer) {
    showHousehold()
    return
  }
  if (!shows(config.value, 'childhood', value.age) || shows(config.value, 'infant', value.age)) router.replace('/play')
  else if (value.pendingOutcome || value.pendingEvent || value.pendingOffer) router.replace('/play')
}, { immediate: true })

const busy = computed(() => life.value === null || !life.value.alive)

function meet() {
  if (!life.value || busy.value) return
  strangers.value = meetStrangers(life.value, config.value)
}

function chooseFriend(person: Stranger) {
  addFriend(person)
  strangers.value = []
}

function play(action: ChildhoodAction) {
  strangers.value = []
  childhood(action)
}

function closeDeath() {
  forgetLife()
  router.push('/')
}
</script>

<template>
  <div v-if="life" class="play">
    <header class="page-head">
      <RouterLink class="back" to="/play">Close</RouterLink>
      <h1>Childhood</h1>
      <span />
    </header>
    <main class="stage">
      <p class="hint">Ages 6 to 12.</p>
      <button type="button" class="choice" :disabled="busy" @click="meet">
        <strong>Try to make a new friend</strong>
      </button>
      <button
        v-for="person in strangers"
        :key="person.id"
        type="button"
        class="choice"
        :disabled="busy"
        @click="chooseFriend(person)"
      >
        <span>
          <strong>{{ person.name }}</strong>
          <small>{{ person.gender }} {{ person.race.toLowerCase() }}, age {{ person.age }}</small>
        </span>
      </button>
      <button type="button" class="choice" :disabled="busy" @click="play('mischief')">
        <strong>Cause mischief</strong>
      </button>
      <button type="button" class="choice" :disabled="busy" @click="play('wilderness')">
        <strong>Play out in the wilderness</strong>
      </button>
    </main>
    <BottomDock />
    <DeathModal v-if="!life.alive" :life="life" @home="closeDeath" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BottomDock from '../components/BottomDock.vue'
import DeathModal from '../components/DeathModal.vue'
import { laborChoices, MERCHANT_SCHOOLS, NOBLE_SUBJECTS } from '../core/childhood'
import { meetStrangers, shows } from '../core/engine'
import type { ChildhoodAction, Stranger } from '../core/types'
import { useGame } from '../composables/useGame'

const router = useRouter()
const { life, config, childhood, household, work, teacher, runaway, lessons, addFriend, forgetLife } = useGame()
const strangers = ref<Stranger[]>([])

watch(life, (value) => {
  if (!value) router.replace('/')
  else if (!shows(config.value, 'childhood', value.age) || shows(config.value, 'infant', value.age)) router.replace('/play')
  else if (value.pendingOutcome || value.pendingEvent || value.pendingOffer) router.replace('/play')
}, { immediate: true })

const busy = computed(() => life.value === null || !life.value.alive)
const jobs = computed(() => (life.value ? laborChoices(life.value) : []))
const trades = computed(() => life.value?.socialClass === 'Peasant' || life.value?.socialClass === 'Journeyman')

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
      <button v-if="life.duty === 'ready'" type="button" class="choice" :disabled="busy" @click="household()">
        <strong>Childhood milestone</strong>
      </button>
      <template v-else-if="life.duty === 'choosing'">
        <p class="group-label">You are expected to take on responsibility of your household</p>
        <template v-if="trades">
          <button v-for="option in jobs" :key="option.id" type="button" class="choice" :disabled="busy" @click="work(option.id)">
            <strong>{{ option.text }}</strong>
          </button>
          <button type="button" class="choice" :disabled="busy" @click="teacher()">
            <strong>Seek a teacher who will teach you for free</strong>
          </button>
          <button type="button" class="choice" :disabled="busy" @click="runaway()">
            <strong>Run away from this ragged lifestyle</strong>
          </button>
        </template>
        <template v-else-if="life.socialClass === 'Merchant'">
          <button
            v-for="course in MERCHANT_SCHOOLS"
            :key="course.subject"
            type="button"
            class="choice"
            :disabled="busy"
            @click="lessons(course.subject)"
          >
            <strong>{{ course.subject }}</strong>
            <span>{{ course.price }} gold</span>
          </button>
        </template>
        <template v-else>
          <button
            v-for="subject in NOBLE_SUBJECTS"
            :key="subject"
            type="button"
            class="choice"
            :disabled="busy"
            @click="lessons(subject)"
          >
            <strong>{{ subject }}</strong>
            <span>Free</span>
          </button>
        </template>
      </template>
    </main>
    <BottomDock />
    <DeathModal v-if="!life.alive" :life="life" @home="closeDeath" />
  </div>
</template>

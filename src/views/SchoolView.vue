<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BottomDock from '../components/BottomDock.vue'
import { subjectsFor } from '../core/childhood'
import { shows } from '../core/engine'
import { useGame } from '../composables/useGame'

const router = useRouter()
const { life, config, changeStudy, quitLessons, study } = useGame()
const changing = ref(false)

watch(life, (value) => {
  if (!value) router.replace('/')
  else if (!value.school || !shows(config.value, 'school', value.age)) router.replace('/play')
  else if (value.pendingOutcome || value.pendingEvent || value.pendingOffer) router.replace('/play')
}, { immediate: true })

const subjects = computed(() => (life.value ? subjectsFor(life.value.socialClass) : []))
const busy = computed(() => life.value === null || !life.value.alive)
</script>

<template>
  <div v-if="life && life.school" class="play">
    <header class="page-head">
      <RouterLink class="back" to="/play">Close</RouterLink>
      <h1>School</h1>
      <span />
    </header>
    <main class="stage">
      <article class="card">
        <h2>{{ life.school }}</h2>
        <p>You are studying {{ life.school }}.</p>
      </article>
      <button type="button" class="choice" :disabled="busy" @click="changing = !changing">
        <strong>Change subject</strong>
      </button>
      <button
        v-for="subject in changing ? subjects : []"
        :key="subject"
        type="button"
        class="choice"
        :disabled="busy || subject === life.school"
        @click="changeStudy(subject)"
      >
        <strong>{{ subject }}</strong>
      </button>
      <button type="button" class="choice" :disabled="busy" @click="quitLessons()">
        <strong>Quit</strong>
      </button>
      <button type="button" class="choice" :disabled="busy" @click="study()">
        <strong>Study hard</strong>
      </button>
    </main>
    <BottomDock />
  </div>
</template>

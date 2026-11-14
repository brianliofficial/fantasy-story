<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BottomDock from '../components/BottomDock.vue'
import { tradesFor } from '../core/childhood'
import { shows } from '../core/engine'
import { useGame } from '../composables/useGame'

const router = useRouter()
const { life, config, findJob, askGold } = useGame()
const listing = ref(false)

watch(life, (value) => {
  if (!value) router.replace('/')
  else if (!shows(config.value, 'job', value.age)) router.replace('/play')
  else if (value.socialClass === 'Merchant' && !value.merchantJobs) router.replace('/play')
  else if (value.pendingOutcome || value.pendingEvent || value.pendingOffer) router.replace('/play')
}, { immediate: true })

const jobs = computed(() => (life.value ? tradesFor(life.value.socialClass) : []))
const busy = computed(() => life.value === null || !life.value.alive)
</script>

<template>
  <div v-if="life && life.age > 5" class="play">
    <header class="page-head">
      <RouterLink class="back" to="/play">Close</RouterLink>
      <h1>Job</h1>
      <span />
    </header>
    <main class="stage">
      <article v-if="life.occupation" class="card">
        <h2>{{ life.occupation.title }}</h2>
        <p>{{ life.occupation.salary }} gold per year</p>
      </article>
      <p v-else class="hint">You have no job yet.</p>
      <button type="button" class="choice" :disabled="busy" @click="listing = !listing">
        <strong>Find a new job</strong>
      </button>
      <button
        v-for="job in listing ? jobs : []"
        :key="job.child"
        type="button"
        class="choice"
        :disabled="busy"
        @click="findJob(job.child)"
      >
        <strong>{{ job.child }}</strong>
        <span>{{ job.salary }} gold per year</span>
      </button>
      <button type="button" class="choice" :disabled="busy" @click="askGold()">
        <strong>Ask for more gold</strong>
      </button>
    </main>
    <BottomDock />
  </div>
</template>

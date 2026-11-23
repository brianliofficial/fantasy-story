<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BottomDock from '../components/BottomDock.vue'
import { tradesFor, VAGRANT_SALARY, VAGRANT_TITLE } from '../core/childhood'
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
const job = computed(() => life.value?.occupation ?? { title: VAGRANT_TITLE, salary: VAGRANT_SALARY })
const busy = computed(() => life.value === null || !life.value.alive)

function chooseJob(title: string) {
  listing.value = false
  findJob(title)
}
</script>

<template>
  <div v-if="life && life.age > 5" class="play">
    <header class="page-head">
      <RouterLink class="back" to="/play">Close</RouterLink>
      <h1>Job</h1>
      <span />
    </header>
    <main class="stage">
      <article class="card">
        <h2>{{ job.title }}</h2>
        <p>{{ job.salary }} gold per year</p>
      </article>
      <button type="button" class="choice" :disabled="busy" @click="listing = true">
        <strong>Find a new job</strong>
      </button>
      <button type="button" class="choice" :disabled="busy" @click="askGold()">
        <strong>Ask for more gold</strong>
      </button>
    </main>
    <BottomDock />
    <Teleport to="body">
      <div v-if="listing" class="modal-backdrop">
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="job-list-title">
          <h2 id="job-list-title">Find a new job</h2>
          <button
            v-for="trade in jobs"
            :key="trade.child"
            type="button"
            class="choice"
            :disabled="busy"
            @click="chooseJob(trade.child)"
          >
            <strong>{{ trade.child }}</strong>
            <span>{{ trade.salary }} gold per year</span>
          </button>
          <button type="button" class="btn btn-block" @click="listing = false">Close</button>
        </section>
      </div>
    </Teleport>
  </div>
</template>

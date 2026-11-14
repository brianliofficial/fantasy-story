<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGame } from '../composables/useGame'
import type { PersonActivity } from '../core/types'

const route = useRoute()
const router = useRouter()
const { life, visit } = useGame()

watch(life, (value) => {
  if (!value) router.replace('/')
}, { immediate: true })

const person = computed(() => life.value?.people.find((item) => item.id === route.params.id))

const actions: { id: PersonActivity; title: string; detail: string }[] = [
  { id: 'ask', title: 'Ask for money', detail: 'Ask them for coin' },
  { id: 'compliment', title: 'Compliment', detail: 'Pay them a compliment' },
  { id: 'conversation', title: 'Conversation', detail: 'Have a conversation' },
  { id: 'gift', title: 'Gift', detail: 'Give a gift worth 30 gold' },
]

function run(activity: PersonActivity) {
  if (!person.value) return
  visit(person.value.id, activity)
}
</script>

<template>
  <div v-if="life && person" class="page">
    <header class="page-head">
      <RouterLink class="back" to="/relationships">Back</RouterLink>
      <h1>{{ person.label }}</h1>
      <span />
    </header>
    <main class="stack">
      <section class="card">
        <h2>{{ person.name }}</h2>
        <p class="hint">Age {{ person.age }} · {{ person.alive ? 'Living' : 'Gone' }}</p>
        <div v-if="person.alive" class="stat">
          <span>Bond</span>
          <div class="track"><div class="fill" :style="{ width: `${person.relationship}%`, background: '#3caf5a' }" /></div>
          <span>{{ person.relationship }}</span>
        </div>
        <p v-else>Died {{ person.diedYearsAgo ?? 0 }} years ago.</p>
      </section>
      <h2 class="group-label">Activities</h2>
      <button
        v-for="action in actions"
        :key="action.id"
        type="button"
        class="choice"
        :disabled="!person.alive || !life.alive"
        @click="run(action.id)"
      >
        <span><strong>{{ action.title }}</strong><br><small>{{ action.detail }}</small></span>
      </button>
      <p v-if="life.log.length" class="card">{{ life.log[life.log.length - 1]?.text }}</p>
    </main>
  </div>
</template>

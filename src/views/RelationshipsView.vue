<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import BottomDock from '../components/BottomDock.vue'
import { useGame } from '../composables/useGame'
import type { Person, RelationRole } from '../core/types'

const router = useRouter()
const { life } = useGame()
watch(life, (value) => {
  if (!value) router.replace('/')
}, { immediate: true })

const groups: { key: string; title: string; match: (person: Person) => boolean }[] = [
  { key: 'parents', title: 'Parents', match: (person) => person.alive && person.role === 'parent' },
  { key: 'siblings', title: 'Siblings', match: (person) => person.alive && person.role === 'sibling' },
  { key: 'friends', title: 'Friends', match: (person) => person.alive && person.role === 'friend' },
  { key: 'late', title: 'Late relationships', match: (person) => !person.alive },
]

const sections = computed(() => groups
  .map((group) => ({ ...group, people: life.value?.people.filter(group.match) ?? [] }))
  .filter((group) => group.people.length > 0))

function roleLabel(role: RelationRole): string {
  if (role === 'parent') return 'Parent'
  if (role === 'sibling') return 'Sibling'
  return 'Friend'
}
</script>

<template>
  <div v-if="life" class="play">
    <header class="page-head">
      <RouterLink class="back" to="/play">Close</RouterLink>
      <h1>Relationships</h1>
      <span />
    </header>
    <main class="stage">
      <p v-if="sections.length === 0" class="hint">No one else is in this tale yet.</p>
      <section v-for="section in sections" :key="section.key">
        <h2 class="group-label">{{ section.title }}</h2>
        <RouterLink v-for="person in section.people" :key="person.id" class="person-row" :to="`/relationships/${person.id}`">
          <span>
            <strong>{{ person.name }}</strong>
            <small v-if="person.alive"> ({{ person.label }})</small>
            <small v-else> · died {{ person.diedYearsAgo ?? 0 }} years ago</small>
            <span v-if="person.alive" class="track relation-track" style="display:block;margin-top:6px">
              <span class="fill" :style="{ width: `${person.relationship}%`, background: '#3caf5a' }" />
            </span>
          </span>
          <span aria-hidden="true">›</span>
          <span class="sr-only">{{ roleLabel(person.role) }}, relationship {{ person.relationship }}</span>
        </RouterLink>
      </section>
    </main>
    <BottomDock />
  </div>
</template>

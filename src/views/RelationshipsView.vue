<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import BottomDock from '../components/BottomDock.vue'
import { useGame } from '../composables/useGame'
import type { Person, RelationRole } from '../core/types'
import { personName } from '../core/titles'

const router = useRouter()
const { life } = useGame()
watch(life, (value) => {
  if (!value) router.replace('/')
}, { immediate: true })

const groups: { key: string; title: string; match: (person: Person) => boolean }[] = [
  { key: 'parents', title: 'Parents', match: (person) => person.alive && person.role === 'parent' },
  { key: 'siblings', title: 'Siblings', match: (person) => person.alive && person.role === 'sibling' },
  { key: 'friends', title: 'Friends', match: (person) => person.alive && person.role === 'friend' },
  { key: 'teachers', title: 'Teachers', match: (person) => person.alive && person.role === 'teacher' },
  { key: 'late', title: 'Late relationships', match: (person) => !person.alive },
]

const sections = computed(() => groups
  .map((group) => ({ ...group, people: life.value?.people.filter(group.match) ?? [] }))
  .filter((group) => group.people.length > 0))

function roleLabel(role: RelationRole): string {
  if (role === 'parent') return 'Parent'
  if (role === 'sibling') return 'Sibling'
  if (role === 'teacher') return 'Teacher'
  return 'Friend'
}

function meterWidth(score: number): string {
  return `${Math.max(0, Math.min(100, score))}%`
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
      <section class="card" v-for="section in sections" :key="section.key">
        <h2 class="group-label">{{ section.title }}</h2>
        <RouterLink v-for="person in section.people" :key="person.id" class="person-row" :to="`/relationships/${person.id}`">
          <span class="who">
            <strong>{{ personName(person) }}</strong>
            <small v-if="person.alive"> ({{ person.label }})</small>
            <small v-else> · died {{ person.diedYearsAgo ?? 0 }} years ago</small>
          </span>
          <span class="meters">
            <span class="meter">
              <span class="track" role="meter" :aria-valuenow="person.relationship" aria-valuemin="0" aria-valuemax="100" aria-label="Bond">
                <span class="fill" :style="{ width: meterWidth(person.relationship), background: '#3caf5a' }" />
              </span>
              <span class="meter-score">{{ person.relationship }}</span>
            </span>
            <span class="meter">
              <span class="track" role="meter" :aria-valuenow="person.constitution ?? 0" aria-valuemin="0" aria-valuemax="100" aria-label="Constitution">
                <span class="fill" :style="{ width: meterWidth(person.constitution ?? 0), background: '#c4453c' }" />
              </span>
              <span class="meter-score">{{ person.constitution ?? 0 }}</span>
            </span>
          </span>
          <span aria-hidden="true">›</span>
          <span class="sr-only">{{ roleLabel(person.role) }}, bond {{ person.relationship }}, constitution {{ person.constitution ?? 0 }}</span>
        </RouterLink>
      </section>
    </main>
    <BottomDock />
  </div>
</template>

<style lang="scss" scoped>
.who { flex: 1; min-width: 0; }

.meters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
}

.meter {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 84px;
}

.meter .track { flex: 1; min-width: 0; }

.meter-score {
  width: 1.6rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 0.85rem;
}
.stage{
  max-height:calc(100vh - 140px);
  overflow-y: auto;
  section{
    gap: 10px;
    display: flex;
    flex-direction: column;
  }
  .meters{
    display:flex;
    flex-direction: column;
  }
}
</style>

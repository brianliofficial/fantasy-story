<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { canAge, shows } from '../core/engine'
import { useGame } from '../composables/useGame'

const route = useRoute()
const router = useRouter()
const { life, config, age } = useGame()
const ready = computed(() => life.value !== null && canAge(life.value))
const infant = computed(() => life.value !== null && shows(config.value, 'infant', life.value.age))
const child = computed(() => life.value !== null && !infant.value && shows(config.value, 'childhood', life.value.age))
const menus = computed(() => {
  const current = life.value
  if (!current) return { job: false, school: false, crime: false, romance: false }
  const ageNow = current.age
  const jobClass = current.socialClass !== 'Merchant' || current.merchantJobs
  return {
    job: jobClass && shows(config.value, 'job', ageNow),
    school: current.school !== null && shows(config.value, 'school', ageNow),
    crime: current.crime && shows(config.value, 'crime', ageNow),
    romance: shows(config.value, 'romance', ageNow),
  }
})
const extra = computed(() => menus.value.job || menus.value.school || menus.value.crime || menus.value.romance)
const adult = computed(() => {
  const current = life.value
  if (!current) return { guild: false, assets: false, activities: false }
  return {
    guild: shows(config.value, 'guild', current.age),
    assets: shows(config.value, 'assets', current.age),
    activities: shows(config.value, 'activities', current.age),
  }
})

function ageUp() {
  if (!ready.value) return
  age()
  if (route.name !== 'play') router.push('/play')
}
</script>

<template>
  <nav
    class="dock"
    :class="{ 'dock-infant': infant || (child && !extra), 'dock-menus': !infant && extra }"
    aria-label="Life actions"
  >
    <template v-if="infant">
      <RouterLink to="/relationships"><span class="mark" aria-hidden="true">♥</span>Relation</RouterLink>
      <button type="button" class="age-button" :disabled="!ready" @click="ageUp">Age Up</button>
      <RouterLink to="/infant"><span class="mark" aria-hidden="true">☺</span>Infant</RouterLink>
    </template>
    <template v-else-if="child">
      <RouterLink to="/relationships"><span class="mark" aria-hidden="true">♥</span>Relation</RouterLink>
      <button type="button" class="age-button" :disabled="!ready" @click="ageUp">Age Up</button>
      <RouterLink to="/childhood"><span class="mark" aria-hidden="true">☺</span>Childhood</RouterLink>
      <RouterLink v-if="menus.job" to="/job"><span class="mark" aria-hidden="true">⚒</span>Job</RouterLink>
      <RouterLink v-if="menus.school" to="/school"><span class="mark" aria-hidden="true">✎</span>School</RouterLink>
      <RouterLink v-if="menus.crime" to="/crime"><span class="mark" aria-hidden="true">†</span>Crime</RouterLink>
      <RouterLink v-if="menus.romance" to="/romance"><span class="mark" aria-hidden="true">♡</span>Romance</RouterLink>
    </template>
    <template v-else>
      <RouterLink v-if="adult.guild" to="/guild"><span class="mark" aria-hidden="true">⚔</span>Guild</RouterLink>
      <RouterLink v-if="adult.assets" to="/assets"><span class="mark" aria-hidden="true">⌂</span>Assets</RouterLink>
      <button type="button" class="age-button" :disabled="!ready" @click="ageUp">Age Up</button>
      <RouterLink to="/relationships"><span class="mark" aria-hidden="true">♥</span>Relations</RouterLink>
      <RouterLink v-if="adult.activities" to="/activities"><span class="mark" aria-hidden="true">✦</span>Activities</RouterLink>
      <RouterLink v-if="menus.job" to="/job"><span class="mark" aria-hidden="true">⚒</span>Job</RouterLink>
      <RouterLink v-if="menus.school" to="/school"><span class="mark" aria-hidden="true">✎</span>School</RouterLink>
      <RouterLink v-if="menus.crime" to="/crime"><span class="mark" aria-hidden="true">†</span>Crime</RouterLink>
      <RouterLink v-if="menus.romance" to="/romance"><span class="mark" aria-hidden="true">♡</span>Romance</RouterLink>
    </template>
  </nav>
</template>

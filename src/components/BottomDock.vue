<script setup lang="ts">
import { computed } from 'vue'
import { shows } from '../core/engine'
import { useGame } from '../composables/useGame'

const { life, config } = useGame()
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
const adult = computed(() => {
  const current = life.value
  if (!current) return { guild: false, assets: false, activities: false }
  return {
    guild: shows(config.value, 'guild', current.age),
    assets: shows(config.value, 'assets', current.age),
    activities: shows(config.value, 'activities', current.age),
  }
})

</script>

<template>
  <nav class="dock" aria-label="Life actions">
    <template v-if="infant">
      <RouterLink to="/relationships"><span class="mark" aria-hidden="true">♥</span>Relation</RouterLink>
      <RouterLink to="/infant"><span class="mark" aria-hidden="true">☺</span>Infant</RouterLink>
    </template>
    <template v-else-if="child">
      <RouterLink to="/relationships"><span class="mark" aria-hidden="true">♥</span>Relation</RouterLink>
      <RouterLink to="/childhood"><span class="mark" aria-hidden="true">☺</span>Childhood</RouterLink>
      <RouterLink v-if="menus.job" to="/job"><span class="mark" aria-hidden="true">⚒</span>Job</RouterLink>
      <RouterLink v-if="menus.school" to="/school"><span class="mark" aria-hidden="true">✎</span>School</RouterLink>
      <RouterLink v-if="menus.crime" to="/crime"><span class="mark" aria-hidden="true">†</span>Crime</RouterLink>
      <RouterLink v-if="menus.romance" to="/romance"><span class="mark" aria-hidden="true">♡</span>Romance</RouterLink>
    </template>
    <template v-else>
      <RouterLink v-if="adult.guild" to="/guild"><span class="mark" aria-hidden="true">⚔</span>Guild</RouterLink>
      <RouterLink v-if="adult.assets" to="/assets"><span class="mark" aria-hidden="true">⌂</span>Assets</RouterLink>
      <RouterLink to="/relationships"><span class="mark" aria-hidden="true">♥</span>Relations</RouterLink>
      <RouterLink v-if="adult.activities" to="/activities"><span class="mark" aria-hidden="true">✦</span>Activities</RouterLink>
      <RouterLink v-if="menus.job" to="/job"><span class="mark" aria-hidden="true">⚒</span>Job</RouterLink>
      <RouterLink v-if="menus.school" to="/school"><span class="mark" aria-hidden="true">✎</span>School</RouterLink>
      <RouterLink v-if="menus.crime" to="/crime"><span class="mark" aria-hidden="true">†</span>Crime</RouterLink>
      <RouterLink v-if="menus.romance" to="/romance"><span class="mark" aria-hidden="true">♡</span>Romance</RouterLink>
    </template>
  </nav>
</template>

<style lang="scss" scoped>
.dock {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: min(100%, 480px);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  align-items: flex-end;
  gap: 4px;
  padding: 8px 8px calc(8px + var(--safe-bottom));
  background: #16100c;
  border-top: 1px solid var(--line);

  a {
    flex: 1 1 68px;
    max-width: 120px;
    min-height: 48px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    text-decoration: none;
    color: var(--muted);
    font-size: 0.68rem;
    font-weight: 700;
    border-radius: 12px;

    &.router-link-active { color: var(--blue); }
  }

  .mark { font-size: 1.1rem; }
}
</style>

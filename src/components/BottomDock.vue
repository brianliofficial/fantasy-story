<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { shows } from '../core/engine'
import { useGame } from '../composables/useGame'

const route = useRoute()
const open = ref(false)
const { life, config } = useGame()
const narrowQuery = window.matchMedia('(max-width: 720px)')

watch(() => route.fullPath, () => {
  open.value = false
})

function onNarrow() {
  if (!narrowQuery.matches) open.value = false
}

onMounted(() => narrowQuery.addEventListener('change', onNarrow))
onUnmounted(() => narrowQuery.removeEventListener('change', onNarrow))
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
  if (!current) return { assets: false, activities: false }
  return {
    assets: shows(config.value, 'assets', current.age),
    activities: shows(config.value, 'activities', current.age),
  }
})

</script>

<template>
  <button v-if="open" type="button" class="dock-backdrop" aria-label="Close menu" @click="open = false" />
  <nav class="dock" :class="{ 'is-open': open }" aria-label="Life actions">
    <button type="button" class="dock-toggle" :aria-expanded="open" aria-controls="life-menu" @click="open = !open">
      <span class="dock-bars" aria-hidden="true"><span></span><span></span><span></span></span>
      {{ open ? 'Close' : 'Menu' }}
    </button>
    <div id="life-menu" class="dock-links">
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
        <RouterLink v-if="adult.assets" to="/assets"><span class="mark" aria-hidden="true">⌂</span>Assets</RouterLink>
        <RouterLink to="/relationships"><span class="mark" aria-hidden="true">♥</span>Relations</RouterLink>
        <RouterLink v-if="adult.activities" to="/activities"><span class="mark" aria-hidden="true">✦</span>Activities</RouterLink>
        <RouterLink v-if="menus.job" to="/job"><span class="mark" aria-hidden="true">⚒</span>Job</RouterLink>
        <RouterLink v-if="menus.school" to="/school"><span class="mark" aria-hidden="true">✎</span>School</RouterLink>
        <RouterLink v-if="menus.crime" to="/crime"><span class="mark" aria-hidden="true">†</span>Crime</RouterLink>
        <RouterLink v-if="menus.romance" to="/romance"><span class="mark" aria-hidden="true">♡</span>Romance</RouterLink>
      </template>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
.dock {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 15;
  transform: translateX(-50%);
  width: min(100%, 480px);
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-items: flex-end;
  gap: 4px;
  padding: 8px 8px calc(8px + var(--safe-bottom));
  background: #16100c;
  border-top: 1px solid var(--line);
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }
}

.dock-links {
  display: contents;
}

.dock-toggle { display: none; }

.dock a {
  flex: 0 0 calc((100% + 8px - 5 * 4px) / 5.5);
  width: calc((100% + 8px - 5 * 4px) / 5.5);
  min-width: 0;
  box-sizing: border-box;
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

.dock-backdrop { display: none; }

@media (max-width: 720px) {
  .dock-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 14;
    border: 0;
    background: rgba(8, 6, 4, 0.45);
  }

  .dock {
    display: block;
    overflow: visible;
    padding: 8px 12px calc(8px + var(--safe-bottom));
  }

  .dock-toggle {
    position: relative;
    z-index: 1;
    display: flex;
    width: 100%;
    min-height: 48px;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border: 0;
    background: transparent;
    color: #e8c77b;
    font-weight: 700;
  }

  .dock-bars {
    width: 18px;
    height: 12px;
    display: inline-flex;
    flex-direction: column;
    justify-content: space-between;

    span {
      display: block;
      height: 2px;
      background: currentColor;
      border-radius: 999px;
    }
  }

  .dock-links {
    display: none;
    position: absolute;
    z-index: 1;
    left: 0;
    right: 0;
    bottom: 100%;
    flex-direction: column;
    gap: 4px;
    max-height: min(70dvh, 420px);
    overflow: auto;
    padding: 8px;
    background: #16100c;
    border-top: 1px solid var(--line);
  }

  .dock.is-open .dock-links { display: flex; }

  .dock-links a {
    flex: none;
    width: 100%;
    flex-direction: row;
    justify-content: flex-start;
    gap: 10px;
    padding: 0 12px;
    font-size: 1rem;
  }
}
</style>

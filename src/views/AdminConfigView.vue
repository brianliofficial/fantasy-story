<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useGame } from '../composables/useGame'
import { cloneData } from '../core/clone'
import { parseNameList } from '../core/names'
import { defaultBirthHome } from '../core/birthHome'
import type { BirthPlace, GameConfig, Race, RaceNames } from '../core/types'
import { CLASSES, RACES } from '../core/types'

const { config, saveConfig, resetConfig } = useGame()
const draft = reactive<GameConfig>(cloneData(config.value))
const saved = ref(false)
const menuOpen = ref(false)
const narrowQuery = window.matchMedia('(max-width: 720px)')

function onNarrow() {
  if (!narrowQuery.matches) menuOpen.value = false
}

onMounted(() => narrowQuery.addEventListener('change', onNarrow))
onUnmounted(() => narrowQuery.removeEventListener('change', onNarrow))
const nameText = reactive<Record<Race, Record<keyof RaceNames, string>>>({
  Elf: { maleForenames: '', femaleForenames: '', surnames: '' },
  Human: { maleForenames: '', femaleForenames: '', surnames: '' },
  Dwarf: { maleForenames: '', femaleForenames: '', surnames: '' },
})

function syncNameText() {
  for (const race of RACES) {
    nameText[race].maleForenames = draft.names[race].maleForenames.join('\n')
    nameText[race].femaleForenames = draft.names[race].femaleForenames.join('\n')
    nameText[race].surnames = draft.names[race].surnames.join('\n')
  }
}

function applyNameText() {
  for (const race of RACES) {
    draft.names[race] = {
      maleForenames: parseNameList(nameText[race].maleForenames),
      femaleForenames: parseNameList(nameText[race].femaleForenames),
      surnames: parseNameList(nameText[race].surnames),
    }
  }
  syncNameText()
}

const birthText = reactive({
  adjectives: '',
  places: {
    Elf: { first: '', second: '' },
    Human: { first: '', second: '' },
    Dwarf: { first: '', second: '' },
  } as Record<Race, Record<keyof BirthPlace, string>>,
})

function syncBirthText() {
  birthText.adjectives = draft.birthHome.adjectives.join('\n')
  for (const race of RACES) {
    birthText.places[race].first = draft.birthHome.places[race].first.join('\n')
    birthText.places[race].second = draft.birthHome.places[race].second.join('\n')
  }
}

function keptWords(text: string, fallback: string[]): string[] {
  const words = parseNameList(text)
  return words.length > 0 ? words : [...fallback]
}

function applyBirthText() {
  const fallback = defaultBirthHome()
  draft.birthHome.adjectives = keptWords(birthText.adjectives, fallback.adjectives)
  for (const race of RACES) {
    draft.birthHome.places[race] = {
      first: keptWords(birthText.places[race].first, fallback.places[race].first),
      second: keptWords(birthText.places[race].second, fallback.places[race].second),
    }
  }
  syncBirthText()
}

if (!draft.birthHome?.adjectives || !draft.birthHome.places?.Elf) draft.birthHome = defaultBirthHome()
syncNameText()
syncBirthText()

function persist() {
  applyNameText()
  applyBirthText()
  saveConfig(cloneData(draft))
  saved.value = true
}

function restore() {
  resetConfig()
  Object.assign(draft, cloneData(config.value))
  syncNameText()
  syncBirthText()
  saved.value = false
}
</script>

<template>
  <div class="page page-wide">
    <button v-if="menuOpen" type="button" class="nav-backdrop" aria-label="Close menu" @click="menuOpen = false" />
    <header class="admin-head">
      <h1>Game config</h1>
      <button type="button" class="nav-toggle" :aria-expanded="menuOpen" aria-controls="config-actions" @click="menuOpen = !menuOpen">
        <span class="nav-bars" aria-hidden="true"><span></span><span></span><span></span></span>
        {{ menuOpen ? 'Close' : 'Menu' }}
      </button>
      <nav id="config-actions" class="admin-links" :class="{ 'is-open': menuOpen }" @click="menuOpen = false">
        <RouterLink to="/admin/events">Events</RouterLink>
        <RouterLink to="/">Game</RouterLink>
      </nav>
    </header>
    <div class="admin-grid">
      <section class="card">
        <h2>Race modifiers</h2>
        <p class="hint">Added to the birth roll. Constitution rolls 50–100. Charisma and intelligence roll 0–100. A result below 0 stays at 0.</p>
        <div v-for="race in RACES" :key="race" class="option-card">
          <h2>{{ race }}</h2>
          <label class="field">Constitution
            <input v-model.number="draft.races[race].constitution" type="number" />
          </label>
          <label class="field">Charisma
            <input v-model.number="draft.races[race].charisma" type="number" />
          </label>
          <label class="field">Intelligence
            <input v-model.number="draft.races[race].intelligence" type="number" />
          </label>
        </div>
      </section>
      <section class="card">
        <h2>Housing and economy</h2>
        <label v-for="tier in CLASSES" :key="tier" class="field">{{ tier }} house price
          <input v-model.number="draft.housing[tier]" type="number" min="0" />
        </label>
      </section>
      <section class="card names-span">
        <h2>Race names</h2>
        <p class="hint">One name per line. Each list belongs to one race. Parents take a forename from that race and share the character's surname. Random character picks a gender, then a forename from that list and a surname from the race. A forename already used by the character is skipped.</p>
        <div v-for="race in RACES" :key="`names-${race}`" class="option-card">
          <h2>{{ race.toUpperCase() }}</h2>
          <label class="field">Male forenames
            <textarea v-model="nameText[race].maleForenames" rows="6" spellcheck="false" />
          </label>
          <label class="field">Female forenames
            <textarea v-model="nameText[race].femaleForenames" rows="6" spellcheck="false" />
          </label>
          <label class="field">Surnames
            <textarea v-model="nameText[race].surnames" rows="4" spellcheck="false" />
          </label>
        </div>
      </section>
      <section class="card">
        <h2>Aging rule</h2>
        <p class="hint">Constitution falls by this amount each year from this age onward.</p>
        <label class="field">Start age
          <input v-model.number="draft.aging.startAge" type="number" min="1" max="120" />
        </label>
        <label class="field">Constitution lost per year
          <input v-model.number="draft.aging.constitutionLossPerYear" type="number" min="0" max="20" />
        </label>
      </section>
      <section class="card names-span">
        <h2>Birth home</h2>
        <p class="hint">One word per line. A place name joins a first word and a second word, such as Silver and glen becoming Silverglen. Two different adjectives describe the home. Leave a list empty to keep its default words.</p>
        <label class="field">Adjectives
          <textarea v-model="birthText.adjectives" rows="6" spellcheck="false" />
        </label>
        <div class="birth-grid">
          <div v-for="race in RACES" :key="`place-${race}`" class="option-card">
            <h2>{{ race.toUpperCase() }}</h2>
            <label class="field">Place, first word
              <textarea v-model="birthText.places[race].first" rows="4" spellcheck="false" />
            </label>
            <label class="field">Place, second word
              <textarea v-model="birthText.places[race].second" rows="4" spellcheck="false" />
            </label>
          </div>
        </div>
      </section>
    </div>
    <div class="stack">
      <p v-if="saved" class="hint">Saved in this browser.</p>
      <div class="choice-row">
        <button type="button" class="btn btn-primary" @click="persist">Save config</button>
        <button type="button" class="btn" @click="restore">Restore defaults</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.admin-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  padding: 16px;
}

.birth-grid {
  display: grid;
  gap: 12px;
}

@media (min-width: 900px) {
  .admin-grid { grid-template-columns: 1fr 1fr; }
  .names-span { grid-column: 1 / -1; }
  .birth-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>

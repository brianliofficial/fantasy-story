<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useGame } from '../composables/useGame'
import { cloneData } from '../core/clone'
import { parseNameList } from '../core/names'
import type { GameConfig, Race, RaceNames } from '../core/types'
import { CLASSES, RACES } from '../core/types'

const { config, saveConfig, resetConfig } = useGame()
const draft = reactive<GameConfig>(cloneData(config.value))
const saved = ref(false)
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

syncNameText()

function persist() {
  applyNameText()
  saveConfig(cloneData(draft))
  saved.value = true
}

function restore() {
  resetConfig()
  Object.assign(draft, cloneData(config.value))
  syncNameText()
  saved.value = false
}
</script>

<template>
  <div class="page page-wide">
    <header class="admin-head">
      <h1>Game config</h1>
      <nav class="admin-links">
        <RouterLink to="/admin/events">Events</RouterLink>
        <RouterLink to="/">Game</RouterLink>
      </nav>
    </header>
    <div class="admin-grid">
      <section class="card">
        <h2>Race modifiers</h2>
        <p class="hint">Added to a starting score of 0. A result below 0 stays at 0.</p>
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
        <p class="hint">One name per line. Each list belongs to one race. Parents take a forename from that race and share the character's surname. The random name button uses both lists. A forename already used by the character is skipped.</p>
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

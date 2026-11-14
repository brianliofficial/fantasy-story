<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGame } from '../composables/useGame'
import { randomIdentity } from '../core/names'
import { CLASSES, GENDERS, RACES, type Gender, type Race, type SocialClass } from '../core/types'

const router = useRouter()
const { life, config, start } = useGame()
const forename = ref('')
const surname = ref('')
const gender = ref<Gender | ''>('')
const race = ref<Race | ''>('')
const socialClass = ref<SocialClass | ''>('')
const error = ref('')

function fillRandom() {
  if (!gender.value || !race.value) {
    error.value = 'Choose a gender and a race first.'
    return
  }
  const next = randomIdentity(config.value.names[race.value], gender.value)
  forename.value = next.forename
  surname.value = next.surname
  error.value = ''
}

function begin() {
  if (!forename.value.trim()) {
    error.value = 'Enter a forename.'
    return
  }
  if (!surname.value.trim()) {
    error.value = 'Enter a surname.'
    return
  }
  if (!gender.value) {
    error.value = 'Choose a gender.'
    return
  }
  if (!race.value || !socialClass.value) {
    error.value = 'Choose a race and a class.'
    return
  }
  start({
    forename: forename.value,
    surname: surname.value,
    gender: gender.value,
    race: race.value,
    socialClass: socialClass.value,
  })
  router.push('/play')
}
</script>

<template>
  <main class="home">
    <form class="home-card" @submit.prevent="begin">
      <p class="badge">FantasyLife</p>
      <h1>One tale</h1>
      <p>Live a fantasy life, year by year. The events and prices can be changed from the ledger.</p>
      <section v-if="life" class="card">
        <p class="hint">{{ life.alive ? 'A life is already in progress.' : 'The last life has ended.' }}</p>
        <strong>{{ life.name }} · age {{ life.age }}</strong>
        <RouterLink v-if="life.alive" class="btn btn-primary btn-block" to="/play" style="text-align:center;text-decoration:none">Continue</RouterLink>
      </section>
      <div class="name-row">
        <label class="field" for="hero-forename">
          Forename
          <input id="hero-forename" v-model="forename" maxlength="24" autocomplete="off" placeholder="Ellanda" />
        </label>
        <label class="field" for="hero-surname">
          Surname
          <input id="hero-surname" v-model="surname" maxlength="24" autocomplete="off" placeholder="Tevin" />
        </label>
      </div>
      <button type="button" class="btn" @click="fillRandom">Random name</button>
      <fieldset class="field" style="border:0;padding:0;margin:0">
        <legend>Gender</legend>
        <div class="choice-row">
          <button v-for="item in GENDERS" :key="item" type="button" class="pill" :class="{ 'is-selected': gender === item }" @click="gender = item">{{ item === 'male' ? 'Male' : 'Female' }}</button>
        </div>
      </fieldset>
      <fieldset class="field" style="border:0;padding:0;margin:0">
        <legend>Race</legend>
        <div class="choice-row">
          <button v-for="item in RACES" :key="item" type="button" class="pill" :class="{ 'is-selected': race === item }" @click="race = item">{{ item.toUpperCase() }}</button>
        </div>
      </fieldset>
      <fieldset class="field" style="border:0;padding:0;margin:0">
        <legend>Class</legend>
        <div class="choice-row">
          <button v-for="item in CLASSES" :key="item" type="button" class="pill" :class="{ 'is-selected': socialClass === item }" @click="socialClass = item">{{ item }}</button>
        </div>
      </fieldset>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <button type="submit" class="btn btn-green btn-block">Create a new character</button>
      <RouterLink to="/admin/events">Open the event ledger</RouterLink>
    </form>
  </main>
</template>

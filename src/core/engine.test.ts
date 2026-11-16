import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { childhoodMilestone, defaultConfig, houseFireEvent, seedEvents, teenageMilestone } from './defaults'
import { ageUp, answerTeacher, applyEffect, askForGold, buyHouse, changeSubject, chooseOption, createLife, enroll, eventMatches, infantAction, openHousehold, quitSchool, runAway, seekTeacher, studyHard, takeJob, workWithParent, yearActivity } from './engine'
import type { GameConfig, GameEventConfig, Life, NewCharacter } from './types'

const zero = () => 0

function scripted(values: number[]) {
  let index = 0
  return () => {
    const value = values[index] ?? 0
    index += 1
    return value
  }
}

function born(patch: Partial<NewCharacter> = {}, config: GameConfig = defaultConfig()) {
  return createLife({
    forename: 'Mira',
    surname: 'Hale',
    gender: 'female',
    race: 'Human',
    socialClass: 'Peasant',
    ...patch,
  }, config, zero)
}

describe('fantasylife engine', () => {
  it('applies the race bonus at birth', () => {
    const elf = createLife({ forename: '  Mira  ', surname: ' Hale ', gender: 'female', race: 'Elf', socialClass: 'Peasant' }, defaultConfig(), zero)
    assert.equal(elf.name, 'Mira Hale')
    assert.equal(elf.constitution, 0)
    assert.equal(elf.charisma, 20)
    assert.equal(elf.intelligence, 0)
    assert.equal(elf.gold, 0)
    assert.equal(elf.people.filter((person) => person.role === 'parent').length, 2)
    const human = born({ gender: 'male', race: 'Human' })
    assert.equal(human.constitution, 5)
    assert.equal(human.charisma, 5)
    assert.equal(human.intelligence, 5)
    const dwarf = born({ race: 'Dwarf' })
    assert.equal(dwarf.constitution, 20)
    assert.equal(dwarf.charisma, 0)
    assert.equal(dwarf.intelligence, 0)
  })

  it('rolls each score from 0 to 100 before the race bonus', () => {
    const human = createLife({
      forename: 'Mira', surname: 'Hale', gender: 'female', race: 'Human', socialClass: 'Peasant',
    }, defaultConfig(), scripted([0.5, 0.5, 0.5]))
    assert.equal(human.constitution, 55)
    assert.equal(human.charisma, 55)
    assert.equal(human.intelligence, 55)
    const elf = createLife({
      forename: 'Mira', surname: 'Hale', gender: 'female', race: 'Elf', socialClass: 'Peasant',
    }, defaultConfig(), scripted([0, 0.5, 0]))
    assert.equal(elf.constitution, 0)
    assert.equal(elf.charisma, 70)
    assert.equal(elf.intelligence, 0)
    const dwarf = createLife({
      forename: 'Mira', surname: 'Hale', gender: 'male', race: 'Dwarf', socialClass: 'Peasant',
    }, defaultConfig(), scripted([0.5, 0, 0.5]))
    assert.equal(dwarf.constitution, 70)
    assert.equal(dwarf.charisma, 0)
    assert.equal(dwarf.intelligence, 50)
  })

  it('introduces the family with the character surname and race forenames', () => {
    const config = defaultConfig()
    config.names.Elf = {
      maleForenames: ['Illdros', 'Ellanda'],
      femaleForenames: ['Ellanda', 'Siama'],
      surnames: ['Tevin'],
    }
    const life = createLife({
      forename: 'Ellanda',
      surname: 'Tevin',
      gender: 'female',
      race: 'Elf',
      socialClass: 'Noble',
    }, config, zero)
    assert.equal(life.log[0]?.text, 'You are a female noble elf named Ellanda Tevin. Your mother is Siama Tevin. Your father is Illdros Tevin.')
    assert.equal(life.people.find((person) => person.label === 'Mother')?.name, 'Siama Tevin')
    assert.equal(life.people.find((person) => person.label === 'Father')?.name, 'Illdros Tevin')
  })

  it('uses a stat check and never drops gold below zero', () => {
    const events = seedEvents()
    const market = events.find((event) => event.id === 'market-day')
    assert.ok(market)
    let life = born()
    life = { ...life, age: 20, charisma: 40, gold: 5, pendingEvent: market }
    life = chooseOption(life, 'haggle')
    assert.equal(life.pendingOutcome?.passed, false)
    assert.equal(life.gold, 0)
    assert.equal(life.charisma, 36)
  })

  it('passes the check when the stat is high enough', () => {
    const market = seedEvents().find((event) => event.id === 'market-day') as GameEventConfig
    let life = born({ socialClass: 'Merchant' })
    life = { ...life, age: 20, charisma: 50, pendingEvent: market }
    life = chooseOption(life, 'haggle')
    assert.equal(life.pendingOutcome?.passed, true)
    assert.equal(life.gold, 35)
  })

  it('only offers events that match age, race, and class', () => {
    const events = seedEvents()
    const life = born({ race: 'Dwarf', socialClass: 'Noble' })
    const aged = { ...life, age: 18 }
    assert.equal(eventMatches(events.find((event) => event.id === 'star-lesson') as GameEventConfig, aged), false)
    assert.equal(eventMatches(events.find((event) => event.id === 'field-work') as GameEventConfig, aged), false)
    assert.equal(eventMatches(events.find((event) => event.id === 'name-day') as GameEventConfig, aged), true)
  })

  it('wears the body down after the aging age and can end the life', () => {
    const config = defaultConfig()
    let life = born({}, config)
    life = { ...life, age: 46, constitution: 2, pendingEvent: null, pendingOutcome: null }
    life = ageUp(life, [], { ...config, aging: { startAge: 46, constitutionLossPerYear: 2 } }, zero)
    assert.equal(life.alive, false)
    assert.equal(life.age, 47)
  })

  it('buys a house only when the purse can cover it', () => {
    const config = defaultConfig()
    let life = born({}, config)
    assert.equal(buyHouse(life, config, 'Peasant').house, null)
    life = { ...life, gold: 500 }
    life = buyHouse(life, config, 'Peasant')
    assert.equal(life.house, 'Peasant')
    assert.equal(life.gold, 0)
    assert.equal(buyHouse({ ...life, gold: 1000 }, config, 'Peasant').house, 'Peasant')
  })

  it('lets a year activity happen once', () => {
    let life = born()
    life = yearActivity(life, 'odd-job', zero)
    const again = yearActivity(life, 'odd-job', zero)
    assert.equal(life.gold, 25)
    assert.equal(again.gold, 25)
  })

  it('lets an infant with no constitution reach the next year', () => {
    let life = createLife({ forename: 'Mira', surname: 'Hale', gender: 'female', race: 'Elf', socialClass: 'Peasant' }, defaultConfig(), zero)
    life = ageUp(life, [], defaultConfig(), zero)
    assert.equal(life.alive, true)
    assert.equal(life.age, 1)
    assert.equal(life.constitution, 0)
  })

  it('resolves infant actions from a roll plus the matching score', () => {
    const base = born()
    const blank = { ...base, constitution: 0, charisma: 0, intelligence: 0, pendingEvent: null, pendingOutcome: null }
    const babble = infantAction(blank, 'babble', () => 0.5)
    assert.equal(babble.pendingOutcome?.roll?.die, 51)
    assert.equal(babble.pendingOutcome?.roll?.total, 51)
    assert.equal(babble.pendingOutcome?.passed, true)
    assert.equal(babble.log.at(-1)?.text, 'You are learning to talk.')
    assert.equal(babble.charisma, 10)

    const quiet = infantAction(blank, 'babble', () => 0.49)
    assert.equal(quiet.pendingOutcome?.passed, false)
    assert.equal(quiet.log.at(-1)?.text, "Nobody can understand what you're saying.")
    assert.equal(quiet.charisma, 0)

    const mother = blank.people.find((person) => person.label === 'Mother')
    const father = blank.people.find((person) => person.label === 'Father')
    assert.ok(mother && father)
    const rolls = [0.5, 0]
    let index = 0
    const soothed = infantAction(blank, 'cry', () => rolls[index++] ?? 0)
    assert.equal(soothed.log.at(-1)?.text, `Your ${mother.name} soothes you.`)
    assert.equal(soothed.constitution, 10)
    assert.equal(soothed.people.find((person) => person.id === mother.id)?.relationship, mother.relationship + 10)
    assert.equal(soothed.people.find((person) => person.id === father.id)?.relationship, father.relationship)

    const alone = infantAction(blank, 'cry', () => 0)
    assert.equal(alone.log.at(-1)?.text, 'You are left alone to cry.')
    assert.equal(alone.people.find((person) => person.id === mother.id)?.relationship, mother.relationship - 20)
    assert.equal(alone.people.find((person) => person.id === father.id)?.relationship, father.relationship - 20)

    const play = infantAction(blank, 'play', () => 0.5)
    assert.equal(play.log.at(-1)?.text, 'You have a great time toddling around.')
    assert.equal(play.constitution, 15)
    const lonely = infantAction({ ...blank, constitution: 40 }, 'play', () => 0)
    assert.equal(lonely.pendingOutcome?.roll?.total, 41)
    assert.equal(lonely.log.at(-1)?.text, 'Nobody want to play with.')
    assert.equal(lonely.charisma, 0)

    const peasant = infantAction({ ...blank, charisma: 40 }, 'story', () => 0.2)
    assert.equal(peasant.pendingOutcome?.roll?.stat, 'charisma')
    assert.equal(peasant.pendingOutcome?.roll?.total, 61)
    assert.equal(peasant.log.at(-1)?.text, 'Though nobody in your family can read, your eyes light up with their spoken story.')
    assert.equal(peasant.intelligence, 15)

    const noble = infantAction({ ...born({ socialClass: 'Noble' }), intelligence: 0 }, 'story', () => 0)
    assert.equal(noble.pendingOutcome?.roll?.stat, 'intelligence')
    assert.equal(noble.log.at(-1)?.text, 'You discover that books are quite boring.')
    assert.equal(noble.intelligence, 0)

    const older = infantAction({ ...blank, age: 6 }, 'babble', () => 0.9)
    assert.equal(older.charisma, 0)
    assert.equal(older.pendingOutcome, null)
  })

  it('rebuilds a burned home when the purse covers the class price', () => {
    const config = defaultConfig()
    const fire = seedEvents().find((event) => event.id === 'Anytime_event_001')
    assert.ok(fire)
    assert.equal(fire.minAge, undefined)
    assert.equal(fire.maxAge, undefined)
    const infant = born({ socialClass: 'Peasant' })
    assert.equal(eventMatches(fire, { ...infant, age: 0 }), true)
    assert.equal(eventMatches(fire, { ...infant, age: 90 }), true)

    let life: Life = { ...infant, gold: 500, charisma: 0, constitution: 40, house: null, pendingEvent: fire }
    life = chooseOption(life, 'rebuild', config)
    assert.equal(life.pendingOutcome?.passed, true)
    assert.equal(life.log.at(-1)?.text, 'Our new home is the envy of your neighbours.')
    assert.equal(life.charisma, 10)
    assert.equal(life.gold, 0)
    assert.equal(life.house, 'Peasant')

    const poor = chooseOption({ ...infant, gold: 499, charisma: 0, constitution: 40, house: 'Peasant', pendingEvent: fire }, 'rebuild', config)
    assert.equal(poor.pendingOutcome?.passed, false)
    assert.equal(poor.constitution, 20)
    assert.equal(poor.gold, 499)
    assert.equal(poor.house, null)
    assert.equal(poor.log.at(-1)?.text, 'You live on the street.')

    const street = chooseOption({ ...infant, gold: 5000, constitution: 40, house: 'Noble', pendingEvent: fire }, 'street', config)
    assert.equal(street.constitution, 20)
    assert.equal(street.house, null)
    assert.equal(street.gold, 5000)
    assert.equal(street.log.at(-1)?.text, 'You live on the street.')

    const noble = chooseOption({ ...born({ socialClass: 'Noble' }), gold: 10000, charisma: 0, pendingEvent: fire }, 'rebuild', config)
    assert.equal(noble.gold, 0)
    assert.equal(noble.house, 'Noble')
    assert.equal(noble.charisma, 10)
  })

  it('gives parents a trade and pays that salary each year', () => {
    const life = born()
    assert.equal(life.people.find((person) => person.label === 'Mother')?.occupation, 'Farmer')
    const paid = ageUp({ ...life, age: 10, occupation: { title: 'Farmer', salary: 12 } }, [], defaultConfig(), zero)
    assert.equal(paid.age, 11)
    assert.equal(paid.gold, 12)
    assert.equal(paid.log.some((entry) => entry.text === 'You earn 12 gold for the year as a Farmer.'), true)
  })

  it('puts a peasant to work with a parent', () => {
    const life = openHousehold({ ...born(), age: 6 })
    assert.equal(life.log.at(-1)?.text, 'You are expected to take on responsibility of your household')
    const mother = life.people.find((person) => person.label === 'Mother')
    assert.ok(mother)
    const working = workWithParent(life, mother.id)
    assert.equal(working.occupation?.title, 'Farmer')
    assert.equal(working.occupation?.salary, 8)
    assert.equal(working.duty, 'done')
    assert.equal(working.log.at(-1)?.text, 'You go to work with your mother as a Farmer.')
  })

  it('accepts a free teacher when the parents agree', () => {
    const offered = seekTeacher({ ...born(), age: 6, duty: 'choosing', charisma: 0 }, defaultConfig(), scripted([0.75, 0, 0, 0, 0, 0, 0]))
    assert.equal(offered.pendingOffer?.subject, 'Reading')
    assert.equal(offered.log.at(-1)?.text, 'An elf scholar named Illdros Tevin agrees to teach you Reading. Do you accept?')
    const school = answerTeacher(offered, true)
    assert.equal(school.school, 'Reading')
    assert.equal(school.duty, 'done')
    assert.equal(school.log.at(-1)?.text, 'Your parents consent')
    assert.equal(school.pendingOffer, null)
  })

  it('puts the child to work when the teacher is refused or the parents will not consent', () => {
    const base = { ...born(), age: 6, duty: 'choosing' as const }
    const missed = seekTeacher({ ...base, charisma: 5 }, defaultConfig(), scripted([0]))
    assert.equal(missed.pendingOutcome?.log, 'Nobody offers to teach you for free.')
    assert.equal(missed.duty, 'choosing')

    const offered = seekTeacher({ ...base, charisma: 0, parentRelationship: 40 }, defaultConfig(), scripted([0.75, 0, 0, 0, 0, 0, 0]))
    const refused = answerTeacher(offered, true)
    assert.equal(refused.log.at(-1)?.text, 'Your parents angrily refuse and put you to work, as is your place.')
    assert.equal(refused.occupation?.title, 'Farmer')
    assert.equal(refused.occupation?.salary, 8)

    const declined = answerTeacher(seekTeacher({ ...base, charisma: 0 }, defaultConfig(), scripted([0.75, 0, 0, 0, 0, 0, 0])), false)
    assert.equal(declined.occupation?.title, 'Farmer')
    assert.equal(declined.school, null)
  })

  it('runs away into a vagrant life or is dragged back to a parent job', () => {
    const base = { ...born(), age: 6, duty: 'choosing' as const, constitution: 40 }
    const fled = runAway(base, scripted([0.45]))
    assert.equal(fled.log.at(-1)?.text, 'You flee your home, but have nowhere to go.')
    assert.equal(fled.occupation?.title, 'Vagrant')
    assert.equal(fled.occupation?.salary, 1)
    assert.equal(fled.constitution, 30)
    assert.equal(fled.crime, true)

    const caught = runAway(base, zero)
    assert.equal(caught.log.at(-1)?.text, 'They catch you and beat you soundly. Back to work it is')
    assert.equal(caught.occupation?.title, 'Farmer')
    assert.equal(caught.occupation?.salary, 8)
    assert.equal(caught.crime, false)
  })

  it('gives a journeyman the parent trade as an apprenticeship', () => {
    const life = { ...born({ socialClass: 'Journeyman' }), age: 6, duty: 'choosing' as const }
    const mother = life.people.find((person) => person.label === 'Mother')
    assert.equal(mother?.occupation, 'Smith')
    const working = workWithParent(life, mother?.id ?? '')
    assert.equal(working.occupation?.title, 'Smith')
    assert.equal(working.occupation?.salary, 36)
  })

  it('sells merchant lessons and gives nobles the same subjects free', () => {
    const poor = enroll({ ...born({ socialClass: 'Merchant' }), age: 6, duty: 'choosing', gold: 39 }, 'Letters')
    assert.equal(poor.pendingOutcome?.passed, false)
    assert.equal(poor.gold, 39)
    assert.equal(poor.school, null)

    const paid = enroll({ ...born({ socialClass: 'Merchant' }), age: 6, duty: 'choosing', gold: 40 }, 'Letters')
    assert.equal(paid.gold, 0)
    assert.equal(paid.school, 'Letters')
    assert.equal(paid.duty, 'done')

    const noble = enroll({ ...born({ socialClass: 'Noble' }), age: 6, duty: 'choosing', gold: 0 }, 'Rhetoric')
    assert.equal(noble.gold, 0)
    assert.equal(noble.school, 'Rhetoric')
  })

  it('lets a worker take a class job and ask for higher pay', () => {
    const hired = takeJob({ ...born(), age: 6 }, 'Shepherd')
    assert.equal(hired.occupation?.title, 'Shepherd')
    assert.equal(hired.occupation?.salary, 4)
    const raised = askForGold({ ...hired, pendingOutcome: null, charisma: 0 }, scripted([0.75]))
    assert.equal(raised.occupation?.salary, 5)
    assert.equal(raised.log.at(-1)?.text, 'Your pay rises to 5 gold per year.')
    const refused = askForGold({ ...hired, pendingOutcome: null, charisma: 0 }, zero)
    assert.equal(refused.occupation?.salary, 4)
    assert.equal(refused.pendingOutcome?.log, 'They refuse to pay you any more.')
    const capped = askForGold({ ...hired, pendingOutcome: null, occupation: { title: 'Farmer', salary: 10 } }, zero)
    assert.equal(capped.pendingOutcome?.log, 'Your wages are already as high as this work allows.')
  })

  it('changes, quits, and studies once school is open', () => {
    const schooling = { ...born(), age: 6, school: 'Reading', intelligence: 0 }
    const changed = changeSubject(schooling, 'Letters')
    assert.equal(changed.school, 'Letters')
    assert.equal(changed.log.at(-1)?.text, 'You change your studies to Letters.')
    const quit = quitSchool({ ...schooling })
    assert.equal(quit.school, null)
    assert.equal(quit.log.at(-1)?.text, 'You quit your lessons.')
    const studied = studyHard(schooling, scripted([0.75]))
    assert.equal(studied.intelligence, 10)
    assert.equal(studied.pendingOutcome?.log, 'You study hard and the lesson stays with you.')
  })

  it('draws anytime and the matching class pool from ages 7 to 13', () => {
    const field: GameEventConfig = {
      id: 'field',
      type: 'Peasant',
      title: 'Field',
      description: 'A field.',
      options: [{ id: 'stay', text: 'Stay', success: { log: 'You stay.', effect: {} } }],
    }
    const glade: GameEventConfig = {
      id: 'glade',
      type: 'Elf',
      title: 'Glade',
      description: 'A glade.',
      options: [{ id: 'walk', text: 'Walk', success: { log: 'You walk.', effect: {} } }],
    }
    const bell: GameEventConfig = {
      id: 'bell',
      type: 'Anytime',
      title: 'Bell',
      description: 'A bell.',
      options: [{ id: 'listen', text: 'Listen', success: { log: 'You listen.', effect: {} } }],
    }
    const child = { ...born(), age: 7 }
    const drawn = ageUp(child, [glade, field], defaultConfig(), zero)
    assert.equal(drawn.age, 8)
    assert.equal(drawn.pendingEvent?.id, 'field')
    const anytime = ageUp(child, [glade, bell], defaultConfig(), zero)
    assert.equal(anytime.pendingEvent?.id, 'bell')
    const quiet = ageUp(child, [glade], defaultConfig(), zero)
    assert.equal(quiet.pendingEvent, null)
    assert.match(quiet.log.at(-1)?.text ?? '', /without a notable tale/)
  })

  it('forces the teenage milestone and resolves study by class', () => {
    const config = defaultConfig()
    const schooling = { ...born(), age: 15, school: 'Reading', tutorRelationship: 81 }
    const milestone = ageUp(schooling, [teenageMilestone()], config, zero)
    assert.equal(milestone.age, 16)
    assert.equal(milestone.pendingEvent?.id, 'Milestone_event_2_teenage')
    assert.equal(milestone.log.at(-1)?.text, 'You reach the end of your basic education.')

    const kept = chooseOption(milestone, 'continue', config, zero)
    assert.equal(kept.school, 'Reading')
    assert.equal(kept.log.at(-1)?.text, 'Your teacher is happy to continue teaching you in Reading.')

    const limited = chooseOption({ ...milestone, tutorRelationship: 80 }, 'continue', config, zero)
    assert.equal(limited.school, null)
    assert.equal(limited.log.at(-1)?.text, 'Your teacher has reached the limit of their generosity.')

    const merchant = ageUp({
      ...born({ socialClass: 'Merchant' }),
      age: 15,
      school: 'Letters',
      parentRelationship: 51,
    }, [teenageMilestone()], config, zero)
    const covered = chooseOption(merchant, 'continue', config, zero)
    assert.equal(covered.merchantJobs, true)
    assert.equal(covered.school, 'Letters')
    assert.equal(covered.log.at(-1)?.text, 'Your parents cover the fees.')
    const refused = chooseOption({ ...merchant, parentRelationship: 50 }, 'continue', config, zero)
    assert.equal(refused.merchantJobs, true)
    assert.equal(refused.log.at(-1)?.text, 'Your parents refuse to cover the fees.')

    const noble = ageUp({
      ...born({ socialClass: 'Noble', gender: 'female' }),
      age: 15,
      school: 'Rhetoric',
    }, [teenageMilestone()], config, zero)
    const betrothed = chooseOption(noble, 'continue', config, zero)
    assert.equal(betrothed.school, null)
    assert.equal(betrothed.betrothed?.job, 'Knight')
    assert.equal(betrothed.betrothed?.forename, 'Aldric')
    assert.equal(betrothed.betrothed?.surname, 'Harwick')
    assert.equal(
      betrothed.log.at(-1)?.text,
      'Your parents have betrothed you to Knight Aldric Harwick and expect you to focus on preparing to marry him, not an education.',
    )
  })

  it('forces the childhood milestone when aging to 6', () => {
    const card = childhoodMilestone()
    const life = ageUp({ ...born(), age: 5 }, [card, {
      id: 'bell',
      type: 'Anytime',
      title: 'Bell',
      description: 'A bell.',
      options: [{ id: 'listen', text: 'Listen', success: { log: 'You listen.', effect: {} } }],
    }], defaultConfig(), zero)
    assert.equal(life.age, 6)
    assert.equal(life.pendingEvent?.id, 'Milestone_event_1_childhood')
    assert.equal(life.pendingEvent?.description, 'You are expected to take on responsibilities of your household.')
  })

  it('waits ten years before house fire can return', () => {
    const fire = houseFireEvent()
    let life = ageUp({ ...born(), age: 19 }, [fire], defaultConfig(), zero)
    assert.equal(life.age, 20)
    assert.equal(life.pendingEvent?.id, 'Anytime_event_001')
    life = ageUp({ ...life, pendingEvent: null }, [fire], defaultConfig(), zero)
    assert.equal(life.age, 21)
    assert.equal(life.pendingEvent, null)
    life = ageUp({ ...life, age: 29, pendingEvent: null }, [fire], defaultConfig(), zero)
    assert.equal(life.age, 30)
    assert.equal(life.pendingEvent?.id, 'Anytime_event_001')
  })

  it('stops an anytime event after five appearances', () => {
    const bell: GameEventConfig = {
      id: 'bell',
      type: 'Anytime',
      title: 'Bell',
      description: 'A bell.',
      options: [{ id: 'listen', text: 'Listen', success: { log: 'You listen.', effect: {} } }],
    }
    let life: Life = { ...born(), age: 20 }
    for (let time = 0; time < 5; time += 1) {
      life = ageUp({ ...life, pendingEvent: null }, [bell], defaultConfig(), zero)
      assert.equal(life.pendingEvent?.id, 'bell')
    }
    life = ageUp({ ...life, pendingEvent: null }, [bell], defaultConfig(), zero)
    assert.equal(life.pendingEvent, null)
    assert.match(life.log.at(-1)?.text ?? '', /without a notable tale/)
  })

  it('keeps a score inside 0 to 100', () => {
    const life = born()
    const next = applyEffect({ ...life, constitution: 98 }, { constitution: 10 })
    assert.equal(next.constitution, 100)
  })
})

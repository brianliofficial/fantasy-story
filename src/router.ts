import { createRouter, createWebHistory } from 'vue-router'
import ActivitiesView from './views/ActivitiesView.vue'
import AdminConfigView from './views/AdminConfigView.vue'
import AdminEventsView from './views/AdminEventsView.vue'
import AssetsView from './views/AssetsView.vue'
import ChildhoodView from './views/ChildhoodView.vue'
import CrimeView from './views/CrimeView.vue'
import GuildView from './views/GuildView.vue'
import HomeView from './views/HomeView.vue'
import InfantView from './views/InfantView.vue'
import JobView from './views/JobView.vue'
import PlayView from './views/PlayView.vue'
import RomanceView from './views/RomanceView.vue'
import SchoolView from './views/SchoolView.vue'
import RelationshipDetailView from './views/RelationshipDetailView.vue'
import RelationshipsView from './views/RelationshipsView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/play', name: 'play', component: PlayView },
    { path: '/relationships', name: 'relationships', component: RelationshipsView },
    { path: '/relationships/:id', name: 'relationship', component: RelationshipDetailView },
    { path: '/assets', name: 'assets', component: AssetsView },
    { path: '/guild', name: 'guild', component: GuildView },
    { path: '/activities', name: 'activities', component: ActivitiesView },
    { path: '/infant', name: 'infant', component: InfantView },
    { path: '/childhood', name: 'childhood', component: ChildhoodView },
    { path: '/job', name: 'job', component: JobView },
    { path: '/school', name: 'school', component: SchoolView },
    { path: '/crime', name: 'crime', component: CrimeView },
    { path: '/romance', name: 'romance', component: RomanceView },
    { path: '/admin/events', name: 'admin-events', component: AdminEventsView },
    { path: '/admin/config', name: 'admin-config', component: AdminConfigView },
  ],
})

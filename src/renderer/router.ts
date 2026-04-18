import { createRouter, createWebHashHistory } from 'vue-router'

import Home from './pages/Home/HomePage.vue'
import Library from './pages/Library/LibraryPage.vue'
import GamePage from './pages/Game/GamePage.vue'
import Categories from './pages/Categories/CategoriesPage.vue'
import Stats from './pages/Stats/StatsPage.vue'
import Settings from './pages/Settings/SettingsPage.vue'

const router = createRouter({
  history: createWebHashHistory(), // Electron 推荐 hash 模式
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', component: Home },
    { path: '/library', component: Library },
    { path: '/game/:id', component: GamePage },
    { path: '/categories', component: Categories },
    { path: '/stats', component: Stats },
    { path: '/settings', component: Settings },
  ],
})

export default router

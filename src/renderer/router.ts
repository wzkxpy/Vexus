import { createRouter, createWebHashHistory } from 'vue-router'

import Library from './pages/Library.vue'
import Categories from './pages/Categories.vue'
import Stats from './pages/Stats.vue'
import Settings from './pages/Settings.vue'

const router = createRouter({
  history: createWebHashHistory(), // Electron 推荐 hash 模式
  routes: [
    { path: '/', redirect: '/library' },
    { path: '/library', component: Library },
    { path: '/categories', component: Categories },
    { path: '/stats', component: Stats },
    { path: '/settings', component: Settings },
  ],
})

export default router

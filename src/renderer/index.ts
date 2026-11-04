import { createApp } from 'vue'
import App from './App.vue'
import './index.css'
import router from './router'
import { createPinia } from 'pinia'
import { useSessionStore } from './stores/session.store'
import { useRuntimeStore } from './stores/runtime.store'
import { useGameStore } from './stores/game.store'
import { useRouteStore } from './stores/route.store'
import { useSettingsStore } from './stores/settings.store'

const pinia = createPinia()
const app = createApp(App).use(pinia).use(router)
const settingsStore = useSettingsStore(pinia)

// 先确定显示偏好再渲染首屏，首次直达游戏详情也不会先显示错误的横幅布局。
settingsStore.load().catch(() => {
  console.error('设置初始化失败')
}).finally(() => {
  app.mount('#app')
})

// 🔥 在这里注册 IPC
const sessionStore = useSessionStore()
const runtimeStore = useRuntimeStore()
const gameStore = useGameStore()
const routeStore = useRouteStore()

gameStore.initGames().catch(error => {
  console.error('Failed to load games:', error)
})

window.callbackAPI.onGameStopped(async ({ gameId }) => {
  if (runtimeStore.runningGameId === gameId) {
    runtimeStore.stop()
  }
  await Promise.all([
    sessionStore.refreshGameSessions(gameId),
    gameStore.refreshGame(gameId),
    routeStore.refreshGameRoutes(gameId)
  ])
})

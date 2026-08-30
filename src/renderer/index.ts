import { createApp } from 'vue'
import App from './App.vue'
import './index.css'
import router from './router'
import { createPinia } from 'pinia'
import { useSessionStore } from './stores/session.store'
import { useRuntimeStore } from './stores/runtime.store'
import { useGameStore } from './stores/game.store'

createApp(App)
  .use(router)  // 注册路由，用于页面导航
  .use(createPinia()) // 注册 Pinia，用于状态管理
  .mount('#app') // 挂载 Vue 应用到 HTML 中的 #app 元素
  

// 🔥 在这里注册 IPC
const sessionStore = useSessionStore()
const runtimeStore = useRuntimeStore()
const gameStore = useGameStore()

window.callbackAPI.onGameStopped(async ({ gameId }) => {
  if (runtimeStore.runningGameId === gameId) {
    runtimeStore.stop()
  }
  await Promise.all([
    sessionStore.refreshGameSessions(gameId),
    gameStore.refreshGame(gameId)
  ])
})

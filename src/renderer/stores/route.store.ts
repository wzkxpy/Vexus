import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Route, RouteStatus } from '@/shared/types'

export const useRouteStore = defineStore('route', () => {
  const routesByGame = ref<Record<string, Route[]>>({})
  const loadingByGame = ref<Record<string, boolean>>({})
  const errorByGame = ref<Record<string, string | null>>({})

  const getGameRoutes = (gameId: string) => routesByGame.value[gameId] ?? []

  const loadGameRoutes = async (gameId: string) => {
    loadingByGame.value[gameId] = true
    errorByGame.value[gameId] = null
    try {
      routesByGame.value[gameId] = await window.databaseAPI.getGameRoutes(gameId)
    } catch (error) {
      console.error('Failed to load routes:', error)
      errorByGame.value[gameId] = '线路加载失败，请重试。'
    } finally {
      loadingByGame.value[gameId] = false
    }
  }

  // 游玩记录变化后同步线路时长；未打开过线路区时保持惰性加载。
  const refreshGameRoutes = async (gameId: string) => {
    if (routesByGame.value[gameId] === undefined) return
    try {
      routesByGame.value[gameId] = await window.databaseAPI.getGameRoutes(gameId)
      errorByGame.value[gameId] = null
    } catch (error) {
      console.error('Failed to refresh routes:', error)
    }
  }

  const saveGameRoutes = async (gameId: string, routes: Route[], resetLockIds: string[] = []) => {
    const saved = await window.databaseAPI.saveGameRoutes(gameId, routes, resetLockIds)
    routesByGame.value[gameId] = saved
    errorByGame.value[gameId] = null
    return saved
  }

  const updateRouteStatus = async (gameId: string, routeId: string, status: RouteStatus) => {
    const saved = await window.databaseAPI.updateRouteStatus(gameId, routeId, status)
    // 成功后再替换数据，失败时保留原状态和前置解锁结果。
    routesByGame.value[gameId] = saved
    return saved
  }

  return {
    routesByGame,
    loadingByGame,
    errorByGame,
    getGameRoutes,
    loadGameRoutes,
    refreshGameRoutes,
    saveGameRoutes,
    updateRouteStatus
  }
})

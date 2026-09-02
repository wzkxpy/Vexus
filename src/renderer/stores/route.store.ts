import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Route } from '@/shared/types'

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

  const saveGameRoutes = async (gameId: string, routes: Route[]) => {
    const saved = await window.databaseAPI.saveGameRoutes(gameId, routes)
    routesByGame.value[gameId] = saved
    errorByGame.value[gameId] = null
    return saved
  }

  return {
    routesByGame,
    loadingByGame,
    errorByGame,
    getGameRoutes,
    loadGameRoutes,
    saveGameRoutes
  }
})

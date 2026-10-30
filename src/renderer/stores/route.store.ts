import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ROUTE_TREE_VERSION, type Route, type RouteStatus, type RouteTree } from '@/shared/types'
import { orderRoutesByTree } from '@/shared/routeTree'

const EMPTY_TREE: RouteTree = { version: ROUTE_TREE_VERSION, roots: [] }

export const useRouteStore = defineStore('route', () => {
  const routesByGame = ref<Record<string, Route[]>>({})
  const treesByGame = ref<Record<string, RouteTree>>({})
  const loadingByGame = ref<Record<string, boolean>>({})
  const errorByGame = ref<Record<string, string | null>>({})

  const getGameRoutes = (gameId: string) => routesByGame.value[gameId] ?? []
  const getGameTree = (gameId: string) => treesByGame.value[gameId] ?? EMPTY_TREE

  const loadGameRoutes = async (gameId: string) => {
    loadingByGame.value[gameId] = true
    errorByGame.value[gameId] = null
    try {
      const { routes, tree } = await window.databaseAPI.getGameRouteTree(gameId)
      routesByGame.value[gameId] = routes
      treesByGame.value[gameId] = tree
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
      const { routes, tree } = await window.databaseAPI.getGameRouteTree(gameId)
      routesByGame.value[gameId] = routes
      treesByGame.value[gameId] = tree
      errorByGame.value[gameId] = null
    } catch (error) {
      console.error('Failed to refresh routes:', error)
    }
  }

  const saveGameRoutes = async (gameId: string, routes: Route[], tree: RouteTree, resetLockIds: string[] = []) => {
    const saved = await window.databaseAPI.saveGameRouteTree(gameId, routes, tree, resetLockIds)
    routesByGame.value[gameId] = saved.routes
    treesByGame.value[gameId] = saved.tree
    errorByGame.value[gameId] = null
    return saved
  }

  const updateRouteStatus = async (gameId: string, routeId: string, status: RouteStatus) => {
    const saved = await window.databaseAPI.updateRouteStatus(gameId, routeId, status)
    // 成功后再替换数据，失败时保留原状态和前置解锁结果；顺序仍按树的前序展示。
    const tree = treesByGame.value[gameId]
    routesByGame.value[gameId] = tree ? orderRoutesByTree(saved, tree) : saved
    return routesByGame.value[gameId]
  }

  return {
    routesByGame,
    treesByGame,
    loadingByGame,
    errorByGame,
    getGameRoutes,
    getGameTree,
    loadGameRoutes,
    refreshGameRoutes,
    saveGameRoutes,
    updateRouteStatus
  }
})

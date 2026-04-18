// src/renderer/stores/game.store.ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Game, NewGame } from '@/shared/types'

export const useGameStore = defineStore('game', () => {
  
  // state
  const games = ref<Game[]>([])
  const gameMap = computed(() => {
    return new Map(games.value.map(g => [g.id, g]))
  })
  const loaded = ref(false)
  const featuredGameId = ref<string | null>(null) // 首页展示游戏
  const featuredGame = computed(() =>
    games.value.find(g => g.id === featuredGameId.value) || null
  )

  // actions
  const initGames = async () => {
    if (loaded.value) return
    games.value = await window.databaseAPI.getAllGames()
    loaded.value = true
  }

  // const refreshGames = async () => {
  //   games.value = await window.databaseAPI.getAllGames()
  //   loaded.value = true
  // }

  const refreshGame = async (id: string) => {
    const fresh = await window.databaseAPI.getGame(id)
    if (!fresh) return
    const index = games.value.findIndex(g => g.id === id)
    if (index !== -1) {
      games.value[index] = fresh
    } else {
      games.value.push(fresh)
    }
  }

  // const patchGame = async (id: string, patch: Partial<Game>) => {
  //   const game = games.value.find(g => g.id === id)
  //   if (!game) return
  //   Object.assign(game, patch)
  // }
  const setFeaturedGame = (id: string | null) => {
    featuredGameId.value = id
  }
  
  const getGameById = (id: string) => {
    return gameMap.value.get(id) || null
  }

  const addGame = async (game: NewGame) => {
    const id = await window.databaseAPI.addGame(game)
    await refreshGame(id)
    return id
  }

  const deleteGame = async (id: string) => {
    const ok = await window.databaseAPI.deleteGame(id)
    if (ok) {
      games.value = games.value.filter(g => g.id !== id)

      if (featuredGameId.value === id) {
        featuredGameId.value = games.value[0]?.id ?? null
      }
    }
    return ok
  }

  const updateGame = async (id: string, payload: Partial<Game>) => {
    const g = gameMap.value.get(id) || null // 直接修改原对象，保持响应式
    if (!g) return
    Object.assign(g, payload)
    await window.databaseAPI.updateGame(JSON.parse(JSON.stringify(g)))
  }

  return {
    games,
    featuredGameId,
    featuredGame,
    
    getGameById,
    initGames,
    refreshGame,
    addGame,
    deleteGame,
    updateGame,
    setFeaturedGame
    // deleteSelectedGame
  }
})

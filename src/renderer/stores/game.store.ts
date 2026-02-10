import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Game, NewGame } from '@/shared/types'

export const useGameStore = defineStore('game', () => {
  
  // state
  const games = ref<Game[]>([])
  const loaded = ref(false)

  // actions

  // 初始化加载（只加载一次）
  const initGames = async () => {
    if (loaded.value) return
    games.value = await window.gameAPI.getAllGames()
    loaded.value = true
  }

  const refreshGames = async () => {
    games.value = await window.gameAPI.getAllGames()
    loaded.value = true
  }

  const addGame = async (game: NewGame) => {
    const id = await window.gameAPI.addGame(game)
    games.value.push({ id, ...game })
    return id
  }

  const deleteGame = async (id: string) => {
    const ok = await window.gameAPI.deleteGame(id)
    if (ok) {
      games.value = games.value.filter(g => g.id !== id)
    }
    return ok
  }

  return {
    games,
    initGames,
    refreshGames,
    addGame,
    deleteGame,
  }
})

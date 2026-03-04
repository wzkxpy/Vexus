// src/renderer/stores/game.store.ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Game, NewGame } from '@/shared/types'

export const useGameStore = defineStore('game', () => {
  
  // state
  const games = ref<Game[]>([])
  const loaded = ref(false)
  const selectedId = ref<string | null>(null)
  const selectedGame = computed(() =>
    games.value.find(g => g.id === selectedId.value) || null
  )

  // actions

  // 初始化加载（只加载一次）
  const initGames = async () => {
    if (loaded.value) return
    games.value = await window.databaseAPI.getAllGames()
    loaded.value = true
  }

  const refreshGames = async () => {
    games.value = await window.databaseAPI.getAllGames()
    loaded.value = true
  }

  const addGame = async (game: NewGame) => {
    const id = await window.databaseAPI.addGame(game)
    await refreshGames()
    return id
  }

  const deleteGame = async (id: string) => {
    const ok = await window.databaseAPI.deleteGame(id)
    if (ok) {
      games.value = games.value.filter(g => g.id !== id)
    }
    return ok
  }

  const selectGame = (id: string | null) => {
    selectedId.value = id
  }

  function updateSelectedGame(payload: Partial<Game>) {  // Partial: Game 里的所有字段都变成“可选” 
    if (!selectedGame.value) return
    Object.assign(selectedGame.value, payload)
  }

  // const deleteSelectedGame = async () => {
  //   if (!selectedId.value) return false
  //   const ok = await deleteGame(selectedId.value)
  //   if (ok) selectedId.value = null
  //   return ok
  // }


  return {
    games,
    selectedGame,
    selectedId,
    
    initGames,
    refreshGames,
    addGame,
    deleteGame,
    selectGame,
    updateSelectedGame,
    // deleteSelectedGame
  }
})

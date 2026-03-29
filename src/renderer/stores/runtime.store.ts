import { defineStore } from 'pinia'

export const useRuntimeStore = defineStore('runtime', {
  state: () => ({
    runningGameId: null as string | null
  }),

  getters: {
    isRunning: (state) => state.runningGameId !== null,
    isGameRunning: (state) => {
      return (gameId: string) => state.runningGameId === gameId
    }
  },

  actions: {
    start(gameId: string) {
      this.runningGameId = gameId
    },

    stop() {
      this.runningGameId = null
    }
  }
})

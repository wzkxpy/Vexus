import { defineStore } from 'pinia'
import { Session } from '@/shared/types'


export const useSessionStore = defineStore('session', {
  state: () => ({
    sessionsByGame: {} as Record<string, Session[]>,
    loadedGames: new Set<string>()
  }),

  getters: {
    getGameSessions: (state) => {
      return (gameId: string) => state.sessionsByGame[gameId] || []
    }
  },

  actions: {
    async loadGameSessions(gameId: string) {
      if (this.loadedGames.has(gameId)) return
      const sessions = await window.databaseAPI.getGameSessions(gameId)
      this.sessionsByGame[gameId] = sessions
      this.loadedGames.add(gameId)
    },

    async refreshGameSessions(gameId: string) {
      const sessions = await window.databaseAPI.getGameSessions(gameId)
      this.sessionsByGame[gameId] = sessions
    },

    // createSession(gameId: string, playDate: string, duration: number,
    //   routeId?: string, startTime?: string | null, endTime?: string | null
    // ) {
    //   const session: Session = {
    //     id: crypto.randomUUID(),
    //     gameId: gameId,
    //     routeId: routeId ?? null,
    //     playDate: playDate,
    //     duration: duration,
    //     startTime: startTime ?? null,
    //     endTime: endTime ?? null
    //   }
    //   return session
    // },

    async addSession(session: Session) {
      await window.databaseAPI.addSession(session)
      if (!this.sessionsByGame[session.gameId]) {
        this.sessionsByGame[session.gameId] = []
      }
      this.sessionsByGame[session.gameId].push(session)
      // this.sessionsByGame[session.gameId].sort((a, b) => new Date(a.playDate).getTime() - new Date(b.playDate).getTime())
    },

    async deleteSession(id: string, gameId: string) {
      await window.databaseAPI.deleteSession(id)
      if (!this.sessionsByGame[gameId]) return
      this.sessionsByGame[gameId] =
        this.sessionsByGame[gameId].filter(s => s.id !== id)
    },

    async updateSession(session: Session) {
      await window.databaseAPI.updateSession(session)

      const list = this.sessionsByGame[session.gameId]
      if (!list) return

      const index = list.findIndex(s => s.id === session.id)
      if (index !== -1) {
        list[index] = session
      }
    },


  }
})

// getTotalPlaytime: (state) => (gameId: string) => {
//   const sessions = state.sessionsByGame[gameId] || []

//   return sessions.reduce((sum, s) => sum + s.duration, 0)
// }
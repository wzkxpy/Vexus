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
      if (!this.loadedGames.has(gameId)) return
      const sessions = await window.databaseAPI.getGameSessions(gameId)
      this.sessionsByGame[gameId] = sessions
    },

    async addSession(session: Session) {
      await window.databaseAPI.addSession(session)
      if (!this.sessionsByGame[session.gameId]) {
        this.sessionsByGame[session.gameId] = []
      }
      // 寻找插入位置
      const list = this.sessionsByGame[session.gameId]
      const index = list.findIndex(s => compareSession(session, s) < 0)
      if (index === -1) {
        list.push(session)
      } else {
        list.splice(index, 0, session)
      }
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

function compareSession(a: Session, b: Session): number {
  if (a.playDate !== b.playDate) {
    return a.playDate.localeCompare(b.playDate)
  }
  if (a.startTime && b.startTime) {
    return a.startTime.localeCompare(b.startTime)
  }
  if (a.startTime) return -1
  if (b.startTime) return 1
  return b.duration - a.duration
}

// getTotalPlaytime: (state) => (gameId: string) => {
//   const sessions = state.sessionsByGame[gameId] || []

//   return sessions.reduce((sum, s) => sum + s.duration, 0)
// }
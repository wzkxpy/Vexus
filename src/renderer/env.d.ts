// src/renderer/env.d.ts
// import type { Game, NewGame } from '@/shared/types'

export {}

declare global {
  interface Window {
    windowAPI: {
      minimize: () => void
      maximize: () => void
      close: () => void
    },

    databaseAPI: {
      getAllGames: () => Promise<Game[]>
      addGame: (game: NewGame) => Promise<string>
      deleteGame: (id: string) => Promise<boolean>
      updateGame: (game: Game) => Promise<void>

      getGameSessions: (gameid: string) => Promise<Session[]>
      addSession: (session: Session) => Promise<void>
      deleteSession: (id: string) => Promise<void>
      updateSession: (session: Session) => Promise<void>
    },

    launchAPI: {
      launchGame: (gameId: string, exePath: string) => Promise<{success: boolean}>
      stopGame: (gameId: string, exePath: string) => Promise<{success: boolean}>
      openFolder: (exePath: string) => Promise<{success: boolean}>
    },
    
    scraperAPI: {
      fetchGameFromBangumi: (id: string) => Promise<any>
      // addGameToDatabase: (game: Game) => Promise<string>
    },

    callbackAPI: {
      onGameStopped: (callback: (data: any) => void) => void
    }
  }
}

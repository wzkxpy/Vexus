// src/renderer/env.d.ts

/// <reference types="vite/client" />
export {}

declare global {
  interface Window {
    windowAPI: {
      minimize: () => void
      maximize: () => void
      close: () => void
    },

    databaseAPI: {
      getGame: (id: string) => Promise<Game | null>
      getAllGames: () => Promise<Game[]>
      addGame: (game: NewGame) => Promise<string>
      deleteGame: (id: string) => Promise<boolean>
      updateGame: (game: Game) => Promise<void>
      updateMedia: (gameId: string, type: 'cover' | 'banner' | 'icon', sourcePath: string) => Promise<string>

      getGameSessions: (gameid: string) => Promise<Session[]>
      addSession: (session: Session) => Promise<void>
      deleteSession: (id: string) => Promise<void>
      updateSession: (session: Session) => Promise<void>
    },

    fileAPI: {
      getFilePath: (file: File) => Promise<string>
      openFolder: (exePath: string) => Promise<{success: boolean}>
    },

    launchAPI: {
      launchGame: (gameId: string, exePath: string) => Promise<{success: boolean}>
      stopGame: (gameId: string, exePath: string) => Promise<{success: boolean}>
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

// src/renderer/env.d.ts
import type { Game, NewGame } from '@/shared/types'

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
    },

    launchAPI: {
      launchGame: (exePath: string) => Promise<{success: boolean}>
    },
    
    scraperAPI: {
      fetchGameFromBangumi: (id: string) => Promise<any>
      // addGameToDatabase: (game: Game) => Promise<string>
    }
  }
}

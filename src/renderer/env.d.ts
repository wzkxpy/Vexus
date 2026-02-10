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

    gameAPI: {
      getAllGames: () => Promise<Game[]>
      addGame: (game: NewGame) => Promise<string>
      deleteGame: (id: string) => Promise<boolean>
    }
  }
}

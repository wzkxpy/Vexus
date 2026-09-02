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
      importSessions: (gameId: string, text: string) => Promise<void>
      getGameRoutes: (gameId: string) => Promise<Route[]>
      saveGameRoutes: (gameId: string, routes: Route[]) => Promise<Route[]>
    },

    fileAPI: {
      getFilePath: (file: File) => Promise<string>
      openFolder: (exePath: string) => Promise<{success: boolean}>
    },

    launchAPI: {
      launchGame: (gameId: string, exePath: string) => Promise<{success: boolean}>
      stopGame: (gameId: string, exePath: string) => Promise<{success: boolean}>
    },

    settingsAPI: {
      getSettings: () => Promise<Settings>
      getSetting: (key: keyof Settings) => Promise<any>
      setSetting: (key: keyof Settings, value: any) => Promise<void>
    },
    
    providerAPI: {
      searchGames: (source: string, keyword: string) => Promise<GameSearchResult[]>
      fetchGame: (source: string, subjectId: string) => Promise<GameSearchResult>
      buildGameFromBangumi: (subject: any) => Promise<NewGame>
    },

    callbackAPI: {
      onGameStopped: (callback: (data: any) => void) => void
    }
  }
}

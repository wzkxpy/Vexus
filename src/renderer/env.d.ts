// src/renderer/env.d.ts

/// <reference types="vite/client" />
export {}
import type {
  CharacterDraft,
  ExternalScoreFetchResult,
  Game,
  GameCandidate,
  GameMetadataSection,
  NewGame,
  ProviderSectionResult,
  ProviderSource,
  Route,
  RouteStatus,
  RouteTree,
  Session,
  Settings
} from '@/shared/types'

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
      updateCharacters: (gameId: string, characters: CharacterDraft[]) => Promise<Game>
      updateMedia: (gameId: string, type: 'cover' | 'banner' | 'icon', sourcePath: string) => Promise<string>
      renameSeries: (oldName: string, newName: string) => Promise<void>
      deleteSeries: (name: string) => Promise<void>

      getGameSessions: (gameid: string) => Promise<Session[]>
      addSession: (session: Session) => Promise<void>
      deleteSession: (id: string) => Promise<void>
      updateSession: (session: Session) => Promise<void>
      importSessions: (gameId: string, text: string) => Promise<void>
      assignTagToRoute: (gameId: string, tag: string, routeId: string) => Promise<void>
      getGameRouteTree: (gameId: string) => Promise<{ routes: Route[]; tree: RouteTree }>
      saveGameRouteTree: (gameId: string, routes: Route[], tree: RouteTree, resetLockIds?: string[]) =>
        Promise<{ routes: Route[]; tree: RouteTree }>
      updateRouteStatus: (gameId: string, routeId: string, status: RouteStatus) => Promise<Route[]>
    },

    fileAPI: {
      getFilePath: (file: File) => Promise<string>
      openFolder: (exePath: string) => Promise<{success: boolean}>
    },

    clipboardAPI: {
      writeText: (text: string) => Promise<void>
    },

    launchAPI: {
      launchGame: (gameId: string, exePath: string) => Promise<{success: boolean}>
      stopGame: (gameId: string, exePath: string) => Promise<{success: boolean}>
    },

    settingsAPI: {
      getSettings: () => Promise<Settings>
      getSetting: <K extends keyof Settings>(key: K) => Promise<Settings[K]>
      setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>
      openVoiceActorAliasesFile: () => Promise<void>
    },
    
    providerAPI: {
      searchGames: (source: ProviderSource, keyword: string) => Promise<GameCandidate[]>
      fetchGame: (source: ProviderSource, subjectId: string) => Promise<GameCandidate>
      buildGame: (source: ProviderSource, sourceId: string) => Promise<NewGame>
      fetchGameSection: (gameId: string, section: GameMetadataSection, source: ProviderSource) => Promise<ProviderSectionResult>
      fetchGameScores: (gameId: string) => Promise<ExternalScoreFetchResult>
    },

    callbackAPI: {
      onGameStopped: (callback: (data: any) => void) => void
    }
  }
}

// src/preload/index.ts
import type {
  CharacterDraft,
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
import { contextBridge, ipcRenderer, webUtils } from 'electron'

// 窗口控制 API
contextBridge.exposeInMainWorld('windowAPI', {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
})

// 数据库相关 API
contextBridge.exposeInMainWorld('databaseAPI', {
  getGame: (id: string): Promise<Game | null> => ipcRenderer.invoke('getGame', id),
  getAllGames: (): Promise<Game[]> => ipcRenderer.invoke('getAllGames'),
  addGame: (game: NewGame): Promise<string> => ipcRenderer.invoke('addGame', game),
  deleteGame: (id: string): Promise<boolean> => ipcRenderer.invoke('deleteGame', id),
  updateGame: (game: Game): Promise<void> => ipcRenderer.invoke('updateGame', game),
  updateCharacters: (gameId: string, characters: CharacterDraft[]): Promise<Game> =>
    ipcRenderer.invoke('updateCharacters', gameId, characters),
  updateMedia: (gameId: string, type: 'cover' | 'banner' | 'icon', sourcePath: string):
   Promise<void> => ipcRenderer.invoke('updateMedia', gameId, type, sourcePath),
  renameSeries: (oldName: string, newName: string): Promise<void> =>
    ipcRenderer.invoke('renameSeries', oldName, newName),
  deleteSeries: (name: string): Promise<void> =>
    ipcRenderer.invoke('deleteSeries', name),

  getGameSessions: (gameid: string): Promise<Session[]> => ipcRenderer.invoke('getGameSessions', gameid),
  addSession: (session: Session): Promise<void> => ipcRenderer.invoke('addSession', session),
  deleteSession: (id: string): Promise<void> => ipcRenderer.invoke('deleteSession', id),
  updateSession: (session: Session): Promise<void> => ipcRenderer.invoke('updateSession', session),
  importSessions: (gameId: string, text: string): Promise<void> =>
    ipcRenderer.invoke('importSessions', gameId, text),
  assignTagToRoute: (gameId: string, tag: string, routeId: string): Promise<void> =>
    ipcRenderer.invoke('assignTagToRoute', gameId, tag, routeId),

  getGameRouteTree: (gameId: string): Promise<{ routes: Route[]; tree: RouteTree }> =>
    ipcRenderer.invoke('getGameRouteTree', gameId),
  saveGameRouteTree: (gameId: string, routes: Route[], tree: RouteTree, resetLockIds: string[] = []):
    Promise<{ routes: Route[]; tree: RouteTree }> =>
    ipcRenderer.invoke('saveGameRouteTree', gameId, routes, tree, resetLockIds),
  updateRouteStatus: (gameId: string, routeId: string, status: RouteStatus): Promise<Route[]> =>
    ipcRenderer.invoke('updateRouteStatus', gameId, routeId, status)

  //属性值: (参数: 参数类型): Promise<返回值类型> => ipcRenderer.invoke('IPC通道', 参数)
})

// 启动游戏 API
contextBridge.exposeInMainWorld('launchAPI', {
  launchGame: (gameId: string, exePath: string) => ipcRenderer.invoke('launchGame', gameId, exePath),
  stopGame: (gameId: string, exePath: string) => ipcRenderer.invoke('stopGame', gameId, exePath),
})

// 文件路径 API
contextBridge.exposeInMainWorld('fileAPI', {
  getFilePath: (file: File) => { return webUtils.getPathForFile(file) },
  openFolder: (exePath: string) => ipcRenderer.invoke('openFolder', exePath)
})

contextBridge.exposeInMainWorld('clipboardAPI', {
  writeText: (text: string): Promise<void> => ipcRenderer.invoke('clipboard:writeText', text)
})

// 读取设置 API
contextBridge.exposeInMainWorld('settingsAPI', {
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('getSettings'),
  getSetting: <K extends keyof Settings>(key: K): Promise<Settings[K]> => ipcRenderer.invoke('getSetting', key),
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> => ipcRenderer.invoke('setSetting', key, value),
  openVoiceActorAliasesFile: (): Promise<void> => ipcRenderer.invoke('openVoiceActorAliasesFile')
})

// 从数据源获取游戏数据 API
contextBridge.exposeInMainWorld('providerAPI', {
  searchGames: (source: ProviderSource, keyword: string): Promise<GameCandidate[]> =>
    ipcRenderer.invoke('searchGames', source, keyword),
  fetchGame: (source: ProviderSource, subjectId: string): Promise<GameCandidate> =>
    ipcRenderer.invoke('fetchGame', source, subjectId),
  buildGame: (source: ProviderSource, sourceId: string): Promise<NewGame> =>
    ipcRenderer.invoke('buildGame', source, sourceId),
  fetchGameSection: (
    gameId: string,
    section: GameMetadataSection,
    source: ProviderSource
  ): Promise<ProviderSectionResult> =>
    ipcRenderer.invoke('fetchGameSection', gameId, section, source)
})

contextBridge.exposeInMainWorld('callbackAPI', {
  onGameStopped: (callback: (data: any) => void) => {
    ipcRenderer.on('game:stopped', (_event, data) => callback(data))
  }
})

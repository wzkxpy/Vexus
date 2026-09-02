// src/preload/index.ts
import type { Game, NewGame, Route, Session } from '@/shared/types'
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
  updateMedia: (gameId: string, type: 'cover' | 'banner' | 'icon', sourcePath: string):
   Promise<void> => ipcRenderer.invoke('updateMedia', gameId, type, sourcePath),

  getGameSessions: (gameid: string): Promise<Session[]> => ipcRenderer.invoke('getGameSessions', gameid),
  addSession: (session: Session): Promise<void> => ipcRenderer.invoke('addSession', session),
  deleteSession: (id: string): Promise<void> => ipcRenderer.invoke('deleteSession', id),
  updateSession: (session: Session): Promise<void> => ipcRenderer.invoke('updateSession', session),
  importSessions: (gameId: string, text: string): Promise<void> =>
    ipcRenderer.invoke('importSessions', gameId, text),

  getGameRoutes: (gameId: string): Promise<Route[]> => ipcRenderer.invoke('getGameRoutes', gameId),
  saveGameRoutes: (gameId: string, routes: Route[]): Promise<Route[]> =>
    ipcRenderer.invoke('saveGameRoutes', gameId, routes)

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

// 读取设置 API
contextBridge.exposeInMainWorld('settingsAPI', {
  getSettings: () => ipcRenderer.invoke('getSettings'),
  getSetting: (key: string) => ipcRenderer.invoke('getSetting', key),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('setSetting', key, value)
})

// 从数据源获取游戏数据 API
contextBridge.exposeInMainWorld('providerAPI', {
  searchGames: (source: string, keyword: string) => ipcRenderer.invoke('searchGames', source, keyword),
  fetchGame: (source: string, subjectId: string) => ipcRenderer.invoke('fetchGame', source, subjectId),
  buildGameFromBangumi: (subject: any) => ipcRenderer.invoke('buildGameFromBangumi', subject)
})

contextBridge.exposeInMainWorld('callbackAPI', {
  onGameStopped: (callback: (data: any) => void) => {
    ipcRenderer.on('game:stopped', (_event, data) => callback(data))
  }
})

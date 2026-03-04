// src/preload/index.ts
import type { Game, NewGame } from '@/shared/types'
import { contextBridge, ipcRenderer } from 'electron'

// 窗口控制 API
contextBridge.exposeInMainWorld('windowAPI', {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
})

// 数据库相关 API
contextBridge.exposeInMainWorld('databaseAPI', {
  getAllGames: (): Promise<Game[]> => ipcRenderer.invoke('getAllGames'),
  addGame: (game: NewGame): Promise<string> => ipcRenderer.invoke('addGame', game),
  deleteGame: (id: string): Promise<boolean> => ipcRenderer.invoke('deleteGame', id),
  updateGame: (game: Game): Promise<void> => ipcRenderer.invoke('updateGame', game)
//属性值: (参数: 参数类型): Promise<返回值类型> => ipcRenderer.invoke('IPC通道', 参数)
})

// 启动游戏 API
contextBridge.exposeInMainWorld('launchAPI', {
  launchGame: (exePath: string) => ipcRenderer.invoke('launchGame', exePath)
})


// 获取游戏数据 API
contextBridge.exposeInMainWorld('scraperAPI', {
  fetchGameFromBangumi: (id: string) =>
    ipcRenderer.invoke('fetchFromBangumi', id)

  // addGameToDatabase: (game: NewGame) =>
  //   ipcRenderer.invoke('addGame', game)
})
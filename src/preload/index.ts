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
contextBridge.exposeInMainWorld('gameAPI', {
  getAllGames: (): Promise<Game[]> => ipcRenderer.invoke('getAllGames'),
  addGame: (game: NewGame): Promise<string> => ipcRenderer.invoke('addGame', game),
  deleteGame: (id: string): Promise<boolean> => ipcRenderer.invoke('deleteGame', id),
//属性值: (参数: 参数类型): Promise<返回值类型> => ipcRenderer.invoke('IPC通道', 参数)
})

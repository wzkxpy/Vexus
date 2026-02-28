// src/main/ipc.ts
// Electron IPC 
// 负责注册主进程的 IPC 事件处理器, 供 preload 暴露给渲染进程调用

import { ipcMain, BrowserWindow } from 'electron'
import { GameService } from './database/game.service'
import * as fs from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'
import { NewGame } from '@/shared/types'

import { fetchGameFromBangumi } from './scraper/manager'


export function registerWindowIPC(win: BrowserWindow) {
  ipcMain.on('window:minimize', () => {
    win.minimize()
  })
  ipcMain.on('window:maximize', () => {
    win.isMaximized() ? win.unmaximize() : win.maximize()
  })
  ipcMain.on('window:close', () => {
    win.close()
  })
}


export function registerDBIPC(gameService: GameService) {
  ipcMain.handle('addGame', (_, newgame: NewGame) => {
    return gameService.addGame(newgame)
  })
  ipcMain.handle('deleteGame', (_, id: string) => {
    return gameService.deleteGame(id)
  })
  ipcMain.handle('getAllGames', () => {
    return gameService.getAllGames()
  })
}

export function registerLaunchIPC() {
  ipcMain.handle('launchGame', async (_, exePath) => {
    if (!fs.existsSync(exePath)) {
      throw new Error('游戏可执行文件不存在')
    }
    spawn(exePath, [], {
      cwd: path.dirname(exePath),
      detached: true,
      stdio: 'ignore',
    }).unref()
    return { success: true }
  })
}


export function registerScraperIPC() {
  ipcMain.handle('fetchFromBangumi', async (_, subjectId) => {
      return await fetchGameFromBangumi(subjectId)
  })
}
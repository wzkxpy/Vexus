// src/main/ipc.ts
// Electron IPC 
// 负责注册主进程的 IPC 事件处理器, 供 preload 暴露给渲染进程调用

import { ipcMain, BrowserWindow } from 'electron'
import { addGame, deleteGame, getAllGames } from './database/game.repo'
import * as fs from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'


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


export function registerDBIPC() {
  ipcMain.handle('getAllGames', () => getAllGames())
  ipcMain.handle('addGame', (_, game) => addGame(game))
  ipcMain.handle('deleteGame', (_, id: string) => deleteGame(id))
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
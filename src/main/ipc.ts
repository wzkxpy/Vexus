// src/main/ipc.ts
// Electron IPC 
// 负责注册主进程的 IPC 事件处理器, 供 preload 暴露给渲染进程调用

import { ipcMain, BrowserWindow, shell } from 'electron'
import { GameService } from './database/game.service'
import { SessionService } from './database/session.service'
import * as fs from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'
import { NewGame, Session } from '@/shared/types'

import { fetchGameFromBangumi } from './providers/manager'



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


export function registerDBIPC(gameService: GameService, sessionService: SessionService) {
  // Game
  ipcMain.handle('addGame', (_, newgame: NewGame) => {
    return gameService.addGame(newgame)
  })
  ipcMain.handle('deleteGame', (_, id: string) => {
    return gameService.deleteGame(id)
  })
  ipcMain.handle('getAllGames', () => {
    return gameService.getAllGames()
  })
  ipcMain.handle('updateGame', (_, game) => {
    return gameService.updateGame(game)
  })
  // Session
  ipcMain.handle('getGameSessions', (_, gameid: string) => {
    return sessionService.getGameSessions(gameid)
  })
  ipcMain.handle('addSession', (_, session: Session) => {
    return sessionService.addSession(session)
  })
  ipcMain.handle('deleteSession', (_, id: string) => {
    return sessionService.deleteSession(id)
  })
  ipcMain.handle('updateSession', (_, session: Session) =>{
    return sessionService.updateSession(session)
  })
}


export function registerLaunchIPC() {
  const runningGames = new Map<string, number>() // 用 Map 保存游戏 exePath -> PID
  
  ipcMain.handle('launchGame', async (_, exePath: string) => {
    if (!fs.existsSync(exePath)) {
      throw new Error('Exe file is not exist')
    }
    // 启动游戏进程
    const child = spawn(exePath, [], {
      cwd: path.dirname(exePath),
      detached: true,
      stdio: 'ignore',
    })
    child.unref()
    // 保存 PID
    runningGames.set(exePath, child.pid!)
    return { success: true, pid: child.pid }
  })

  ipcMain.handle('stopGame', async (_, exePath: string) => {
    const pid = runningGames.get(exePath)
    if (!pid) {
      throw new Error('The game is not launching')
    }
    try {
      process.kill(pid) // 尝试结束进程
      runningGames.delete(exePath)
      return { success: true }
    } catch (err: any) {
      throw new Error(err.message || '停止游戏失败')
    }
  })
  // 打开 exe 所在文件夹
  ipcMain.handle('openFolder', async (_, exePath: string) => {
    if (!fs.existsSync(exePath)) {
      throw new Error('文件不存在')
    }
    const folderPath = path.dirname(exePath)
    await shell.openPath(folderPath)
    return { success: true }
  })
}


export function registerScraperIPC() {
  ipcMain.handle('fetchFromBangumi', async (_, subjectId) => {
      return await fetchGameFromBangumi(subjectId)
  })
}
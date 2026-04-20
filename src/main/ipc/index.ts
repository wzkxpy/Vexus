// src/main/ipc.ts
// Electron IPC 
// 负责注册主进程的 IPC 事件处理器, 供 preload 暴露给渲染进程调用

import { ipcMain, BrowserWindow } from 'electron'
import { GameService } from '../database/game.service'
import { SessionService } from '../database/session.service'
import { Game, NewGame, Session } from '@/shared/types'
import { fetchGameFromBangumi } from '../providers/manager'
import { launchGame, stopGame, openFolder } from '../services/launch'

// export function registerAllIPC() {
  
// }

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

export function registerFileIPC() {
  ipcMain.handle('openFolder', async (_, exePath: string) => {
    return openFolder(exePath)
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
  ipcMain.handle('getGame', (_, id: string) => {
    return gameService.getGame(id)
  })
  ipcMain.handle('getAllGames', () => {
    return gameService.getAllGames()
  })
  ipcMain.handle('updateGame', (_, game: Game) => {
    return gameService.updateGame(game)
  })
  ipcMain.handle('updateMedia', (_, gameId: string, type: 'cover' | 'banner' | 'icon', sourcePath: string) => {
    return gameService.updateMedia(gameId, type, sourcePath)
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
  ipcMain.handle('launchGame', async (_, gameId: string, exePath: string) => {
    return launchGame(gameId, exePath)
  })

  ipcMain.handle('stopGame', async (_, gameId: string, exePath: string) => {
    return stopGame(gameId, exePath)
  })
}


export function registerProviderIPC() {
  ipcMain.handle('fetchFromBangumi', async (_, subjectId) => {
      return await fetchGameFromBangumi(subjectId)
  })
}
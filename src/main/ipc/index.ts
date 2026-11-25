// src/main/ipc.ts
// Electron IPC 
// 负责注册主进程的 IPC 事件处理器, 供 preload 暴露给渲染进程调用

import { ipcMain, BrowserWindow, clipboard } from 'electron'
import { GameService } from '../database/game.service'
import { SessionService } from '../database/session.service'
import { Game, NewGame, Route, RouteStatus, RouteTree, Session, GAME_METADATA_SECTIONS } from '@/shared/types'
import type { GameMetadataSection, ProviderSource } from '@/shared/types'
import { SessionImportService } from '../services/sessionImport'
import { searchGames, fetchGame, buildGame } from '../providers/manager'
import { launchGame, stopGame, openFolder } from '../services/launch'
import { getSettings, getSetting, setSetting, Settings } from '../settings'
import { RouteService } from '../database/route.service'
import { RouteTreeService } from '../services/routeTree'
import type { VoiceActorAliasService } from '../services/voiceActorAlias'
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

export function registerClipboardIPC() {
  ipcMain.handle('clipboard:writeText', (_, text: string) => {
    if (typeof text !== 'string') throw new Error('Invalid clipboard text')
    clipboard.writeText(text)
  })
}


export function registerDBIPC(
  gameService: GameService,
  sessionService: SessionService,
  sessionImportService: SessionImportService,
  routeService: RouteService,
  routeTreeService: RouteTreeService
) {
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
  ipcMain.handle('updateCharacters', (_, gameId: string, characters) => {
    if (typeof gameId !== 'string' || !gameId || !Array.isArray(characters)) {
      throw new Error('Invalid character update request')
    }
    return gameService.updateCharacters(gameId, characters)
  })
  ipcMain.handle('updateMedia', (_, gameId: string, type: 'cover' | 'banner' | 'icon', sourcePath: string) => {
    return gameService.updateMedia(gameId, type, sourcePath)
  })
  ipcMain.handle('renameSeries', (_, oldName: string, newName: string) => {
    if (typeof oldName !== 'string' || typeof newName !== 'string' || !oldName.trim() || !newName.trim()) {
      throw new Error('Invalid series rename request')
    }
    return gameService.renameSeries(oldName, newName)
  })
  ipcMain.handle('deleteSeries', (_, name: string) => {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('Invalid series delete request')
    }
    return gameService.deleteSeries(name)
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
  ipcMain.handle('importSessions', (_, gameId: string, text: string) => {
    return sessionImportService.import(gameId, text)
  })
  ipcMain.handle('assignTagToRoute', (_, gameId: string, tag: string, routeId: string) => {
    return sessionService.assignTagToRoute(gameId, tag, routeId)
  })
  // Route
  ipcMain.handle('getGameRouteTree', (_, gameId: string) => {
    if (typeof gameId !== 'string' || !gameId) throw new Error('Invalid game id')
    return routeTreeService.get(gameId)
  })
  ipcMain.handle('saveGameRouteTree', (_, gameId: string, routes: Route[], tree: RouteTree, resetLockIds: string[] = []) => {
    if (typeof gameId !== 'string' || !gameId) throw new Error('Invalid game id')
    return routeTreeService.save(gameId, routes, tree, resetLockIds)
  })
  ipcMain.handle('updateRouteStatus', (_, gameId: string, routeId: string, status: RouteStatus) => {
    return routeService.updateRouteStatus(gameId, routeId, status)
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

export function registerSettingsIPC(voiceActorAliasService: VoiceActorAliasService) {
  ipcMain.handle('getSettings', () => {
    return getSettings()
  })
  ipcMain.handle('getSetting', (_, key: keyof Settings) => {
    return getSetting(key)
  })
  ipcMain.handle('setSetting', (_, key: keyof Settings, value: any) => {
    return setSetting(key, value)
  })
  ipcMain.handle('openVoiceActorAliasesFile', () => {
    return voiceActorAliasService.openFile()
  })
}

export function registerProviderIPC(gameService: GameService) {
  ipcMain.handle('searchGames', async (_, source: unknown, keyword: unknown) => {
    const provider = requireProviderSource(source)
    if (typeof keyword !== 'string') {
      throw new Error('Invalid search request')
    }
    return await searchGames(provider, keyword)
  })
  ipcMain.handle('fetchGame', async (_, source: unknown, subjectId: unknown) => {
    const provider = requireProviderSource(source)
    if (typeof subjectId !== 'string' || !subjectId.trim()) {
      throw new Error('Invalid game lookup request')
    }
    return await fetchGame(provider, subjectId)
  })
  ipcMain.handle('buildGame', async (_, source: unknown, sourceId: unknown) => {
    const provider = requireProviderSource(source)
    if (typeof sourceId !== 'string' || !sourceId.trim()) {
      throw new Error('Invalid build game request')
    }
    return await buildGame(provider, sourceId)
  })
  ipcMain.handle('fetchGameSection', async (_, gameId: unknown, section: unknown, source: unknown) => {
    if (
      typeof gameId !== 'string' ||
      !gameId ||
      typeof section !== 'string' ||
      !isGameMetadataSection(section)
    ) {
      throw new Error('Invalid metadata section request')
    }
    const provider = requireProviderSource(source)
    return gameService.fetchMetadataSection(gameId, section, provider)
  })
  ipcMain.handle('fetchGameScores', async (_, gameId: unknown) => {
    if (typeof gameId !== 'string' || !gameId) {
      throw new Error('Invalid game scores request')
    }
    return gameService.fetchExternalScores(gameId)
  })
}

function isGameMetadataSection(value: string): value is GameMetadataSection {
  return (GAME_METADATA_SECTIONS as readonly string[]).includes(value)
}

function isProviderSource(value: string): value is ProviderSource {
  return value === 'bangumi' || value === 'vndb'
}

function requireProviderSource(value: unknown): ProviderSource {
  if (typeof value !== 'string' || !isProviderSource(value)) {
    throw new Error('Invalid provider source')
  }
  return value
}

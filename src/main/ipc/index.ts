// src/main/ipc.ts
// Electron IPC 
// 负责注册主进程的 IPC 事件处理器, 供 preload 暴露给渲染进程调用

import { app, dialog, ipcMain, BrowserWindow, clipboard, shell } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { GameService } from '../database/game.service'
import { SessionService } from '../database/session.service'
import { Game, NewGame, Route, RouteStatus, RouteTree, Session, GAME_METADATA_SECTIONS } from '@/shared/types'
import type { BackupExportResult, GameMetadataSection, ProviderSource } from '@/shared/types'
import { SessionImportService } from '../services/sessionImport'
import { searchGames, fetchGame, buildGame } from '../providers/manager'
import { launchGame, stopGame, openFolder } from '../services/launch'
import { getSettings, getSetting, setSetting, Settings } from '../settings'
import { RouteService } from '../database/route.service'
import { RouteTreeService } from '../services/routeTree'
import type { VoiceActorAliasService } from '../services/voiceActorAlias'
import type { BackupService } from '../services/backup'
import { getLogDir, logger } from '../logger'
import { isUserError, UserError } from '../utils/errors'
// export function registerAllIPC() {
  
// }

type InvokeHandler = (event: IpcMainInvokeEvent, ...args: any[]) => unknown

const DESTRUCTIVE_CHANNELS = new Set(['deleteGame', 'deleteSession', 'deleteSeries'])

// 统一记录 IPC 失败；错误原样抛回渲染进程，保持现有错误提示。
function handle(channel: string, handler: InvokeHandler) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      const result = await handler(event, ...args)
      if (DESTRUCTIVE_CHANNELS.has(channel)) {
        logger.info('ipc', channel, { ...describeCall(channel, args), result })
      }
      return result
    } catch (error) {
      const data = { ...describeCall(channel, args), error }
      if (isUserError(error)) logger.warn('ipc', channel, data)
      else logger.error('ipc', channel, data)
      throw error
    }
  })
}

function clipText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  return value.length > 80 ? `${value.slice(0, 80)}…` : value
}

function field(value: unknown, key: string): unknown {
  return value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined
}

// 只记录排障所需字段；设置值和导入原文可能含 Token 或个人数据，禁止落盘。
function describeCall(channel: string, args: unknown[]): Record<string, unknown> {
  switch (channel) {
    case 'setSetting':
      return { key: args[0] }
    case 'importSessions':
      return { gameId: args[0], textLength: typeof args[1] === 'string' ? args[1].length : undefined }
    case 'addGame':
      return { originalTitle: clipText(field(args[0], 'originalTitle')) }
    case 'updateGame':
      return { gameId: field(args[0], 'id') }
    case 'addSession':
      return { gameId: field(args[0], 'gameId') }
    case 'updateSession':
      return { sessionId: field(args[0], 'id'), gameId: field(args[0], 'gameId') }
    case 'updateCharacters':
      return { gameId: args[0], count: Array.isArray(args[1]) ? args[1].length : undefined }
    case 'updateMedia':
      return { gameId: args[0], type: args[1] }
    case 'searchGames':
      return { source: args[0], keyword: clipText(args[1]) }
    case 'fetchGame':
    case 'buildGame':
      return { source: args[0], sourceId: args[1] }
    case 'fetchGameSection':
      return { gameId: args[0], section: args[1], source: args[2] }
    case 'updateRouteStatus':
      return { gameId: args[0], routeId: args[1] }
    case 'assignTagToRoute':
    case 'getGameRouteTree':
    case 'saveGameRouteTree':
    case 'fetchGameScores':
    case 'stopGame':
    case 'getGameSessions':
      return { gameId: args[0] }
    case 'launchGame':
      return { gameId: args[0], exePath: args[1] }
    case 'deleteGame':
    case 'getGame':
    case 'deleteSession':
      return { id: args[0] }
    case 'deleteSeries':
      return { name: args[0] }
    case 'openFolder':
      return { path: args[0] }
    default:
      return {}
  }
}

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
  handle('openFolder', async (_, exePath: string) => {
    return openFolder(exePath)
  })
}

export function registerClipboardIPC() {
  handle('clipboard:writeText', (_, text: string) => {
    if (typeof text !== 'string') throw new UserError('Invalid clipboard text')
    clipboard.writeText(text)
  })
}

export function registerLogIPC() {
  handle('logs:openFolder', async () => {
    const dir = getLogDir()
    fs.mkdirSync(dir, { recursive: true })
    const error = await shell.openPath(dir)
    if (error) throw new Error(error)
    return { success: true }
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
  handle('addGame', (_, newgame: NewGame) => {
    return gameService.addGame(newgame)
  })
  handle('deleteGame', (_, id: string) => {
    return gameService.deleteGame(id)
  })
  handle('getGame', (_, id: string) => {
    return gameService.getGame(id)
  })
  handle('getAllGames', () => {
    return gameService.getAllGames()
  })
  handle('updateGame', (_, game: Game) => {
    return gameService.updateGame(game)
  })
  handle('updateCharacters', (_, gameId: string, characters) => {
    if (typeof gameId !== 'string' || !gameId || !Array.isArray(characters)) {
      throw new UserError('Invalid character update request')
    }
    return gameService.updateCharacters(gameId, characters)
  })
  handle('updateMedia', (_, gameId: string, type: 'cover' | 'banner' | 'icon', sourcePath: string) => {
    return gameService.updateMedia(gameId, type, sourcePath)
  })
  handle('renameSeries', (_, oldName: string, newName: string) => {
    if (typeof oldName !== 'string' || typeof newName !== 'string' || !oldName.trim() || !newName.trim()) {
      throw new UserError('Invalid series rename request')
    }
    return gameService.renameSeries(oldName, newName)
  })
  handle('deleteSeries', (_, name: string) => {
    if (typeof name !== 'string' || !name.trim()) {
      throw new UserError('Invalid series delete request')
    }
    return gameService.deleteSeries(name)
  })
  // Session
  handle('getGameSessions', (_, gameid: string) => {
    return sessionService.getGameSessions(gameid)
  })
  handle('addSession', (_, session: Session) => {
    return sessionService.addSession(session)
  })
  handle('deleteSession', (_, id: string) => {
    return sessionService.deleteSession(id)
  })
  handle('updateSession', (_, session: Session) =>{
    return sessionService.updateSession(session)
  })
  handle('importSessions', (_, gameId: string, text: string) => {
    return sessionImportService.import(gameId, text)
  })
  handle('assignTagToRoute', (_, gameId: string, tag: string, routeId: string) => {
    return sessionService.assignTagToRoute(gameId, tag, routeId)
  })
  // Route
  handle('getGameRouteTree', (_, gameId: string) => {
    if (typeof gameId !== 'string' || !gameId) throw new UserError('Invalid game id')
    return routeTreeService.get(gameId)
  })
  handle('saveGameRouteTree', (_, gameId: string, routes: Route[], tree: RouteTree, resetLockIds: string[] = []) => {
    if (typeof gameId !== 'string' || !gameId) throw new UserError('Invalid game id')
    return routeTreeService.save(gameId, routes, tree, resetLockIds)
  })
  handle('updateRouteStatus', (_, gameId: string, routeId: string, status: RouteStatus) => {
    return routeService.updateRouteStatus(gameId, routeId, status)
  })
}


export function registerLaunchIPC() {  
  handle('launchGame', async (_, gameId: string, exePath: string) => {
    return launchGame(gameId, exePath)
  })

  handle('stopGame', async (_, gameId: string, exePath: string) => {
    return stopGame(gameId, exePath)
  })
}

export function registerSettingsIPC(voiceActorAliasService: VoiceActorAliasService) {
  handle('getSettings', () => {
    return getSettings()
  })
  handle('getSetting', (_, key: keyof Settings) => {
    return getSetting(key)
  })
  handle('setSetting', (_, key: keyof Settings, value: any) => {
    return setSetting(key, value)
  })
  handle('openVoiceActorAliasesFile', () => {
    return voiceActorAliasService.openFile()
  })
}

export function registerProviderIPC(gameService: GameService) {
  handle('searchGames', async (_, source: unknown, keyword: unknown) => {
    const provider = requireProviderSource(source)
    if (typeof keyword !== 'string') {
      throw new UserError('Invalid search request')
    }
    return await searchGames(provider, keyword)
  })
  handle('fetchGame', async (_, source: unknown, subjectId: unknown) => {
    const provider = requireProviderSource(source)
    if (typeof subjectId !== 'string' || !subjectId.trim()) {
      throw new UserError('Invalid game lookup request')
    }
    return await fetchGame(provider, subjectId)
  })
  handle('buildGame', async (_, source: unknown, sourceId: unknown) => {
    const provider = requireProviderSource(source)
    if (typeof sourceId !== 'string' || !sourceId.trim()) {
      throw new UserError('Invalid build game request')
    }
    return await buildGame(provider, sourceId)
  })
  handle('fetchGameSection', async (_, gameId: unknown, section: unknown, source: unknown) => {
    if (
      typeof gameId !== 'string' ||
      !gameId ||
      typeof section !== 'string' ||
      !isGameMetadataSection(section)
    ) {
      throw new UserError('Invalid metadata section request')
    }
    const provider = requireProviderSource(source)
    return gameService.fetchMetadataSection(gameId, section, provider)
  })
  handle('fetchGameScores', async (_, gameId: unknown) => {
    if (typeof gameId !== 'string' || !gameId) {
      throw new UserError('Invalid game scores request')
    }
    return gameService.fetchExternalScores(gameId)
  })
}

export function registerBackupIPC(backupService: BackupService) {
  handle('backup:export', async (event): Promise<BackupExportResult> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options = {
      title: '导出备份',
      defaultPath: path.join(app.getPath('documents'), backupFileName(new Date())),
      filters: [{ name: 'Vexus 备份', extensions: ['zip'] }]
    }
    const result = win
      ? await dialog.showSaveDialog(win, options)
      : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return { canceled: true }

    const exported = await backupService.export(result.filePath, progress => {
      if (event.sender.isDestroyed()) return
      try {
        event.sender.send('backup:progress', progress)
      } catch {
        // 窗口在导出期间关闭时忽略进度发送失败。
      }
    })
    logger.info('backup', 'export completed', { bytes: exported.bytes, path: exported.path })
    return { canceled: false, path: exported.path, bytes: exported.bytes }
  })
}

function backupFileName(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `Vexus-Backup-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.zip`
}

function isGameMetadataSection(value: string): value is GameMetadataSection {
  return (GAME_METADATA_SECTIONS as readonly string[]).includes(value)
}

function isProviderSource(value: string): value is ProviderSource {
  return value === 'bangumi' || value === 'vndb'
}

function requireProviderSource(value: unknown): ProviderSource {
  if (typeof value !== 'string' || !isProviderSource(value)) {
    throw new UserError('Invalid provider source')
  }
  return value
}

// src/main/main.ts
// import 'dotenv/config' // 创建环境变量
import { app, BrowserWindow, dialog, Menu, nativeImage, protocol, Tray } from 'electron';
import { createWindow } from './window';
import { registerWindowIPC, registerDBIPC, registerLaunchIPC, registerProviderIPC, registerSettingsIPC, registerFileIPC, registerClipboardIPC, registerBackupIPC, registerLogIPC } from './ipc';
import Database from 'better-sqlite3'
import { initDatabase } from './database/index'
import { GameRepository } from './database/game.repo'
import { GameService } from './database/game.service'
import { MediaService } from './services/media'
import * as fs from 'fs'
import * as path from 'path'
import { SessionService } from './database/session.service';
import { SessionRepository } from './database/session.repo';
import { container } from './container';
import { getProxyAgent } from './settings';
import { SessionImportService } from './services/sessionImport';
import { RouteRepository } from './database/route.repo';
import { RouteService } from './database/route.service';
import { RouteTreeFileStore } from './services/routeTreeFile';
import { RouteTreeService } from './services/routeTree';
import { VoiceActorAliasService } from './services/voiceActorAlias';
import { BackupService } from './services/backup';
import { getLogDir, initLogger, logger } from './logger';

initLogger()

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function handleFatal(context: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  logger.fatal('app', context, error)
  try {
    dialog.showErrorBox('Vexus 发生错误', `${context}\n\n${message}\n\n日志目录：${getLogDir()}`)
  } catch {
    // 对话框无法显示时日志仍已同步落盘，继续退出即可。
  }
  app.exit(1)
}

process.on('uncaughtException', error => {
  handleFatal('主进程发生未捕获异常，Vexus 即将退出', error)
})
process.on('unhandledRejection', reason => {
  logger.error('process', 'unhandled rejection', reason)
})

app.on('child-process-gone', (_event, details) => {
  logger.error('process', 'child process gone', details)
})
app.on('render-process-gone', (_event, webContents, details) => {
  logger.error('renderer', 'render process gone', { url: webContents.getURL(), ...details })
})
app.on('web-contents-created', (_event, contents) => {
  contents.on('preload-error', (_event, preloadPath, error) => {
    logger.error('renderer', 'preload failed', { preloadPath, error })
  })
  contents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    // -3 是主动取消导航（ERR_ABORTED），不算加载失败。
    if (!isMainFrame || errorCode === -3) return
    logger.error('renderer', 'page load failed', { errorCode, errorDescription, url: validatedURL })
  })
  contents.on('console-message', details => {
    // 渲染进程的未捕获异常和 Vue 错误最终都会落到 console.error。
    if (details.level !== 'error') return
    // IPC 失败已在主进程按通道记录，跳过渲染进程的二次包装。
    if (details.message.includes('Error invoking remote method')) return
    logger.error('renderer-console', details.message, {
      source: details.sourceId,
      line: details.lineNumber
    })
  })
  contents.on('unresponsive', () => logger.warn('renderer', 'window unresponsive'))
})

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function createTray() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.ico')
    : path.join(app.getAppPath(), 'build', 'icon.ico')
  const icon = nativeImage.createFromPath(iconPath)
  if (icon.isEmpty()) {
    logger.warn('tray', 'icon not found', { iconPath })
    return
  }

  tray = new Tray(icon)
  tray.setToolTip('Vexus')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示 Vexus', click: showMainWindow },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ]))
  tray.on('click', showMainWindow)
}

app.on('second-instance', () => {
  logger.info('app', 'second instance launched; focusing existing window')
  showMainWindow()
})
app.on('before-quit', () => {
  isQuitting = true
  logger.info('app', 'quitting')
})

async function bootstrap() {
  // 单实例：第二次启动时唤起已有窗口，避免两个进程同时写 SQLite。
  if (!app.requestSingleInstanceLock()) {
    logger.info('app', 'another instance is running; quitting')
    app.quit()
    return
  }

  logger.info('app', 'starting', {
    version: app.getVersion(),
    packaged: app.isPackaged,
    electron: process.versions.electron,
    userData: app.getPath('userData')
  })

  // 初始化数据库和服务
  const dbPath = path.join(app.getPath('userData'), 'vexus.db')
  const db = new Database(dbPath)
  initDatabase(db)
  logger.info('db', 'database ready', { path: dbPath })
  
  const mediaService = new MediaService(getProxyAgent)
  const voiceActorAliasService = new VoiceActorAliasService(
    path.join(app.getPath('userData'), 'voice-actor-aliases.json')
  )

  const gameRepo = new GameRepository(db)
  const gameService = new GameService(gameRepo, mediaService, voiceActorAliasService)
  const routeRepo = new RouteRepository(db)
  const routeService = new RouteService(routeRepo)
  const routeTreeService = new RouteTreeService(
    routeService,
    new RouteTreeFileStore(path.join(app.getPath('userData'), 'route-trees'))
  )
  const sessionRepo = new SessionRepository(db)
  const sessionService = new SessionService(sessionRepo, routeRepo)
  const sessionImportService = new SessionImportService(sessionService)
  const backupService = new BackupService(db, app.getPath('userData'), app.getVersion())
  container.register('sessionService', sessionService)
  container.register('routeRepo', routeRepo)
  // 注册自定义协议用于加载媒体文件
  const mediaDir = path.join(app.getPath('userData'), 'media')
  protocol.handle('vexus-media', async (request) => {
    const relativePath = request.url.replace('vexus-media://', '')
    const filePath = path.resolve(mediaDir, relativePath)
    // 校验解析后的路径，阻止 ../ 逃逸出媒体目录
    if (!filePath.startsWith(mediaDir + path.sep)) {
      return new Response(null, { status: 404 })
    }
    try {
      return new Response(await fs.promises.readFile(filePath), {
        headers: {
          'Content-Type': 'image/webp',
          // 媒体文件名不复用，可长期缓存；再次展示封面时无需重新读盘。
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      })
    } catch (error) {
      logger.debug('media', 'media file not served', { relativePath, error })
      return new Response(null, { status: 404 })
    }
  })

  // 创建主窗口
  const win = createWindow()
  mainWindow = win
  createTray()
  // 关闭按钮只隐藏到托盘，真正退出走托盘菜单。
  win.on('close', event => {
    if (isQuitting || !tray) return
    event.preventDefault()
    win.hide()
  })

  // 注册 IPC 处理器
  registerWindowIPC(win)  // Register IPC handlers for the window
  registerDBIPC(gameService, sessionService, sessionImportService, routeService, routeTreeService) // Register database-related IPC handlers
  registerBackupIPC(backupService)
  registerFileIPC()
  registerClipboardIPC()
  registerLaunchIPC() // Register IPC handlers for launching games
  registerSettingsIPC(voiceActorAliasService) // Register IPC handlers for settings management
  registerProviderIPC(gameService) // Register IPC handlers for external metadata providers
  registerLogIPC()
}

app.whenReady().then(bootstrap).catch(error => {
  handleFatal('启动失败，Vexus 即将退出', error)
})


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});



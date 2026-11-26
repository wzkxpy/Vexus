// src/main/main.ts
// import 'dotenv/config' // 创建环境变量
import { app, BrowserWindow, Menu, nativeImage, protocol, Tray } from 'electron';
import { createWindow } from './window';
import { registerWindowIPC, registerDBIPC, registerLaunchIPC, registerProviderIPC, registerSettingsIPC, registerFileIPC, registerClipboardIPC } from './ipc';
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

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

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
    console.warn('[Tray] icon not found:', iconPath)
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

app.on('second-instance', showMainWindow)
app.on('before-quit', () => {
  isQuitting = true
})

app.whenReady().then(() => {
  // 单实例：第二次启动时唤起已有窗口，避免两个进程同时写 SQLite。
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return
  }

  // 初始化数据库和服务
  const dbPath = path.join(app.getPath('userData'), 'vexus.db')
  const db = new Database(dbPath)
  initDatabase(db)
  
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
    } catch {
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
  registerFileIPC()
  registerClipboardIPC()
  registerLaunchIPC() // Register IPC handlers for launching games
  registerSettingsIPC(voiceActorAliasService) // Register IPC handlers for settings management
  registerProviderIPC(gameService) // Register IPC handlers for external metadata providers
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});



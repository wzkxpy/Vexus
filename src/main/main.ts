// src/main/main.ts
// import 'dotenv/config' // 创建环境变量
import { app, protocol } from 'electron';
import { createWindow } from './window';
import { registerWindowIPC, registerDBIPC, registerLaunchIPC, registerProviderIPC, registerSettingsIPC, registerFileIPC } from './ipc';
import Database from 'better-sqlite3'
import { initDatabase } from './database/index'
import { GameRepository } from './database/game.repo'
import { GameService } from './database/game.service'
import { MediaService } from './services/media'
import * as path from 'path'
import { SessionService } from './database/session.service';
import { SessionRepository } from './database/session.repo';
import { container } from './container';
import { getProxyAgent } from './settings';


app.whenReady().then(() => {
  // 初始化数据库和服务
  const dbPath = path.join(app.getPath('userData'), 'vexus.db')
  const db = new Database(dbPath)
  initDatabase(db)
  
  const mediaService = new MediaService(getProxyAgent)

  const gameRepo = new GameRepository(db)
  const gameService = new GameService(gameRepo, mediaService)
  const sessionRepo = new SessionRepository(db)
  const sessionService = new SessionService(sessionRepo)
  container.register('sessionService', sessionService)
  // 注册自定义协议用于加载媒体文件
  protocol.handle('vexus-media', (request) => {
    const url = request.url.replace('vexus-media://', '')
    const filePath = path.join(app.getPath('userData'), 'media', url)
    return new Response(
      require('fs').readFileSync(filePath)
    )
  })

  // 创建主窗口
  const win = createWindow() // Create the main application window 
  // 注册 IPC 处理器
  registerWindowIPC(win)  // Register IPC handlers for the window
  registerDBIPC(gameService, sessionService) // Register database-related IPC handlers
  registerFileIPC()
  registerLaunchIPC() // Register IPC handlers for launching games
  registerSettingsIPC() // Register IPC handlers for settings management
  registerProviderIPC() // Register IPC handlers for Bangumi API interactions
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});



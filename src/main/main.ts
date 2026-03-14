import { app, protocol } from 'electron';
import { createWindow } from './window';
import { registerWindowIPC, registerDBIPC, registerLaunchIPC, registerScraperIPC } from './ipc';
import Database from 'better-sqlite3'
import { initDatabase } from './database/index'
import { GameRepository } from './database/game.repo'
import { GameService } from './database/game.service'
import * as path from 'path'
import { SessionService } from './database/session.service';
import { SessionRepository } from './database/session.repo';


app.whenReady().then(() => {
  // 初始化数据库和服务
  const dbPath = path.join(app.getPath('userData'), 'vexus.db')
  const db = new Database(dbPath)
  initDatabase(db)
  const gameRepo = new GameRepository(db)
  const gameService = new GameService(gameRepo)
  const sessionRepo = new SessionRepository(db)
  const sessionService = new SessionService(sessionRepo)
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
  registerLaunchIPC() // Register IPC handlers for launching games
  registerScraperIPC() // Register IPC handlers for Bangumi API interactions
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});



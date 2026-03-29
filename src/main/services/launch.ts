// src/main/services/launch.ts
import * as fs from 'fs'
import { spawn } from 'child_process'
import * as path from 'path'
import { shell } from 'electron'
import { GameMonitor } from './monitor'
import { container } from '../container'
import { SessionService } from '../database/session.service'
const kill = require('tree-kill')


let gameMonitor: GameMonitor | null = null

// 启动游戏
export async function launchGame(gameId: string, exePath: string) {
  if (!fs.existsSync(exePath)) {
    throw new Error('Exe file is not exist')
  }
  const child = spawn(exePath, [], {
    cwd: path.dirname(exePath),
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
  const pid = child.pid!

  const sessionService = container.get('sessionService') as SessionService
  gameMonitor = new GameMonitor(gameId, pid, sessionService)
  await gameMonitor.start()
  console.log('[Launch] start:', { gameId, pid })
  return { success: true, pid }
}

// 点击停止
export async function stopGame(gameId: string, exePath: string) {
  if (!gameMonitor) {
    throw new Error('No running game')
  }
  try {
    const pids = gameMonitor.getPidList()
    const killPid = (pid: number) => {
      return new Promise((resolve) => {
        try {
          process.kill(pid, 'SIGKILL')
          resolve(true)
        } catch (err: any) {
          if (err.code === 'ESRCH') { // 忽略 ESRCH
            resolve(true)
          } else {
            console.warn(`[Launch] failed to kill PID ${pid}:`, err.message)
            resolve(false)
          }
        }
      })
    }
    await Promise.all(pids.map(pid => killPid(pid)))
  } catch (err: any) {
    throw new Error(err.message || '停止游戏失败')
  } finally {
    gameMonitor.stop()
    gameMonitor = null
    console.log('[Launch] stop:', { gameId })
  }
  return { success: true }
}

// 在资源管理器中打开
export async function openFolder(exePath: string){
  if (!fs.existsSync(exePath)) {
      throw new Error('文件不存在')
    }
  const folderPath = path.dirname(exePath)
  await shell.openPath(folderPath)
  return { success: true }
}
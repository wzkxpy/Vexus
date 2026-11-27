// src/main/services/launch.ts
import * as fs from 'fs'
import { spawn, type ChildProcess } from 'child_process'
import * as path from 'path'
import { shell } from 'electron'
import { GameMonitor } from './monitor'
import { container } from '../container'
import { SessionService } from '../database/session.service'
import { RouteRepository } from '../database/route.repo'
import { logger } from '../logger'
import { UserError } from '../utils/errors'
const kill = require('tree-kill')


let gameMonitor: GameMonitor | null = null

function killPid(pid: number): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      process.kill(pid, 'SIGKILL')
      resolve(true)
    } catch (err: any) {
      if (err.code === 'ESRCH') { // 忽略 ESRCH
        resolve(true)
      } else {
        logger.warn('launch', 'failed to kill pid', { pid, error: err.message })
        resolve(false)
      }
    }
  })
}

// 启动游戏
export async function launchGame(gameId: string, exePath: string) {
  if (!fs.existsSync(exePath)) {
    throw new UserError('Exe file is not exist')
  }
  let child: ChildProcess
  try {
    child = spawn(exePath, [], {
      cwd: path.dirname(exePath),
      detached: true,
      stdio: 'ignore',
    })
  } catch (error) {
    // Windows 对无效可执行文件会在 spawn 调用内同步抛错，而不是触发 error 事件。
    logger.warn('launch', 'spawn failed', { gameId, exePath, error })
    throw new UserError('启动游戏失败，请检查程序路径或权限')
  }
  child.unref()

  // 'error' 是异步事件；不接住会变成全局未捕获异常并退出应用。
  let spawned = false
  await new Promise<void>((resolve, reject) => {
    child.once('spawn', () => {
      spawned = true
      resolve()
    })
    child.on('error', error => {
      if (spawned) {
        logger.warn('launch', 'process error after start', { gameId, pid: child.pid, error })
        return
      }
      logger.warn('launch', 'spawn failed', { gameId, exePath, error })
      reject(error)
    })
  }).catch(() => {
    throw new UserError('启动游戏失败，请检查程序路径或权限')
  })

  const pid = child.pid
  if (!pid) {
    logger.error('launch', 'missing pid after spawn', { gameId, exePath })
    throw new Error('启动游戏失败')
  }

  const sessionService = container.get('sessionService') as SessionService
  const routeRepo = container.get('routeRepo') as RouteRepository
  // 启动时固定归属线路，运行期间线路状态变化不追溯本次记录。
  const routeId = routeRepo.getPlayingRouteId(gameId)
  gameMonitor = new GameMonitor(gameId, pid, routeId, sessionService, routeRepo)
  await gameMonitor.start()
  logger.info('launch', 'started', { gameId, pid, routeId })
  return { success: true, pid }
}

export function isGameRunning() {
  return gameMonitor?.isActive() ?? false
}

// 退出兜底：只落库，不杀游戏，也不触发窗口通知。
export function finalizeActiveGame() {
  const monitor = gameMonitor
  if (!monitor) return
  try {
    monitor.finalize()
  } catch (error) {
    logger.error('launch', 'failed to finalize active game', error)
  } finally {
    if (gameMonitor === monitor) gameMonitor = null
  }
}

// 托盘退出时同时结束游戏：先静默落库，再杀进程，避免监控定时器在退出过程中触发通知。
export async function quitActiveGame() {
  const monitor = gameMonitor
  if (!monitor) return
  const pids = monitor.getPidList()
  try {
    monitor.finalize()
  } catch (error) {
    logger.error('launch', 'failed to finalize game on quit', error)
  } finally {
    if (gameMonitor === monitor) gameMonitor = null
  }

  try {
    await Promise.all(pids.map(killPid))
    logger.info('launch', 'quit active game')
  } catch (error) {
    logger.error('launch', 'failed to kill game on quit', error)
  }
}

// 点击停止
export async function stopGame(gameId: string, exePath: string) {
  const monitor = gameMonitor
  if (!monitor) {
    throw new UserError('No running game')
  }
  try {
    const pids = monitor.getPidList()
    await Promise.all(pids.map(killPid))
  } catch (err: any) {
    throw new Error(err.message || '停止游戏失败')
  } finally {
    try {
      monitor.stop()
    } finally {
      if (gameMonitor === monitor) gameMonitor = null
      logger.info('launch', 'stopped', { gameId })
    }
  }
  return { success: true }
}

// 在资源管理器中打开
export async function openFolder(exePath: string){
  if (!fs.existsSync(exePath)) {
      throw new UserError('文件不存在')
    }
  const folderPath = path.dirname(exePath)
  const error = await shell.openPath(folderPath)
  if (error) throw new Error(error)
  return { success: true }
}
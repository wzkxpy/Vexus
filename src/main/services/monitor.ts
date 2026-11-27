// src/main/services/monitor.ts
import { BrowserWindow } from 'electron'
import { execFile } from 'child_process'
import { Session } from '@/shared/types'
import type { SessionService } from '../database/session.service'
import type { RouteRepository } from '../database/route.repo'
import { formatLocalDate } from '../../shared/utils';
import { logger } from '../logger'

export class GameMonitor {
  private pids: Set<number> = new Set();
  private gameId: string
  private routeId: string | null
  private timer: NodeJS.Timeout | null = null
  private startedAtMs: number = 0
  private endedAtMs: number = 0
  private active = false
  private sessionService: SessionService
  private routeRepo: RouteRepository
  private readonly INTERVAL = 3000 // 监控间隔 ms

  constructor(
    gameId: string,
    pid: number,
    routeId: string | null,
    sessionService: SessionService,
    routeRepo: RouteRepository
  ) {
    this.gameId = gameId
    this.pids.add(pid)
    this.routeId = routeId
    this.sessionService = sessionService
    this.routeRepo = routeRepo
  }

  public async start() {
    if (this.active) {
      logger.warn('monitor', 'session already running', { gameId: this.gameId })
      return
    }
    this.active = true
    this.startedAtMs = Date.now() // 毫秒时间戳 number
    this.timer = setInterval(() => {
      // setInterval 不消费 checkProcess 的 Promise，必须显式接住异常。
      void this.checkProcess().catch(error => {
        logger.warn('monitor', 'process check failed', { gameId: this.gameId, error })
      })
    }, this.INTERVAL)
    logger.debug('monitor', 'started', { gameId: this.gameId, pids: this.getPidList() })
  }

  private async checkProcess() {
    if (!this.active) return;

    for (const pid of this.pids) {
      if (!this.isPidAlive(pid)) {
        this.pids.delete(pid);
        logger.info('monitor', 'pid exited; searching for heirs', { pid });

        const children = await this.findChildPids(pid).catch(error => {
          // 进程发现失败不应终止监控，最多退化为只跟踪当前 PID。
          logger.warn('monitor', 'failed to find heirs', { pid, error })
          return [] as number[]
        });
        if (children.length > 0) {
          children.forEach(childPid => {
            this.pids.add(childPid);
            logger.info('monitor', 'heir discovered', { pid: childPid });
          });
        }
      }
    }

    if (this.pids.size === 0) {
      logger.info('monitor', 'game fully exited', { gameId: this.gameId })
      this.stop();
    }
  }

  public isActive() {
    return this.active
  }

  public stop() {
    if (!this.active) return
    this.finalize()

    // 落库后再通知渲染进程，确保刷新读到的时长和线路归属已是最新。
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (!mainWindow || mainWindow.isDestroyed()) {
      logger.warn('monitor', 'no window to notify game stopped', { gameId: this.gameId })
      return
    }
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('game:stopped', { gameId: this.gameId })
  }

  // 只保存当前会话，不触碰窗口和渲染进程；用于退出应用等需要静默结束场景。
  public finalize() {
    if (!this.active) return
    this.active = false

    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    
    this.endedAtMs = Date.now()
    const duration = Math.floor((this.endedAtMs - this.startedAtMs) / 1000) // seconds
    const playDate = formatLocalDate(new Date(this.startedAtMs));
    // 线路可能在游戏运行期间被删除，保留下时长而不是让记录写入失败。
    const routeId = this.routeId && this.routeRepo.belongsToGame(this.routeId, this.gameId)
      ? this.routeId
      : null

    const session: Session = {
      id: crypto.randomUUID(),
      gameId: this.gameId,
      routeId,
      routeTag: null,
      playDate: playDate,
      duration: duration,
      startedAt: new Date(this.startedAtMs).toISOString(), // number -> ISO string
      endedAt: new Date(this.endedAtMs).toISOString(),
      source: 'auto'
    }
    try {
      this.sessionService.addSession(session)
      logger.info('playtime', 'session saved', {
        gameId: this.gameId,
        routeId,
        playDate: playDate,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        duration
      })
    } catch (error) {
      // 落库失败仍要通知渲染进程，避免界面一直停留在“运行中”。
      logger.error('playtime', 'session save failed', {
        gameId: this.gameId,
        routeId,
        playDate: playDate,
        duration,
        error
      })
    }
  }

  private isPidAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
  
  // ps-tree 依赖已被新版 Windows 移除的 wmic.exe，改用 PowerShell CIM 枚举进程表。
  private findChildPids(pid: number): Promise<number[]> {
    const command = 'Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId | Select-Object ProcessId,ParentProcessId | ConvertTo-Json -Compress'
    return new Promise((resolve, reject) => {
      execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024
      }, (error, stdout, stderr) => {
        if (error) {
          // PowerShell 的 stderr 比通用错误消息更能说明失败原因。
          const detail = stderr.trim()
          if (detail) error.message = `${error.message}：${detail}`
          reject(error)
          return
        }
        try {
          const parsed = JSON.parse(stdout || '[]')
          const rows = (Array.isArray(parsed) ? parsed : [parsed]) as Array<{
            ProcessId: number
            ParentProcessId: number
          }>
          const childrenByParent = new Map<number, number[]>()
          for (const row of rows) {
            const siblings = childrenByParent.get(row.ParentProcessId)
            if (siblings) siblings.push(row.ProcessId)
            else childrenByParent.set(row.ParentProcessId, [row.ProcessId])
          }
          const descendants: number[] = []
          const queue = [...(childrenByParent.get(pid) ?? [])]
          const seen = new Set(queue)
          for (let index = 0; index < queue.length; index += 1) {
            const child = queue[index]
            descendants.push(child)
            for (const grandchild of childrenByParent.get(child) ?? []) {
              if (!seen.has(grandchild)) {
                seen.add(grandchild)
                queue.push(grandchild)
              }
            }
          }
          resolve(descendants)
        } catch (parseError) {
          reject(parseError)
        }
      })
    })
  }

  public getPidList() {
    return Array.from(this.pids)
  }
}

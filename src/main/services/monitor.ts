// src/main/services/monitor.ts
import { BrowserWindow } from 'electron'
const psTree = require('ps-tree')
import { Session } from '@/shared/types'
import type { SessionService } from '../database/session.service'
import { formatLocalDate } from '../../shared/utils';

export class GameMonitor {
  private pids: Set<number> = new Set();
  private gameId: string
  private timer: NodeJS.Timeout | null = null
  private startTime: number = 0
  private endTime: number = 0
  private active = false
  private sessionService: SessionService
  private readonly INTERVAL = 3000 // 监控间隔 ms

  constructor(gameId: string, pid: number, sessionService: SessionService) {
    this.gameId = gameId
    this.pids.add(pid)
    this.sessionService = sessionService
  }

  public async start() {
    if (this.active) {
      console.warn('[Monitor] session already running')
      return
    }
    this.active = true
    this.startTime = Date.now()
    this.timer = setInterval(() => this.checkProcess(), this.INTERVAL)
    console.log('[Monitor] started:', { gameId: this.gameId, pids: this.getPidList() })
  }

  private async checkProcess() {
    if (!this.active) return;
    console.log(this.pids);
    
    for (const pid of this.pids) {
      if (!this.isPidAlive(pid)) {
        this.pids.delete(pid);
        console.log(`[Monitor] PID ${pid} exited, searching for heirs...`);
        
        const children = await this.findChildPids(pid);
        if (children.length > 0) {
          children.forEach(childPid => {
            this.pids.add(childPid);
            console.log(`[Monitor] New heir found: ${childPid}`);
          });
        }
      }
    }

    if (this.pids.size === 0) {
      console.log('[Monitor] game fully exit')
      this.stop();
    }
  }

  public stop() {
    if (!this.active) return
    this.active = false

    // Send stop signal to renderer
    const mainWindow = BrowserWindow.getAllWindows()[0]
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('game:stopped', { gameId: this.gameId })

    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    
    this.endTime = Date.now()
    const duration = Math.floor((this.endTime - this.startTime) / 1000) // seconds
    const playDate = formatLocalDate(new Date(this.startTime));

    console.log('[Playtime] save:', {
      gameId: this.gameId,
      playDate: playDate,
      startTime: new Date(this.startTime).toLocaleTimeString('zh-CN', { hour12: false }),
      endTime: new Date(this.endTime).toLocaleTimeString('zh-CN', { hour12: false }),
      duration
    })

    this.sessionService.addSession({
      id: crypto.randomUUID(),
      gameId: this.gameId,
      routeId: null,
      playDate: playDate,
      duration: duration,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date(this.endTime).toISOString(),
      autoRecord: true
    } as Session)
  }

  private isPidAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
  
  private findChildPids(pid: number): Promise<number[]> {
    return new Promise((resolve, reject) => {
      psTree(pid, (err: any, children: any[]) => {
        if (err) {
          reject(err)
        } else {
          const childPids = children.map((p: any) => parseInt(p.PID))
          resolve(childPids)
        }
      })
    })
  }

  public getPidList() {
    return Array.from(this.pids)
  }
}
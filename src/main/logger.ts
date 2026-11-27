// src/main/logger.ts
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50
}
const RETENTION_DAYS = 7
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_MESSAGE_CHARS = 4000
const MAX_DATA_CHARS = 8000
const LOG_FILE_PATTERN = /^vexus-\d{4}-\d{2}-\d{2}(?:\.1)?\.log$/

let initialized = false
let logDir = ''
let minLevel: LogLevel = 'info'
let fileWriteFailed = false

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0')
}

function timestamp(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function resolveMinLevel(): LogLevel {
  const configured = process.env.VEXUS_LOG_LEVEL?.toLowerCase()
  if (configured === 'debug' || configured === 'info' || configured === 'warn' || configured === 'error') {
    return configured
  }
  return 'info'
}

function safeStringify(value: unknown): string | undefined {
  try {
    const seen = new WeakSet<object>()
    return JSON.stringify(value, (_key, item) => {
      if (item instanceof Error) {
        const error = item as Error & { code?: string }
        return { name: error.name, message: error.message, stack: error.stack, code: error.code }
      }
      if (typeof item === 'bigint') return item.toString()
      if (typeof item === 'object' && item !== null) {
        if (seen.has(item)) return '[Circular]'
        seen.add(item)
      }
      return item
    })
  } catch {
    return undefined
  }
}

function cleanupOldLogs() {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(logDir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (!entry.isFile() || !LOG_FILE_PATTERN.test(entry.name)) continue
    const filePath = path.join(logDir, entry.name)
    try {
      if (fs.statSync(filePath).mtimeMs < cutoff) fs.rmSync(filePath, { force: true })
    } catch {
      // 清理失败不影响本次运行，下次启动再试。
    }
  }
}

// 单日文件超过上限时只保留一代溢出文件，避免异常循环写满磁盘。
function rotateIfNeeded(filePath: string) {
  try {
    if (fs.statSync(filePath).size <= MAX_FILE_BYTES) return
    const overflowPath = filePath.replace(/\.log$/, '.1.log')
    fs.rmSync(overflowPath, { force: true })
    fs.renameSync(filePath, overflowPath)
  } catch {
    // 文件尚不存在或正被占用时保持原状。
  }
}

function mirrorToConsole(level: LogLevel, line: string) {
  if (app.isPackaged) return
  if (level === 'error' || level === 'fatal') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

function write(level: LogLevel, tag: string, message: string, data?: unknown) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return
  if (!initialized) initLogger()

  const serialized = data === undefined ? undefined : safeStringify(data)
  // 渲染进程日志和异常对象可能非常大，截断避免单条日志失控。
  const clippedData = serialized !== undefined && serialized.length > MAX_DATA_CHARS
    ? `${serialized.slice(0, MAX_DATA_CHARS)}…[truncated]`
    : serialized
  const suffix = clippedData === undefined ? '' : ` ${clippedData}`
  const text = message.length > MAX_MESSAGE_CHARS
    ? `${message.slice(0, MAX_MESSAGE_CHARS)}…[truncated]`
    : message
  const line = `${timestamp(new Date())} [${level.toUpperCase()}] [${tag}] ` +
    `${text.replace(/\r?\n/g, '\\n')}${suffix}`

  mirrorToConsole(level, line)
  if (!logDir) return

  try {
    const filePath = path.join(logDir, `vexus-${dateKey(new Date())}.log`)
    rotateIfNeeded(filePath)
    // 同步追加：日志量低，换取崩溃时最后几行不会丢失。
    fs.appendFileSync(filePath, `${line}\n`, 'utf8')
    fileWriteFailed = false
  } catch (error) {
    if (!fileWriteFailed) {
      fileWriteFailed = true
      console.error('[logger] failed to write log file', error)
    }
  }
}

export function initLogger(): string {
  if (initialized) return logDir
  initialized = true
  logDir = path.join(app.getPath('userData'), 'logs')
  minLevel = resolveMinLevel()
  try {
    fs.mkdirSync(logDir, { recursive: true })
    cleanupOldLogs()
  } catch (error) {
    console.error('[logger] failed to initialize log directory', error)
  }
  return logDir
}

export function getLogDir(): string {
  if (!initialized) initLogger()
  return logDir
}

export const logger = {
  debug(tag: string, message: string, data?: unknown) {
    write('debug', tag, message, data)
  },
  info(tag: string, message: string, data?: unknown) {
    write('info', tag, message, data)
  },
  warn(tag: string, message: string, data?: unknown) {
    write('warn', tag, message, data)
  },
  error(tag: string, message: string, data?: unknown) {
    write('error', tag, message, data)
  },
  fatal(tag: string, message: string, data?: unknown) {
    write('fatal', tag, message, data)
  }
}
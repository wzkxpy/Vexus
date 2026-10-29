import { randomUUID } from 'node:crypto'
import type { Session } from '@/shared/types'
import { SESSION_EXPORT_FORMAT, SESSION_EXPORT_VERSION } from '@/shared/sessionExport'

const MAX_SESSION_SECONDS = 86400

export function parseVexusSessions(gameId: string, value: Record<string, unknown>): Session[] {
  if (value.format !== SESSION_EXPORT_FORMAT) {
    throw new Error('导出格式标识无效')
  }
  if (value.version !== SESSION_EXPORT_VERSION) {
    throw new Error('不支持的导出格式版本')
  }
  if (!Array.isArray(value.sessions)) {
    throw new Error('sessions 必须是数组')
  }

  const sessions = value.sessions.map((item, index): Session => {
    const label = `第 ${index + 1} 条记录`
    if (!isRecord(item)) throw new Error(`${label}格式无效`)

    const date = item.date
    if (typeof date !== 'string' || !isValidDateOnly(date)) {
      throw new Error(`${label}包含无效日期`)
    }
    const duration = item.duration
    if (
      typeof duration !== 'number'
      || !Number.isInteger(duration)
      || duration <= 0
      || duration > MAX_SESSION_SECONDS
    ) {
      throw new Error(`${label}的时长必须是 1 到 86400 之间的整数秒`)
    }

    const startedAt = item.startedAt
    const endedAt = item.endedAt
    if (startedAt !== null && typeof startedAt !== 'string') {
      throw new Error(`${label}的开始时间无效`)
    }
    if (endedAt !== null && typeof endedAt !== 'string') {
      throw new Error(`${label}的结束时间无效`)
    }
    if ((startedAt === null) !== (endedAt === null)) {
      throw new Error(`${label}的开始和结束时间必须同时存在`)
    }
    if (startedAt !== null && endedAt !== null) {
      const start = Date.parse(startedAt)
      const end = Date.parse(endedAt)
      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        throw new Error(`${label}包含无效时间`)
      }
      if (end <= start) {
        throw new Error(`${label}的结束时间必须晚于开始时间`)
      }
    }

    const rawTag = item.tag
    if (rawTag !== null && typeof rawTag !== 'string') {
      throw new Error(`${label}的线路标签无效`)
    }
    const tag = typeof rawTag === 'string' ? rawTag.trim() : null
    if (tag && tag.length > 80) {
      throw new Error(`${label}的线路标签过长`)
    }

    return {
      id: randomUUID(),
      gameId,
      routeId: null,
      routeTag: tag || null,
      playDate: date,
      startedAt,
      endedAt,
      duration,
      source: 'import'
    }
  })

  if (sessions.length === 0) throw new Error('没有可导入的游玩记录')
  return sessions
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

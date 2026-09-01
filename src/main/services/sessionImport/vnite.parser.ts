import { randomUUID } from 'node:crypto'
import type { Session } from '@/shared/types'
import { formatLocalDate } from '@/shared/utils'

const MAX_SESSION_SECONDS = 86400

export function parseVniteSessions(gameId: string, value: Record<string, unknown>): Session[] {
  const timers = readArray(value, 'timers')
  const dailyPlayTimes = readArray(value, 'dailyPlayTimes')
  if (timers === null || dailyPlayTimes === null) {
    throw new Error('必须同时包含 timers 和 dailyPlayTimes 数组')
  }

  const sessions: Session[] = []
  const timerRanges: Array<{ start: number; end: number }> = []
  const timerKeys = new Set<string>()

  for (const [index, item] of (timers ?? []).entries()) {
    if (!isRecord(item) || typeof item.start !== 'string' || typeof item.end !== 'string') {
      throw new Error(`第 ${index + 1} 条时间区间缺少有效的 start 或 end`)
    }

    const start = Date.parse(item.start)
    const end = Date.parse(item.end)
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new Error(`第 ${index + 1} 条时间区间包含无效时间`)
    }
    if (end <= start) {
      throw new Error(`第 ${index + 1} 条时间区间的结束时间必须晚于开始时间`)
    }

    const duration = Math.round((end - start) / 1000)
    validateDuration(duration, `第 ${index + 1} 条时间区间`)

    const startedAt = new Date(start).toISOString()
    const endedAt = new Date(end).toISOString()
    const key = `${startedAt}|${endedAt}`
    if (timerKeys.has(key)) throw new Error(`第 ${index + 1} 条时间区间重复`)
    if (timerRanges.some(range => start < range.end && end > range.start)) {
      throw new Error(`第 ${index + 1} 条时间区间与其他记录重叠`)
    }

    timerKeys.add(key)
    timerRanges.push({ start, end })
    sessions.push({
      id: randomUUID(),
      gameId,
      routeId: null,
      playDate: formatLocalDate(new Date(start)),
      startedAt,
      endedAt,
      duration,
      autoRecord: false
    })
  }

  for (const [index, item] of (dailyPlayTimes ?? []).entries()) {
    if (!isRecord(item) || typeof item.date !== 'string' || typeof item.playTime !== 'number') {
      throw new Error(`第 ${index + 1} 条每日时长格式无效`)
    }
    if (!isValidDateOnly(item.date)) {
      throw new Error(`第 ${index + 1} 条每日时长包含无效日期`)
    }
    if (!Number.isFinite(item.playTime) || item.playTime < 0) {
      throw new Error(`第 ${index + 1} 条每日时长必须是非负有限数值`)
    }

    const duration = Math.round(item.playTime / 1000)
    validateDuration(duration, `第 ${index + 1} 条每日时长`)
    sessions.push({
      id: randomUUID(),
      gameId,
      routeId: null,
      playDate: item.date,
      startedAt: null,
      endedAt: null,
      duration,
      autoRecord: false
    })
  }

  if (sessions.length === 0) throw new Error('没有可导入的游玩记录')
  return sessions
}


function readArray(value: Record<string, unknown>, key: string): unknown[] | null {
  if (!(key in value)) return null
  if (!Array.isArray(value[key])) throw new Error(`${key} 必须是数组`)
  return value[key]
}

function validateDuration(duration: number, label: string) {
  if (duration <= 0 || duration > MAX_SESSION_SECONDS) {
    throw new Error(`${label}的时长必须大于 0 且不超过 24 小时`)
  }
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

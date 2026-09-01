import { randomUUID } from 'node:crypto'
import type { Session } from '@/shared/types'

export function parsePotatoVNSessions(
  gameId: string,
  value: Record<string, unknown>
): Session[] {
  const playedTime = value.PlayedTime
  if (!isRecord(playedTime)) {
    throw new Error('PlayedTime 必须是日期与分钟数的对象')
  }

  const sessions = Object.entries(playedTime).map(([date, minutes]) => {
    const playDate = normalizeDate(date)
    if (!playDate) throw new Error(`PotatoVN 日期无效：${date}`)
    if (
      typeof minutes !== 'number'
      || !Number.isFinite(minutes)
      || !Number.isInteger(minutes)
      || minutes <= 0
    ) {
      throw new Error(`${date} 的分钟数必须是正整数`)
    }
    
    const duration = minutes * 60
    if (duration > 86400) {
      throw new Error(`${date} 的时长不能超过 24 小时`)
    }

    return {
      id: randomUUID(),
      gameId,
      routeId: null,
      playDate,
      startedAt: null,
      endedAt: null,
      duration,
      source: 'import'
    } satisfies Session
  })

  if (sessions.length === 0) throw new Error('没有可导入的游玩记录')
  return sessions
}

// 将 PotatoVN 的日期格式 YYYY/MM/DD 转换为 YYYY-MM-DD
function normalizeDate(value: string): string | null {
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

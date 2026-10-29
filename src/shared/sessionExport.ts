import type { Route, Session } from './types'

export const SESSION_EXPORT_FORMAT = 'vexus-playtime'
export const SESSION_EXPORT_VERSION = 2

export interface SessionExportEntry {
  date: string
  duration: number
  startedAt: string | null
  endedAt: string | null
  tag: string | null
}

export interface SessionExportFile {
  format: typeof SESSION_EXPORT_FORMAT
  version: number
  exportedAt: string
  sessions: SessionExportEntry[]
}

export function buildSessionExport(sessions: Session[], routes: Route[], now = new Date()): string {
  const routeNames = new Map(routes.map(route => [route.id, route.name]))
  const payload: SessionExportFile = {
    format: SESSION_EXPORT_FORMAT,
    version: SESSION_EXPORT_VERSION,
    exportedAt: now.toISOString(),
    // 0 秒记录没有导出价值，且导入格式要求正时长。
    sessions: sessions
      .filter(session => session.duration > 0)
      .map(session => ({
        date: session.playDate,
        duration: session.duration,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        // 已绑定记录使用当前线路名，待绑定记录使用导入/删线时保留的标签。
        tag: session.routeId
          ? routeNames.get(session.routeId) ?? session.routeTag
          : session.routeTag
      }))
  }
  return JSON.stringify(payload, null, 2)
}

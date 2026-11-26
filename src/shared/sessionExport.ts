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

// 同名线路按出现顺序追加序号，导出后仍能从标签区分每条线路。
function buildRouteTags(routes: Route[]): Map<string, string> {
  const totals = new Map<string, number>()
  for (const route of routes) totals.set(route.name, (totals.get(route.name) ?? 0) + 1)

  const seen = new Map<string, number>()
  const tags = new Map<string, string>()
  for (const route of routes) {
    const index = (seen.get(route.name) ?? 0) + 1
    seen.set(route.name, index)
    tags.set(route.id, (totals.get(route.name) ?? 0) > 1 ? `${route.name} ${index}` : route.name)
  }
  return tags
}

export function buildSessionExport(sessions: Session[], routes: Route[], now = new Date()): string {
  const routeTags = buildRouteTags(routes)
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
          ? routeTags.get(session.routeId) ?? session.routeTag
          : session.routeTag
      }))
  }
  return JSON.stringify(payload, null, 2)
}

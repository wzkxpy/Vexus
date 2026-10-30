// src/shared/types/route.ts

export interface Route {
  id: string
  gameId: string

  name: string
  description: string | null
  color: string

  type: RouteType

  lockCondition: RouteLockCondition | null
  status: RouteStatus
  playtime: number
}

// 线路类型的唯一配置来源；RouteType 和界面选项均由此生成。
export const ROUTE_TYPE_OPTIONS = [
  { value: 'common', label: '共通线', isMain: true },
  { value: 'chapter', label: '章节', isMain: true },
  { value: 'character', label: '个人线', isMain: false },
  { value: 'main', label: '主线', isMain: true }
] as const

export type RouteType = typeof ROUTE_TYPE_OPTIONS[number]['value']

// 剧情锁
export interface RouteLockCondition {
  unlocked: boolean
  mode: 'all' | 'any'
  preRouteIds: string[]
}

export type RouteStatus =
  | 'NotStarted'
  | 'Playing'
  | 'OnHold'
  | 'Completed'

export const ROUTE_STATUS_OPTIONS = [
  { value: 'NotStarted', label: '未开始' },
  { value: 'Playing', label: '游玩中' },
  { value: 'OnHold', label: '搁置中' },
  { value: 'Completed', label: '已完成' }
] as const satisfies ReadonlyArray<{ value: RouteStatus; label: string }>

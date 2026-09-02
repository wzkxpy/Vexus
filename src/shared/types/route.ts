// src/shared/types/route.ts

export interface Route {
  id: string
  gameId: string

  name: string
  description?: string
  color: string

  type: RouteType
  order: number

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

export type RouteStatus =
  | 'NotStarted'
  | 'Playing'
  | 'OnHold'
  | 'Completed'

import type { Route } from './types'

// 线路空颜色时使用的类型默认色，编辑器、线路图与统计图共用。
export const ROUTE_TYPE_COLORS: Record<Route['type'], string> = {
  common: '#5d82d8',
  chapter: '#7b70c9',
  character: '#d77e9c',
  main: '#4f9b82'
}

export function getRouteColor(route: Pick<Route, 'color' | 'type'>): string {
  return /^#[0-9a-f]{6}$/i.test(route.color) ? route.color : ROUTE_TYPE_COLORS[route.type]
}

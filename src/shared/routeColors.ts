import type { Route } from './types'

// 线路颜色按线路各自分配；新建线路取第一个未使用的调色板颜色，超出后按黄金角生成。
export const ROUTE_COLOR_PALETTE = [
  '#5d82d8', '#4f9b82', '#d77e9c', '#7b70c9', '#d99a4e',
  '#4f9bb8', '#c96f6f', '#8fa94e', '#b47bc9', '#5aa9a1',
  '#c9a04f', '#7c8fd9', '#d98a6a', '#6fb36f', '#a783c9',
  '#5f9e8f', '#d7b45a', '#b8738f', '#6b9bd1', '#a3a35a'
] as const

export const DEFAULT_ROUTE_COLOR = '#7e91b5'

export function isRouteColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}

export function getRouteColor(route: Pick<Route, 'color'>): string {
  return isRouteColor(route.color) ? route.color : DEFAULT_ROUTE_COLOR
}

export function nextRouteColor(usedColors: Iterable<string>): string {
  const used = new Set<string>()
  for (const color of usedColors) {
    if (isRouteColor(color)) used.add(color.toLowerCase())
  }
  for (const color of ROUTE_COLOR_PALETTE) {
    if (!used.has(color.toLowerCase())) return color
  }
  let index = used.size
  for (let attempt = 0; attempt < 360; attempt++, index++) {
    const color = hslToHex((index * 137.508) % 360, 58, 56)
    if (!used.has(color.toLowerCase())) return color
  }
  return DEFAULT_ROUTE_COLOR
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100
  const l = lightness / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hue < 60) [r, g, b] = [c, x, 0]
  else if (hue < 120) [r, g, b] = [x, c, 0]
  else if (hue < 180) [r, g, b] = [0, c, x]
  else if (hue < 240) [r, g, b] = [0, x, c]
  else if (hue < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const toHex = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

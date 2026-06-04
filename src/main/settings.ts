// src/main/settings.ts
import Store from 'electron-store'
import { GameSortType } from '@/shared/types'

export interface Settings {
  // 主题设置
  theme: 'light' | 'dark'
  // 代理设置
  proxy: {
    enabled: boolean // 是否启用代理
    host: string     // 代理服务器地址 
    port: number     // 代理服务器端口
  }
  // 游戏排序设置
  gameSortType: GameSortType
  gameSortOrder: 'asc' | 'desc'
}


const store = new Store<Settings>({
  defaults: {
    theme: 'light',
    proxy: {
      enabled: false,
      host: '',
      port: 7890
    },
    gameSortType: 'addTime',
    gameSortOrder: 'asc'
  }
})

export function getSettings(): Settings {
  return store.store
}

export function getSetting<K extends keyof Settings>(
  key: K
): Settings[K] {
  return store.get(key)
}

export function setSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K]
) {
  store.set(key, value)
}
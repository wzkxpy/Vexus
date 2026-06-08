// src/main/settings.ts
import Store from 'electron-store'
import { GameSortType } from '@/shared/types'
import { ProxyAgent } from 'undici'

export interface Settings {
  // 通用设置
  autoLaunch: boolean  // 开机自启
  theme: 'light' | 'dark' | 'system' // 主题
  // 账号设置
  bangumiToken: string
  // 工具设置
  magpiePath: string // magpie路径
  magpieHotkey: string // magpie快捷键
  // 代理设置
  proxy: {
    enabled: boolean // 是否启用代理
    protocol: 'http' | 'https' | 'socks5' // 代理协议
    host: string     // 代理服务器地址 
    port: number     // 代理服务器端口
  }
  // 游戏排序设置
  gameSortType: GameSortType
  gameSortOrder: 'asc' | 'desc'
}


const store = new Store<Settings>({
  defaults: {
    autoLaunch: false,
    theme: 'system',
    bangumiToken: '6o1H3zRciYAqsERmtEDUP6lrcPnnsIV29xH9QaYp',
    magpiePath: '',
    magpieHotkey: '',
    proxy: {
      enabled: false,
      protocol: 'http',
      host: '127.0.0.1',
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

export function getProxyAgent() {
  const proxy = getSetting('proxy')
  if (!proxy.enabled || !proxy.host.trim()) {
    return undefined
  }
  const url = `${proxy.protocol}://${proxy.host}:${proxy.port}`
  // console.log('using proxy:', url)
  return new ProxyAgent(url)
}
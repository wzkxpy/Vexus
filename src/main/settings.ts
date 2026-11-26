// src/main/settings.ts
import Store from 'electron-store'
import type { Settings } from '@/shared/types'
import { ProxyAgent } from 'undici'

export type { Settings } from '@/shared/types'


const store = new Store<Settings>({
  defaults: {
    autoLaunch: false,
    theme: 'system',
    gameTitle: 'Local',
    playtimeFormat: 'detail',
    bangumiToken: '',
    magpiePath: '',
    magpieHotkey: '',
    subTitle: true,
    proxy: {
      enabled: true,
      protocol: 'http',
      host: '127.0.0.1',
      port: 7890
    },
    gameSortType: 'addedAt',
    gameSortOrder: 'asc',
    librarySeriesMode: false
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

let cachedProxyAgent: ProxyAgent | undefined
let cachedProxyUrl: string | undefined

function closeCachedProxyAgent() {
  if (!cachedProxyAgent) return
  void cachedProxyAgent.close().catch(() => {})
  cachedProxyAgent = undefined
  cachedProxyUrl = undefined
}

// 复用同一个 ProxyAgent，避免每个请求都新建连接池。
export function getProxyAgent() {
  const proxy = getSetting('proxy')
  if (!proxy.enabled || !proxy.host.trim()) {
    closeCachedProxyAgent()
    return undefined
  }

  const url = `${proxy.protocol}://${proxy.host}:${proxy.port}`
  if (cachedProxyAgent && cachedProxyUrl === url) {
    return cachedProxyAgent
  }

  closeCachedProxyAgent()
  cachedProxyAgent = new ProxyAgent(url)
  cachedProxyUrl = url
  return cachedProxyAgent
}

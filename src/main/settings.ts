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

export function getProxyAgent() {
  const proxy = getSetting('proxy')
  if (!proxy.enabled || !proxy.host.trim()) {
    return undefined
  }
  const url = `${proxy.protocol}://${proxy.host}:${proxy.port}`
  return new ProxyAgent(url)
}

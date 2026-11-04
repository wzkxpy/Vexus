import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import type { Settings } from '@/shared/types'

export const useSettingsStore = defineStore('settings', () => {
  const settings = shallowRef<Settings | null>(null)
  let pending: Promise<Settings> | undefined

  // 首次挂载页面前加载一次，后续导航直接使用内存中的偏好，避免布局跳变。
  function load(): Promise<Settings> {
    if (settings.value) return Promise.resolve(settings.value)
    if (!pending) {
      pending = window.settingsAPI.getSettings().then(value => {
        settings.value = value
        return value
      }).finally(() => { pending = undefined })
    }
    return pending
  }

  async function save<K extends keyof Settings>(key: K, value: Settings[K]) {
    await window.settingsAPI.setSetting(key, value)
    // 主进程保存成功后才更新缓存，避免失败的设置影响其他页面。
    if (settings.value) settings.value = { ...settings.value, [key]: value }
  }

  return { settings, load, save }
})

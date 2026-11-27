import { app } from 'electron'
import { getSetting, setSetting } from '../settings'
import { UserError } from '../utils/errors'

const LOGIN_ITEM_NAME = 'Vexus'
// 开机启动时通过参数告诉主进程隐藏主窗口，只保留托盘。
const LOGIN_ITEM_ARGS = ['--hidden']

export function isAutoLaunchEnabled() {
  if (!app.isPackaged) return false
  const entry = app.getLoginItemSettings().launchItems
    ?.find(item => item.name === LOGIN_ITEM_NAME)
  return Boolean(
    entry?.enabled &&
    entry.path.toLowerCase() === process.execPath.toLowerCase()
  )
}

export function syncAutoLaunchState() {
  if (!app.isPackaged) return
  const enabled = isAutoLaunchEnabled()
  // 以系统实际状态为准，用户在任务管理器里禁用后设置页也能反映出来。
  if (getSetting('autoLaunch') !== enabled) {
    setSetting('autoLaunch', enabled)
  }
}

export function setAutoLaunch(enabled: boolean) {
  if (!app.isPackaged) {
    throw new UserError('开机自启仅在安装版可用')
  }

  app.setLoginItemSettings({
    openAtLogin: enabled,
    enabled,
    name: LOGIN_ITEM_NAME,
    path: process.execPath,
    args: LOGIN_ITEM_ARGS
  })

  if (isAutoLaunchEnabled() !== enabled) {
    throw new UserError('系统未接受开机自启设置')
  }

  setSetting('autoLaunch', enabled)
}
// src/renderer/composables/useGameActions
import type { Game } from '@/shared/types'
import { useGameStore } from '@/renderer/stores/game.store'
import { useRuntimeStore } from '@/renderer/stores/runtime.store'
import router from '../router'


export function useGameActions() {
  const gameStore = useGameStore()
  const runtimeStore = useRuntimeStore()

  // 启动游戏
  const launchGame = async (game: Game): Promise<boolean> => {
    if (!game.exePath) {
      alert('该游戏尚未配置启动程序')
      return false
    }
    if (runtimeStore.isRunning) {
      alert('已有游戏在运行中')
      return false
    }
    console.log('launch game:', game)
    try {
      await window.launchAPI.launchGame(game.id, game.exePath)
      runtimeStore.start(game.id) // 记录运行状态
      return true
    } catch (err: any) {
      alert(err.message || '启动失败')
      return false
    }
  }

  // 停止游戏
  const stopGame = async (game: Game) => {
    console.log('stop game:', game)
    if (!game.exePath) {
      alert('该游戏尚未配置启动程序')
      return
    }
    try {
      await window.launchAPI.stopGame(game.id, game.exePath)
    } catch (err: any) {
      alert(err.message || '停止失败')
    } finally {
      runtimeStore.stop() // 记录运行状态
    }
  }

  // 删除游戏
  const removeGame = async (game: Game) => {
    const ok = confirm(`确定删除游戏「${game.originalTitle}」吗？`)
    if (!ok) return
    await gameStore.deleteGame(game.id)
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/library')
    }
  }

  // 打开游戏所在文件夹
  const browseFolder = async (game: Game) => {
    if (!game.exePath) return alert('尚未配置游戏路径')
    try {
        await window.fileAPI.openFolder(game.exePath)
    } catch (err: any) {
        alert(err.message || '打开文件夹失败')
    }
  }

  // 更新游戏媒体资源
  // 本地上传
  const updateMedia = async (game: Game, type: 'cover' | 'banner', filePath: string) => {
    await gameStore.updateMedia(game.id, type, filePath)
  }

  // 后续可以增加更多媒体资源更新方式：
  // 网络图片 URL
  // 剪贴板获取
  // 都要下载到本地特定位置，并更新游戏数据中的路径

  // 移除
  const removeMedia = async (game: Game, type: 'cover' | 'banner') => {
    const field = `${type}Path` as keyof Game['media']
    await gameStore.updateGame(game.id, {
      media: {
        ...game.media,
        [field]: ''
      }
    })
  }

  // 切换游玩状态
  const updatePlayStatus = async (game: Game, status: Game['record']['playStatus']) => {
    await gameStore.updateGame(game.id, {
      record: {
        ...game.record,
        playStatus: status
      }
    })
  }

  // 切换 NSFW
  const toggleNSFW = async (game: Game) => {
    const newValue = !game.settings.nsfw
    await gameStore.updateGame(game.id, {
      settings: {
        ...game.settings,
        nsfw: newValue
      }
    })
  }

  // 开关 Magpie
  const toggleMagpie = async (game: Game) => {
    const newValue = !game.settings.magpie
    await gameStore.updateGame(game.id, {
      settings: {
        ...game.settings,
        magpie: newValue
      }
    })
  }

  return {
    launchGame,
    stopGame,
    removeGame,
    browseFolder,
    updateMedia,
    removeMedia,
    updatePlayStatus,
    toggleNSFW,
    toggleMagpie
  }
}

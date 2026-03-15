import { useGameStore } from '@/renderer/stores/game.store'
import type { Game } from '@/shared/types'

export function useGameActions() {

  const gameStore = useGameStore()

  // 启动游戏
  const launchGame = async (game: Game) => {
    console.log('launch game:', game)
    if (!game.exePath) {
      alert('该游戏尚未配置启动程序')
      return
    }
    try {
      await window.launchAPI.launchGame(game.exePath)
    } catch (err: any) {
      alert(err.message || '启动失败')
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
        await window.launchAPI.stopGame(game.exePath)
    } catch (err: any) {
        alert(err.message || '停止失败')
    }
  }

  // 删除游戏
  const removeGame = async (game: Game) => {
    const ok = confirm(`确定删除游戏「${game.originalTitle}」吗？`)
    if (!ok) return

    await gameStore.deleteGame(game.id)

    if (gameStore.selectedId === game.id) {
      gameStore.selectGame(null)
    }
  }

  // 打开游戏所在文件夹
  const browseFolder = async (game: Game) => {
    if (!game.exePath) return alert('尚未配置游戏路径')
    try {
        await window.launchAPI.openFolder(game.exePath)
    } catch (err: any) {
        alert(err.message || '打开文件夹失败')
    }
  }

  // 切换 NSFW
  const toggleNSFW = async (game: Game) => {
    const newValue = !game.settings.nsfw
    await gameStore.updateSelectedGame({
      settings: {
        ...game.settings,
        nsfw: newValue
      }
    })
  }

  // 开关 Magpie
  const toggleMagpie = async (game: Game) => {
    const newValue = !game.settings.magpie
    await gameStore.updateSelectedGame({
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
    toggleNSFW,
    toggleMagpie
  }
}

// src/renderer/stores/game.store.ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Game, NewGame, GameSortType } from '@/shared/types'



export const useGameStore = defineStore('game', () => {
  
  // state
  const games = ref<Game[]>([])
  const gameMap = computed(() => {
    return new Map(games.value.map(g => [g.id, g]))
  })
  const loaded = ref(false)
  const featuredGameId = ref<string | null>(null) // 首页展示游戏
  const featuredGame = computed(() =>
    games.value.find(g => g.id === featuredGameId.value) || null
  )
  // const sortType = getSetting('gameSortType')
  const sortType = ref<GameSortType>('addTime')
  const sortOrder = ref<'asc' | 'desc'>('desc')

  // actions
  const initSortSettings = async () => {
    const [currentSortType, currentSortOrder] = await Promise.all([
      window.settingsAPI.getSetting('gameSortType'),
      window.settingsAPI.getSetting('gameSortOrder')
    ])
    sortType.value = currentSortType
    sortOrder.value = currentSortOrder
  }

  // 从数据库加载游戏数据，适用于应用启动时
  const initGames = async () => {
    if (loaded.value) return
    await initSortSettings() // 先初始化排序设置
    games.value = await window.databaseAPI.getAllGames()
    sortGames()
    loaded.value = true
  }

  // 从数据库中重新获取所有游戏数据
  // const refreshGames = async () => {
  //   games.value = await window.databaseAPI.getAllGames()
  //   await sortGames()
  //   loaded.value = true
  // }

  // 从数据库中获取单个游戏数据，适用于单次修改后更新
  const refreshGame = async (id: string) => {
    const fresh = await window.databaseAPI.getGame(id)
    if (!fresh) return
    const index = games.value.findIndex(g => g.id === id)
    if (index !== -1) {
      games.value[index] = fresh
    } else {
      games.value.push(fresh)
    }
    sortGames() // TODO 刷新后重新排序, 可优化为局部排序 
  }

  // const patchGame = async (id: string, patch: Partial<Game>) => {
  //   const game = games.value.find(g => g.id === id)
  //   if (!game) return
  //   Object.assign(game, patch)
  // }

  const setFeaturedGame = (id: string | null) => {
    featuredGameId.value = id
  }
  
  const getGameById = (id: string) => {
    return gameMap.value.get(id) || null
  }

  // 添加游戏到数据库，并刷新到状态
  const addGame = async (game: NewGame) => {
    const id = await window.databaseAPI.addGame(game)
    await refreshGame(id)
    return id
  }

  // 从数据库删除游戏，并从状态中移除
  const deleteGame = async (id: string) => {
    const ok = await window.databaseAPI.deleteGame(id)
    if (ok) {
      games.value = games.value.filter(g => g.id !== id)
      if (featuredGameId.value === id) {
        featuredGameId.value = games.value[0]?.id ?? null
      }
    }
    return ok
  }

  // 更新游戏到数据库，并刷新到状态
  const updateGame = async (id: string, payload: Partial<Game>) => {
    const g = gameMap.value.get(id) || null // 直接修改原对象，保持响应式
    if (!g) return
    Object.assign(g, payload)
    await window.databaseAPI.updateGame(JSON.parse(JSON.stringify(g)))
  }

  // 更新媒体资源文件，并刷新游戏数据到状态
  const updateMedia = async (gameId: string, type: 'cover' | 'banner', sourcePath: string) => {    
    const savedpath = await window.databaseAPI.updateMedia(gameId, type, sourcePath)
    const game = gameMap.value.get(gameId)
    if (!game) return
    const field = `${type}Path` as keyof Game['media']
    if (!game.media) game.media = {}
    game.media[field] = savedpath
  }

  // 修改排序方式，并保存到全局设置
  const setSortType = async (type: GameSortType) => {
    sortType.value = type
    await window.settingsAPI.setSetting('gameSortType', type)
    sortGames()
  }
  const setSortOrder = async () => {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    await window.settingsAPI.setSetting('gameSortOrder', sortOrder.value)
    sortGames()
  }

  // 排序游戏列表，基于全局设置的排序方式
  const sortGames = () => {
    games.value.sort((a, b) => {
      let result = 0
      switch (sortType.value) {
        case 'addTime':
          result =
            new Date(a.record.addTime).getTime() -
            new Date(b.record.addTime).getTime()
          break
        case 'title':
          result = (
            a.localizedTitle || a.originalTitle
          ).localeCompare(
            b.localizedTitle || b.originalTitle,
            'zh-Hans-CN',
            {
              numeric: true,
              sensitivity: 'base'
            }
          )
          break
        case 'playtime':
          result =
            (a.record.sessionPlaytime + a.record.extraPlaytime) -
            (b.record.sessionPlaytime + b.record.extraPlaytime)
          break
        case 'score':
          result =
            (a.record.personalScore ?? -1) -
            (b.record.personalScore ?? -1)
          break
        case 'releaseDate':
          result =
            new Date(a.basicInfo.releaseDate ?? '1900-01-01').getTime() -
            new Date(b.basicInfo.releaseDate ?? '1900-01-01').getTime()
          break
        case 'lastRunDate':
          result =
            new Date(a.record.lastRunDate ?? '1900-01-01').getTime() -
            new Date(b.record.lastRunDate ?? '1900-01-01').getTime()
          break
        case 'custom':
          result = (a.sortNum ?? 0) - (b.sortNum ?? 0)
          break
      }
      return sortOrder.value === 'asc' ? result : -result
    })
  }

  return {
    games,
    featuredGameId,
    featuredGame,
    updateMedia,
    sortType,
    sortOrder,

    setSortType,
    setSortOrder,

    getGameById,
    initGames,
    // refreshGames,
    // refreshGame,
    addGame,
    deleteGame,
    updateGame,
    setFeaturedGame
    // deleteSelectedGame
  }
})

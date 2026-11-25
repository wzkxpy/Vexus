import type { Game } from '@/shared/types'

export function getGameDisplayTitle(game: Game) {
  return game.localizedTitle || game.originalTitle
}

// 系列内没有手工顺序，统一按发售日升序；缺日期排最后，同日期按标题。
export function compareSeriesGames(a: Game, b: Game) {
  const aDate = a.basicInfo.releaseDate?.trim() ?? ''
  const bDate = b.basicInfo.releaseDate?.trim() ?? ''
  if (aDate !== bDate) {
    if (!aDate) return 1
    if (!bDate) return -1
    return aDate.localeCompare(bDate)
  }
  return getGameDisplayTitle(a).localeCompare(getGameDisplayTitle(b), 'zh-Hans-CN', {
    numeric: true,
    sensitivity: 'base'
  })
}

export function sortSeriesGames(games: Game[]) {
  return [...games].sort(compareSeriesGames)
}
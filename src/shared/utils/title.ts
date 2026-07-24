// src/shared/utils/title.ts
import type { TitleSplit } from '@/shared/types'

// 根据游戏标题自动检测主副标题的分隔位置，返回一个 TitleSplit 对象
// 基于一些常见的分隔符来检测标题的切分点
export function computeTitleSplit(originalTitle: string, localizedTitle?: string): TitleSplit {
  const computeSingle = (title?: string): [number | null, number | null] => {
    if (!title) return [null, null]
    const separators = [
        { token: ' -', mainOffset: 0, subOffset: 1 },
        { token: ' —', mainOffset: 0, subOffset: 1 },
        { token: ' ~', mainOffset: 0, subOffset: 1 },
        { token: ' ～', mainOffset: 0, subOffset: 1 },
        { token: '～', mainOffset: 0, subOffset: 0 },
        { token: ': ', mainOffset: 0, subOffset: 2 },
        { token: '：', mainOffset: 0, subOffset: 1 },
        { token: ' // ', mainOffset: 0, subOffset: 1 },
        { token: '-nine-', mainOffset: 6, subOffset: 6 },
    ]

    for (const sep of separators) {
      const idx = title.indexOf(sep.token)
      if (idx !== -1) {
        return [idx + sep.mainOffset, idx + sep.subOffset]
      }
    }
    return [null, null]
  }

  const [origMainEnd, origSubStart] = computeSingle(originalTitle)
  const [locMainEnd, locSubStart] = computeSingle(localizedTitle)

  return [
    origMainEnd,
    origSubStart,
    locMainEnd,
    locSubStart
  ]
}

// 根据给定的主副标题分隔位置，将标题切分成 main 和 sub 两部分
export function splitTitle(
  title: string,
  mainEnd: number | null,
  subStart: number | null
): SplitTitle {
  if (mainEnd == null || subStart == null) {
    return {
      main: title,
      sub: null
    }
  }
  return {
    main: title.slice(0, mainEnd),
    sub: title.slice(subStart)
  }
}

export interface SplitTitle {
  main: string
  sub: string | null
}
// src/main/services/bangumi/types.ts
// 定义 Bangumi 条目数据类型

export interface BangumiSubject {
  id: number
  type: number
  name: string
  name_cn: string
  summary: string
  air_date: string
  date: string
  images: {
    large: string
    common: string
    medium: string
    small: string
    grid: string
  }
  staff: Array<{
    name: string
    role: string
  }>
  tags: Array<{
    name: string
    count: number
  }>
  url: string
  infobox: Array<{
    key: string
    value: any
  }>
  rating: {
    rank: number
    total: number
    count: number
    score: number
  }
  nsfw: boolean
}


export interface BangumiCharacter {
  id: number
  name: string
  summary: string
  relation: string
  actors: Array<{
    id: number
    name: string
  }>
  images: {
    large: string
    medium: string
    small: string
    grid: string
  }
}


// export interface BangumiSearchResult {
//   list: Array<{
//     id: number
//     name: string
//     name_cn: string
//     air_date?: string
//     staff?: Array<{
//       name: string
//       role: string
//     }>
//   }>
// }

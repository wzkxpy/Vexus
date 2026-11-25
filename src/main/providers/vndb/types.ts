// src/main/providers/vndb/types.ts
// 仅声明 Vexus 实际请求的 VNDB 字段，避免依赖完整 API schema。

export interface VndbTitle {
  lang: string
  title: string
  latin?: string | null
  official?: boolean
  main?: boolean
}

export interface VndbImage {
  url: string
  thumbnail?: string
}

export interface VndbDeveloper {
  id: string
  name: string
  original?: string | null
  type?: string
}

export interface VndbTag {
  id: string
  name: string
  rating: number
  spoiler: number
  lie: boolean
  category: string
}

export interface VndbStaff {
  id: string
  name: string
  original?: string | null
  role: string
  note?: string | null
}

export interface VndbCharacterVn {
  id: string
  role: string
  spoiler: number
}

export interface VndbCharacter {
  id: string
  name: string
  original?: string | null
  image?: VndbImage | null
  vns?: VndbCharacterVn[]
}

export interface VndbVa {
  note?: string | null
  staff: VndbStaff
  character: VndbCharacter
}

export interface VndbVn {
  id: string
  title: string
  alttitle?: string | null
  titles?: VndbTitle[]
  image?: VndbImage | null
  released?: string | null
  developers?: VndbDeveloper[]
  rating?: number | null
  votecount?: number
  length_minutes?: number | null
  description?: string | null
  tags?: VndbTag[]
  staff?: VndbStaff[]
  va?: VndbVa[]
}

export interface VndbQueryResponse<T> {
  results: T[]
  more: boolean
}
// src/main/providers/vndb/client.ts
import { fetch, type Dispatcher } from 'undici'
import { normalizeVndbId } from '@/shared/utils/vndb'
import { isTransientNetworkError } from '../../utils/network'
import type { VndbQueryResponse, VndbVn } from './types'

// 公开查询无需鉴权，默认限流 200 次 / 5 分钟。
const VNDB_BASE_URL = 'https://api.vndb.org/kana'

// 按用途拆分字段，避免一次请求携带全部嵌套数据触发 “Too much data selected”。
export const VNDB_FIELDS = {
  search: 'id,title,alttitle,titles{lang,title,latin,official,main},image{url,thumbnail},released,developers{id,name,original,type},rating,votecount',
  basicInfo: 'id,released,developers{id,name,original,type},length_minutes',
  staff: 'id,staff{id,name,original,role}',
  tags: 'id,tags{id,name,rating,spoiler,lie,category}',
  description: 'id,description',
  characters: 'id,va{note,staff{id,name,original},character{id,name,original,image{url},vns{id,role,spoiler}}}',
  details: 'id,title,alttitle,titles{lang,title,latin,official,main},image{url},released,developers{id,name,original,type},rating,votecount,length_minutes,description,tags{id,name,rating,spoiler,lie,category},staff{id,name,original,role}'
} as const

interface VndbQuery {
  filters: unknown[]
  fields: string
  sort?: string
  results?: number
}

export class VndbApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'VndbApiError'
  }
}

export class VndbClient {
  constructor(private agent?: Dispatcher) {}

  async searchVns(keyword: string): Promise<VndbVn[]> {
    const response = await this.query<VndbVn>('vn', {
      filters: ['search', '=', keyword],
      fields: VNDB_FIELDS.search,
      sort: 'searchrank',
      results: 10
    })
    return response.results
  }

  async getVn(id: string, fields: string): Promise<VndbVn | null> {
    const response = await this.query<VndbVn>('vn', {
      filters: ['id', '=', normalizeVndbId(id)],
      fields,
      results: 1
    })
    return response.results[0] ?? null
  }

  private async query<T>(endpoint: 'vn', body: VndbQuery): Promise<VndbQueryResponse<T>> {
    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        const res = await fetch(`${VNDB_BASE_URL}/${endpoint}`, {
          method: 'POST',
          headers: {
            'User-Agent': 'Vexus/0.1.0 (https://github.com/wzkxpy/Vexus)',
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          dispatcher: this.agent,
          body: JSON.stringify(body)
        })

        if (!res.ok) {
          const text = (await res.text()).trim()
          throw new VndbApiError(res.status, (text || res.statusText).slice(0, 500))
        }

        return await res.json() as VndbQueryResponse<T>
      } catch (error) {
        if (
          error instanceof VndbApiError ||
          attempt >= 1 ||
          !isTransientNetworkError(error)
        ) {
          throw error
        }
        await new Promise(resolve => setTimeout(resolve, 400))
      }
    }

    throw new Error('VNDB 请求失败')
  }
}
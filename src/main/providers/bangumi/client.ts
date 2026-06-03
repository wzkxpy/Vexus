// src/main/providers/bangumi/client.ts
import { BangumiSubject, BangumiCharacter } from "./types"
import { fetch, Dispatcher } from 'undici'

export class BangumiClient {
  private static readonly BASE_URL = 'https://api.bgm.tv'
  private accessToken?: string
  private agent?: Dispatcher

  // 构造函数
  constructor(token?: string, agent?: Dispatcher) {
    this.accessToken = token
    this.agent = agent
  }

  // 设置 headers
  private get headers() {
    return {
      'User-Agent': 'Vexus/0.1.0 (https://github.com/wzkxpy/Vexus)',
      ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {})
    }
  }

  // 构建 GET request
  private async getRequest<T>(path: string): Promise<T> {
    const res = await fetch(`${BangumiClient.BASE_URL}${path}`, {
      headers: this.headers,
      dispatcher: this.agent
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Bangumi API 错误 ${res.status}: ${text}`)
    }
    return await res.json() as T
  }

  // 构建 POST request
  private async postRequest<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BangumiClient.BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      dispatcher: this.agent,
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Bangumi Search API 错误 ${res.status}: ${text}`)
    }
    const json = await res.json() as { data: T }
    return json.data
  }

  // get 获取条目信息
  async getSubject(subject_id: string): Promise<BangumiSubject> {
    console.log(`Fetching subject with Bangumi ID: ${subject_id}`);
    return this.getRequest<BangumiSubject>(`/v0/subjects/${subject_id}`)
  }

  // get 获取角色信息
  async getCharacters(subject_id: string): Promise<BangumiCharacter[]> {
    console.log(`Fetching characters with Bangumi ID: ${subject_id}`);
    return this.getRequest<BangumiCharacter[]>(`/v0/subjects/${subject_id}/characters`)
  }

  // post 根据游戏名搜索
  async searchGame(keyword: string): Promise<BangumiSubject[]> {
    console.log(`Searching games with keyword: ${keyword}`);
    return this.postRequest<BangumiSubject[]>(
      '/v0/search/subjects',
      {
        keyword,
        sort: 'rank',
        filter: {
          type: [4],
          tags: ['Galgame'],
          rating_count: ['>=1']
        }
      }
    )
  }
}
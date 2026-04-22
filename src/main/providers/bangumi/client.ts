// src/main/providers/bangumi/client.ts
import { BangumiSubject, BangumiCharacter } from "./types"


export class BangumiClient {
  private static readonly BASE_URL = 'https://api.bgm.tv'
  private accessToken?: string

  // 构造函数
  constructor(token?: string) {this.accessToken = token}
  
  // 构建 GET request
  private async getRequest<T>(path: string): Promise<T> {
    const res = await fetch(`${BangumiClient.BASE_URL}${path}`, {
      headers: this.accessToken
        ? { Authorization: `Bearer ${this.accessToken}` }
        : undefined
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Bangumi API 错误 ${res.status}: ${text}`)
    }
    return await res.json() as Promise<T>
  }

  // 构造 POST request
  private async postRequest(path: string, body: unknown){
    const res = await fetch(`${BangumiClient.BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        ...(this.accessToken
          ? { Authorization: `Bearer ${this.accessToken}` }
          : {})
      },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Bangumi Search API 错误 ${res.status}: ${text}`)
    }
    return await res.json()
  }

  // get 获取条目信息
  async getSubject(subject_id: string): Promise<BangumiSubject> {
    console.log(`Fetching subject with Bangumi ID: ${subject_id}`);
    
    return this.getRequest<BangumiSubject>(`/v0/subjects/${subject_id}`)
  }

  // get 获取角色信息
  async getCharacters(subject_id: string): Promise<BangumiCharacter[]> {
    return this.getRequest<BangumiCharacter[]>(`/v0/subjects/${subject_id}/characters`)
  }

  // post 根据游戏名搜索
  async searchGame(keyword: string): Promise<BangumiSubject[]> {
    const result = await this.postRequest(
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
    return result.data
  }
}
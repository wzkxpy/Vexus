// src/main/services/bangumi/client.ts
import { BangumiSubject, BangumiCharacter } from "./types"


export class BangumiClient {
  private static readonly BASE_URL = 'https://api.bgm.tv'
  private accessToken?: string

  // 构造函数
  constructor(token?: string) {this.accessToken = token}
  
  // 构建 request
  private async request<T>(path: string): Promise<T> {
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

  // 获取条目信息
  async getSubject(subject_id: string): Promise<BangumiSubject> {
    console.log(`Fetching subject with Bangumi ID: ${subject_id}`);
    
    return this.request<BangumiSubject>(`/v0/subjects/${subject_id}`)
  }

  // 获取角色信息
  async getCharacters(subject_id: string): Promise<BangumiCharacter[]> {
    return this.request<BangumiCharacter[]>(`/v0/subjects/${subject_id}/characters`)
  }
}
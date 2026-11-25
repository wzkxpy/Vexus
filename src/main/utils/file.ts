// src/main/utils/file.ts
import * as fs from 'fs';
import { fetch, Dispatcher } from 'undici'
import { isTransientNetworkError } from './network'

const DOWNLOAD_RETRIES = 1
const RETRY_DELAY_MS = 400

// 下载文件；瞬时网络错误重试一次，HTTP 状态错误直接失败。
export async function downloadFile(fileUrl: string, savePath: string, agent?: Dispatcher) {
  for (let attempt = 0; attempt <= DOWNLOAD_RETRIES; attempt++) {
    try {
      const res = await fetch(fileUrl, {
        dispatcher: agent,
        headers: {
          'User-Agent': 'Vexus/0.1.0 (https://github.com/wzkxpy/Vexus)'
        }
      })
      if (!res.ok) throw new Error(`Download failed: ${res.status}`)
      const buffer = Buffer.from(await res.arrayBuffer())
      await fs.promises.writeFile(savePath, buffer)
      return savePath
    } catch (error) {
      if (attempt >= DOWNLOAD_RETRIES || !isTransientNetworkError(error)) {
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
    }
  }

  throw new Error('Download failed')
}

// 删除文件
export function deleteFile(filePath: string): boolean {
  try {
    fs.unlinkSync(filePath)
    return true
  } catch (err: any) {
    console.error(`Failed to delete ${filePath}`, err)
    return false
  }
}
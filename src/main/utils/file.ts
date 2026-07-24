// src/main/utils/file.ts
import * as fs from 'fs';
import { fetch, Dispatcher } from 'undici'

// 下载文件
export async function downloadFile(fileUrl: string, savePath: string, agent?: Dispatcher) {
  const res = await fetch(fileUrl, { dispatcher: agent })
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  await fs.promises.writeFile(savePath, buffer)
  return savePath
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
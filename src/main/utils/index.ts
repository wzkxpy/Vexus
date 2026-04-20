// src/main/utils/index.ts
import * as fs from 'fs';
import * as https from 'https';
import path from 'path';
// import * as psTree from 'ps-tree'


// 下载文件
export async function downloadFile(fileUrl: string, savePath: string) {
  return new Promise<string>((resolve, reject) => {
    const file = fs.createWriteStream(savePath)

    https.get(fileUrl, (response) => {
      if (response.statusCode !== 200) {
        fs.unlink(savePath, () => {})
        reject(new Error(`Download failed: ${response.statusCode}`))
        return
      }
      response.pipe(file)

      file.on('finish', () => {
        file.close()
        resolve(savePath)
      })
    }).on('error', (err) => {
      fs.unlink(savePath, () => {})
      reject(err)
    })

    file.on('error', (err) => {
      fs.unlink(savePath, () => {})
      reject(err)
    })
  })
}

export function deleteFile(filePath: string): boolean {
  try {
    fs.unlinkSync(filePath)
    return true
  } catch (err: any) {
    console.error(`Failed to delete ${filePath}`, err)
    return false
  }
}

/**
 * 复制文件到目标路径（自动创建目录）
 *
 * @param sourcePath 原文件路径
 * @param targetPath 目标文件路径（包含完整文件名）
 * @param overwrite 是否覆盖已存在文件（默认 true）
 * @returns 最终保存路径
 */
export async function copyFileTo(
  sourcePath: string,
  targetPath: string,
  overwrite = true
): Promise<string> {
  const targetDir = path.dirname(targetPath)

  // 确保目录存在
  await fs.promises.mkdir(targetDir, { recursive: true })

  // 如果目标存在且不允许覆盖
  if (!overwrite) {
    const exists = await fs.promises
      .access(targetPath)
      .then(() => true)
      .catch(() => false)

    if (exists) {
      throw new Error(`Target file already exists: ${targetPath}`)
    }
  }

  // 执行复制
  await fs.promises.copyFile(
    sourcePath,
    targetPath
  )

  return targetPath
}
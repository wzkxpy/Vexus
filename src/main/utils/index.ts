// src/main/utils/index.ts
import * as fs from 'fs';
import * as https from 'https';
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
// src/main/providers/erogame/client.ts
import { fetch, type Dispatcher } from 'undici'
import { isTransientNetworkError } from '../../utils/network'

// 批评空间没有官方 API，社区通行做法是提交固定 SQL 让站点返回 HTML 表格。
// 官方站点在部分网络不可达，默认使用社区镜像，并保留官方地址作为回退。
const EROGAME_MIRROR_URL = 'https://koko.kyara.top'
const EROGAME_OFFICIAL_URL = 'https://erogamescape.org/~ap2/ero/toukei_kaiseki'
const EROGAME_BASE_URLS = [EROGAME_MIRROR_URL, EROGAME_OFFICIAL_URL]
const SQL_FORM_PATH = '/sql_for_erogamer_form.php'
const REQUEST_TIMEOUT_MS = 8000
const MIN_REQUEST_INTERVAL_MS = 2500

let lastRequestAt = 0

export class ErogameScapeClient {
  constructor(private agent?: Dispatcher) {}

  async getMedianScore(id: string): Promise<number | undefined> {
    if (!/^\d+$/.test(id)) {
      throw new Error('批评空间 ID 应为纯数字')
    }

    await throttleRequest()

    let firstError: unknown
    for (const baseUrl of EROGAME_BASE_URLS) {
      try {
        const html = await this.requestScoreTable(baseUrl, id)
        return parseMedianScore(html)
      } catch (error) {
        if (firstError == null) firstError = error
      }
    }

    throw firstError instanceof Error
      ? firstError
      : new Error('批评空间请求失败，请稍后重试')
  }

  private async requestScoreTable(baseUrl: string, id: string): Promise<string> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(`${baseUrl}${SQL_FORM_PATH}`, {
        method: 'POST',
        headers: {
          'User-Agent': 'Vexus/0.1.0 (https://github.com/wzkxpy/Vexus)',
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'text/html'
        },
        dispatcher: this.agent,
        signal: controller.signal,
        body: new URLSearchParams({
          sql: `SELECT median, count2 FROM gamelist WHERE id = ${id}`
        }).toString()
      })

      if (!response.ok) {
        throw new ErogameHttpError(response.status)
      }

      // 官方站点与镜像均为 UTF-8，解析只依赖 ASCII 表头与数字。
      return new TextDecoder().decode(await response.arrayBuffer())
    } catch (error) {
      if (error instanceof ErogameHttpError) {
        throw new Error(`批评空间服务暂时不可用（HTTP ${error.status}）`)
      }
      throw new Error(describeRequestError(error))
    } finally {
      clearTimeout(timer)
    }
  }
}

class ErogameHttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`)
    this.name = 'ErogameHttpError'
  }
}

async function throttleRequest() {
  const wait = lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now()
  if (wait > 0) {
    await new Promise(resolve => setTimeout(resolve, wait))
  }
  lastRequestAt = Date.now()
}

function describeRequestError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return '无法连接批评空间，请检查网络或代理设置'
    }
    if (isTransientNetworkError(error)) {
      return '无法连接批评空间，请检查网络或代理设置'
    }
  }
  return '批评空间请求失败，请稍后重试'
}

export function parseMedianScore(html: string): number | undefined {
  const rows = parseTableRows(html)
  const headerIndex = rows.findIndex(cells => cells.some(cell => /^median$/i.test(cell)))
  if (headerIndex < 0) {
    throw new Error('无法解析批评空间评分')
  }

  const header = rows[headerIndex]
  const medianIndex = header.findIndex(cell => /^median$/i.test(cell))
  const countIndex = header.findIndex(cell => /^count2$/i.test(cell))

  for (const cells of rows.slice(headerIndex + 1)) {
    const median = toNumber(cells[medianIndex])
    if (median == null || median < 0 || median > 100) continue

    const count = countIndex >= 0 ? toNumber(cells[countIndex]) : undefined
    if (count != null && count <= 0) continue
    return median
  }

  return undefined
}

function parseTableRows(html: string): string[][] {
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(row =>
      [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
        .map(cell => stripTags(cell[1]))
    )
    .filter(cells => cells.length > 0)
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim()
}

function toNumber(value?: string): number | undefined {
  if (value == null || value === '') return undefined
  const number = Number(value.replace(/,/g, ''))
  return Number.isFinite(number) ? number : undefined
}
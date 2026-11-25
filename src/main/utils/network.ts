// 仅用于判断可安全重试的瞬时网络错误；HTTP 状态错误不在此列。

export function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const causeCode = (error as { cause?: { code?: unknown } }).cause?.code
  const text = `${error.message} ${typeof causeCode === 'string' ? causeCode : ''}`
  return /(fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|UND_ERR_)/i.test(text)
}
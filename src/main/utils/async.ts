// 限制并发执行异步任务；任一任务失败后停止派发新任务，并等待在途任务结束。
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return []

  const results = new Array<R>(items.length)
  const runnerCount = Math.max(1, Math.min(limit, items.length))
  let nextIndex = 0
  let stopped = false

  const runners = Array.from({ length: runnerCount }, async () => {
    while (!stopped) {
      const index = nextIndex++
      if (index >= items.length) return
      try {
        results[index] = await worker(items[index], index)
      } catch (error) {
        stopped = true
        throw error
      }
    }
  })

  const settled = await Promise.allSettled(runners)
  const failure = settled.find(result => result.status === 'rejected')
  if (failure && failure.status === 'rejected') throw failure.reason
  return results
}
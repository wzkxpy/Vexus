// VNDB 条目 ID 的规范形式为 v123，也允许用户输入纯数字。

export function normalizeVndbId(value: string): string {
  const match = /^(?:v)?(\d+)$/i.exec(value.trim())
  if (!match) {
    throw new Error('VNDB ID 应为 v123 或纯数字。')
  }
  return `v${match[1]}`
}
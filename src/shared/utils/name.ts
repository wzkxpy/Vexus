// 仅合并 CJK 名字内部的空格，保留英文单词之间的空格。

export function normalizeNameSpacing(name: string): string {
  const collapsed = name.trim().replace(/\s+/g, ' ')
  return collapsed.replace(
    /([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]) (?=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}])/gu,
    '$1'
  )
}
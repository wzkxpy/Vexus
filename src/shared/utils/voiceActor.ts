// 声优马甲映射来自用户手工维护的 JSON：{ "别名": "显示名" }。

export function parseVoiceActorAliasMap(raw: unknown): Map<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('声优马甲映射必须是 { "别名": "显示名" } 形式的 JSON 对象')
  }

  const aliases = new Map<string, string>()
  for (const [rawAlias, rawName] of Object.entries(raw)) {
    if (typeof rawName !== 'string') {
      throw new Error(`声优马甲映射项 “${rawAlias}” 的显示名必须是字符串`)
    }
    const alias = rawAlias.trim()
    const name = rawName.trim()
    if (!alias) throw new Error('声优马甲映射中存在空别名')
    if (!name) throw new Error(`声优马甲映射项 “${rawAlias}” 的显示名不能为空`)
    if (alias === name) continue
    aliases.set(alias, name)
  }

  // 提前验证整张表，避免链式映射到转换时才暴露循环。
  for (const alias of aliases.keys()) resolveVoiceActorName(alias, aliases)
  return aliases
}

export function resolveVoiceActorName(name: string, aliases: Map<string, string>): string {
  const key = name.trim()
  if (!key || !aliases.has(key)) return name

  const chain: string[] = []
  let current = key
  while (aliases.has(current)) {
    const cycleStart = chain.indexOf(current)
    if (cycleStart !== -1) {
      throw new Error(`声优马甲映射存在循环：${[...chain.slice(cycleStart), current].join(' → ')}`)
    }
    chain.push(current)
    current = aliases.get(current)!
  }
  return current
}

export function normalizeVoiceActorNames<T extends { voiceActor: string }>(
  characters: T[],
  aliases: Map<string, string>
): T[] {
  if (!characters.length || !aliases.size) return characters

  let changed = false
  const normalized = characters.map(character => {
    const voiceActor = resolveVoiceActorName(character.voiceActor, aliases)
    if (voiceActor === character.voiceActor) return character
    changed = true
    return { ...character, voiceActor }
  })
  return changed ? normalized : characters
}
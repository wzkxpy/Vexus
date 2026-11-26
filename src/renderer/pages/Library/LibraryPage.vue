<!-- src/renderer/pages/Library/LibraryPage.vue -->
<template>
  <div class="library-layout">

    <header class="drag-region">
      <h1>Vexus</h1>
    </header>
    <main ref="contentElement" class="main-content" @scroll.passive="handleContentScroll">
      <div class="library-toolbar">
        <div class="library-actions">
          <button
            class="series-mode-button"
            :class="{ active: seriesMode }"
            :aria-pressed="seriesMode"
            title="按系列合并显示"
            @click="toggleSeriesMode"
          >
            <Layers :size="16" />
            系列
          </button>

          <div class="sort-controls">
            <OptionsMenu :items="sortItems" :selected="gameStore.sortType">
              <template #button>
                <button class="sort-button" :aria-label="`排序方式：${sortLabel}`">
                  {{ sortLabel }}
                  <ChevronDown :size="14" />
                </button>
              </template>
            </OptionsMenu>

            <button
              class="sort-order-button"
              @click="gameStore.setSortOrder()"
              :aria-label="gameStore.sortOrder === 'asc' ? '当前升序，切换为降序' : '当前降序，切换为升序'"
            >
              <ArrowUp v-if="gameStore.sortOrder === 'asc'" :size="16" />
              <ArrowDown v-else :size="16" />
            </button>
          </div>

          <button class="add-button" @click="uiStore.activeModal = 'add-game'">
            <Plus :size="17" />
            添加游戏
          </button>
        </div>
      </div>

      <div class="game-grid">
        <template v-for="item in libraryItems" :key="item.key">
          <GameCard
            v-if="item.kind === 'series'"
            :game="item.summary.coverGame"
            :display-title="item.summary.name"
            :target-game-id="item.summary.targetGame.id"
          />
          <GameCard v-else :game="item.game" />
        </template>
      </div>

    </main>

    <AddGameModal
      v-if="uiStore.activeModal === 'add-game'"
      @close="uiStore.activeModal = null"
    />
    
  </div>
</template>


<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue'
import type { Game } from '@/shared/types'
import { useGameStore } from '@/renderer/stores/game.store'
import GameCard from '@/renderer/components/GameCard.vue'
import AddGameModal from './AddGameModal.vue'
import { ArrowDown, ArrowUp, ChevronDown, Layers, Plus } from '@lucide/vue'
import { useUIStore } from '../../stores/ui.store'
import { useSettingsStore } from '@/renderer/stores/settings.store'
import OptionsMenu from '@/renderer/components/OptionsMenu.vue'
import { sortSeriesGames } from '@/shared/utils/series'

const gameStore = useGameStore()
const uiStore = useUIStore()
const settingsStore = useSettingsStore()

// 页面被 KeepAlive 缓存后实例仍在；模块级变量同时兜底组件重建的情况。
const contentElement = ref<HTMLElement | null>(null)
let savedScrollTop = 0

function handleContentScroll() {
  if (contentElement.value) savedScrollTop = contentElement.value.scrollTop
}

function restoreContentScroll() {
  if (contentElement.value) contentElement.value.scrollTop = savedScrollTop
}

onMounted(restoreContentScroll)
onActivated(restoreContentScroll)

const seriesMode = computed(() => settingsStore.settings?.librarySeriesMode ?? false)

async function toggleSeriesMode() {
  try {
    await settingsStore.save('librarySeriesMode', !seriesMode.value)
  } catch (error) {
    console.error('Failed to save series mode:', error)
  }
}

interface SeriesSummary {
  name: string
  games: Game[]
  coverGame: Game
  targetGame: Game
}

type LibraryItem =
  | { kind: 'game'; key: string; game: Game }
  | { kind: 'series'; key: string; summary: SeriesSummary }

// 系列卡合并展示同系列作品，成员顺序与游戏页切换栏保持一致。
const seriesGroups = computed<SeriesSummary[]>(() => {
  const groups = new Map<string, Game[]>()
  for (const game of gameStore.games) {
    if (!game.series) continue
    const members = groups.get(game.series)
    if (members) members.push(game)
    else groups.set(game.series, [game])
  }

  return [...groups.entries()].map(([name, members]) => {
    const ordered = sortSeriesGames(members)
    return {
      name,
      games: ordered,
      coverGame: ordered[0],
      targetGame: ordered.find(game => game.record.playStatus === 'Playing') ?? ordered[0]
    }
  })
})

function toTimestamp(value: string | undefined, fallback = '1900-01-01') {
  return new Date(value ?? fallback).getTime()
}

function gameSortValue(game: Game): string | number {
  switch (gameStore.sortType) {
    case 'addedAt':
      return toTimestamp(game.record.addedAt)
    case 'title':
      return game.localizedTitle || game.originalTitle
    case 'playtime':
      return game.record.sessionPlaytime + game.record.extraPlaytime
    case 'score':
      return game.record.personalScore ?? -1
    case 'releaseDate':
      return toTimestamp(game.basicInfo.releaseDate)
    case 'lastRunAt':
      return toTimestamp(game.record.lastRunAt)
    case 'custom':
      return game.sortNum ?? 0
  }
  return 0
}

function seriesSortValue(summary: SeriesSummary): string | number {
  const games = summary.games
  switch (gameStore.sortType) {
    case 'addedAt':
      return Math.max(...games.map(game => toTimestamp(game.record.addedAt)))
    case 'title':
      return summary.name
    case 'playtime':
      return games.reduce(
        (sum, game) => sum + game.record.sessionPlaytime + game.record.extraPlaytime,
        0
      )
    case 'score': {
      const scores = games
        .map(game => game.record.personalScore)
        .filter((score): score is number => typeof score === 'number')
      return scores.length
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : -1
    }
    case 'releaseDate':
      return Math.min(...games.map(game => toTimestamp(game.basicInfo.releaseDate)))
    case 'lastRunAt':
      return Math.max(...games.map(game => toTimestamp(game.record.lastRunAt)))
    case 'custom':
      return Math.min(...games.map(game => game.sortNum ?? 0))
  }
  return 0
}

function compareLibraryItems(a: LibraryItem, b: LibraryItem) {
  const aValue = a.kind === 'game' ? gameSortValue(a.game) : seriesSortValue(a.summary)
  const bValue = b.kind === 'game' ? gameSortValue(b.game) : seriesSortValue(b.summary)

  let result: number
  if (typeof aValue === 'string' && typeof bValue === 'string') {
    result = aValue.localeCompare(bValue, 'zh-Hans-CN', {
      numeric: true,
      sensitivity: 'base'
    })
  } else {
    result = Number(aValue) - Number(bValue)
  }

  if (result !== 0) return gameStore.sortOrder === 'asc' ? result : -result
  return a.key.localeCompare(b.key)
}

const libraryItems = computed<LibraryItem[]>(() => {
  if (!seriesMode.value) {
    return gameStore.games.map(game => ({
      kind: 'game' as const,
      key: `game:${game.id}`,
      game
    }))
  }

  const items: LibraryItem[] = []
  for (const game of gameStore.games) {
    if (game.series) continue
    items.push({ kind: 'game', key: `game:${game.id}`, game })
  }
  for (const summary of seriesGroups.value) {
    items.push({ kind: 'series', key: `series:${summary.name}`, summary })
  }
  return items.sort(compareLibraryItems)
})

const sortItems = [
  { label: '添加时间', value: 'addedAt', action: () => gameStore.setSortType('addedAt') },
  { label: '名称', value: 'title', action: () => gameStore.setSortType('title') },
  { label: '游玩时长', value: 'playtime', action: () => gameStore.setSortType('playtime') },
  { label: '个人评分', value: 'score', action: () => gameStore.setSortType('score') },
  { label: '发售时间', value: 'releaseDate', action: () => gameStore.setSortType('releaseDate') },
  { label: '最近游玩', value: 'lastRunAt', action: () => gameStore.setSortType('lastRunAt') },
  { label: '自定义排序', value: 'custom', action: () => gameStore.setSortType('custom') },
]
const sortLabel = computed(() => sortItems.find(item => item.value === gameStore.sortType)?.label ?? '排序')
</script>


<style scoped>
/* ===== 全局布局 ===== */
.library-layout {
  --library-inset: clamp(20px, 4vw, 50px);
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f3f4f6;
  color: #111827;
  font-family: system-ui, -apple-system, BlinkMacSystemFont;
}

.drag-region {
  position: fixed;
  inset: 0 148px auto 0;
  height: 52px;
  display: flex;
  align-items: flex-end;
  padding-left: var(--library-inset);
  -webkit-app-region: drag;
}

.main-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin-top: 52px;
  padding: 12px var(--library-inset) 40px;
}

.library-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 12px 20px;
  margin-bottom: 20px;
}

.drag-region h1 {
  margin: 0;
  color: #23324b;
  font-size: 26px;
  font-weight: 750;
  line-height: 1.15;
  letter-spacing: -.045em;
}

.library-actions,
.sort-controls {
  display: flex;
  align-items: center;
}

.library-actions {
  flex-wrap: wrap;
  gap: 8px 12px;
}

.sort-controls {
  gap: 2px;
}

.library-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

.library-actions button:focus-visible {
  outline: 2px solid #5879cd;
  outline-offset: 2px;
}

.sort-button,
.sort-order-button,
.series-mode-button {
  background: transparent;
  color: #465873;
}

.sort-button:hover,
.sort-order-button:hover,
.series-mode-button:hover,
.series-mode-button.active {
  background: #e7ecf5;
  color: #3156b4;
}

.library-actions .add-button {
  padding-inline: 12px;
  background: #3156b4;
  color: white;
  font-weight: 600;
}

.add-button:hover {
  background: #274898;
}

/* 滚动条 */
.main-content::-webkit-scrollbar {
  width: 6px;
}
.main-content::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,.2);
  border-radius: 999px;
}
/* ===== Game Grid ===== */
.game-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 20px;
}
</style>

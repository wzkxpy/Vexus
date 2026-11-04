<!-- src/renderer/pages/Library/LibraryPage.vue -->
<template>
  <div class="library-layout">

    <header class="drag-region">
      <h1>Vexus</h1>
    </header>
    <main class="main-content">
      <div class="library-toolbar">
        <div class="library-actions">
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
        <GameCard
          v-for="game in gameStore.games"
          :key="game.id"
          :game="game"
        />
      </div>

    </main>

    <AddGameModal
      v-if="uiStore.activeModal === 'add-game'"
      @close="uiStore.activeModal = null"
    />
    
  </div>
</template>


<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/renderer/stores/game.store'
import GameCard from '@/renderer/components/GameCard.vue'
import AddGameModal from './AddGameModal.vue'
import { ArrowDown, ArrowUp, ChevronDown, Plus } from '@lucide/vue'
import { useUIStore } from '../../stores/ui.store'
import OptionsMenu from '@/renderer/components/OptionsMenu.vue'

const gameStore = useGameStore()
const uiStore = useUIStore()


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
.sort-order-button {
  background: transparent;
  color: #465873;
}

.sort-button:hover,
.sort-order-button:hover {
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

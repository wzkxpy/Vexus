<!-- src/renderer/pages/Library/LibraryPage.vue -->
<template>
  <div class="library-layout">

    <!-- ===== 悬浮顶栏 ===== -->
    <div class="floating-topbar">
      <div class="topbar-title">库</div>

      <div class="sort-controls">
        <OptionsMenu :items="sortItems" :selected="gameStore.sortType">
          <template #button>
            <button class="sort-button" title="选择排序方式" aria-label="选择排序方式">⇅</button>
          </template>
        </OptionsMenu>

        <button
          class="sort-order-button"
          @click="gameStore.setSortOrder()"
          :title="gameStore.sortOrder === 'asc' ? '当前：升序' : '当前：降序'"
        >
          {{ gameStore.sortOrder === 'asc' ? '↑' : '↓' }}
        </button>

      </div>

    </div>

    <!-- 右侧主内容 -->
    <main class="main-content">
      <!-- Grid -->
      <div class="game-grid">
        <GameCard
          v-for="game in gameStore.games"
          :key="game.id"
          :game="game"
        />
      </div>

    </main>

    <!-- 添加游戏弹窗 -->
    <div class="add-button" @click="uiStore.activeModal = 'add-game'">+</div>
    <AddGameModal
      v-if="uiStore.activeModal === 'add-game'"
      @close="uiStore.activeModal = null"
    />
    
  </div>
</template>


<script setup lang="ts">
import { useGameStore } from '@/renderer/stores/game.store'
import GameCard from '@/renderer/components/GameCard.vue'
import AddGameModal from './AddGameModal.vue'
import { useUIStore } from '../../stores/ui.store'
import OptionsMenu from '@/renderer/components/OptionsMenu.vue'

const gameStore = useGameStore()
const uiStore = useUIStore()


const sortItems = [
  { label: '按添加时间排序', value: 'addTime', action: () => gameStore.setSortType('addTime') },
  { label: '按名称排序', value: 'title', action: () => gameStore.setSortType('title') },
  { label: '按游玩时长排序', value: 'playtime', action: () => gameStore.setSortType('playtime') },
  { label: '按个人评分排序', value: 'score', action: () => gameStore.setSortType('score') },
  { label: '按发售时间排序', value: 'releaseDate', action: () => gameStore.setSortType('releaseDate') },
  { label: '按最近游玩排序', value: 'lastRunDate', action: () => gameStore.setSortType('lastRunDate') },
  { label: '自定义排序', value: 'custom', action: () => gameStore.setSortType('custom') },
]
</script>


<style scoped>
/* ===== 全局布局 ===== */
.library-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f3f4f6;
  color: #111827;
  font-family: system-ui, -apple-system, BlinkMacSystemFont;
}

/* ===== 悬浮顶栏 ===== */
.floating-topbar {
  position: fixed;
  top: 14px;
  left: 28px;
  right: 148px;
  z-index: 999;

  -webkit-app-region: drag;
  user-select: none;

  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 5px 7px 5px 18px;
  border: 1px solid rgba(226, 230, 238, .92);
  border-radius: 16px;
  background: rgba(255, 255, 255, .88);
  box-shadow: 0 7px 22px rgba(50, 61, 86, .07);
  backdrop-filter: blur(14px);
}

.topbar-title {
  color: #30394a;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: .01em;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border-radius: 10px;
  background: #f2f4f8;
  -webkit-app-region: no-drag;
}

.sort-button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #697486;
  font-size: 15px;
  cursor: pointer;
  transition: .16s ease;
}

.sort-button:hover {
  background: #ffffff;
  color: #4f72c4;
  box-shadow: 0 1px 5px rgba(55, 67, 94, .1);
}

.sort-order-button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  color: #697486;
  background: transparent;
  font-size: 15px;
  font-weight: 550;
  cursor: pointer;
  transition: .16s ease;
}

.sort-order-button:hover {
  color: #4f72c4;
  background: #fff;
  box-shadow: 0 1px 5px rgba(55, 67, 94, .1);
}

.sort-order-button:active {
  transform: scale(.94);
}

.sort-button:focus-visible,
.sort-order-button:focus-visible {
  outline: 2px solid rgba(98, 134, 220, .3);
  outline-offset: 1px;
}

/* ===== Main Content ===== */
.main-content {
  flex: 1;
  overflow-y: auto;
  margin-top: 52px;
  padding: 32px 50px 40px;
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
.add-button {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 44px;
  height: 44px;
  background: #4c8bf5;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  user-select: none;
}

/* ===== Game Detail 容器 ===== */
.game-detail {
  max-width: 720px;
  margin: 0 auto;
}

</style>

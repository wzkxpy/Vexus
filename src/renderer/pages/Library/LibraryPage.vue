<!-- src/renderer/pages/Library/LibraryPage.vue -->
<template>
  <div class="library-layout">

    <!-- ===== 悬浮顶栏 ===== -->
    <div class="floating-topbar">
      <div class="topbar-title">库</div>

      <div class="sort-controls">
        <OptionsMenu :items="sortItems" :selected="gameStore.sortType">
          <template #button>
            <button class="sort-button"> ⇅ </button> 
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
  { label: '按评分排序', value: 'score', action: () => gameStore.setSortType('score') },
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

/* ===== 新增：悬浮顶栏样式 ===== */
.floating-topbar {
  position: fixed;
  top: 15px;      /* 顶部留白 */
  left: 16px;     /* 左侧留白 */
  right: 140px;    /* 右侧留白 */
  z-index: 999;   /* 确保浮在最上层 */

  -webkit-app-region: drag;
  user-select: none;
  
  /* 视觉样式 */
  background: #ffffff;
  padding: 6px 24px;
  border-radius: 999px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04);
  
  /* 内部布局 */
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.topbar-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.2px;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: no-drag;
}
.sort-button {
  padding: 6px 10px;
  /* border: none; */
  border-radius: 7px;
  background: transparent;
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}
.sort-button:hover {
  background: white;
  /* border-color: rgba(99, 102, 241, 0.4); */
  transform: translateY(-1px);
}
.sort-button.active {
  transform: translateY(0);
  background: #ffffff;
  color: #111827;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.sort-order-button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  border: 1px solid rgba(148, 163, 184, 0.36);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition:
    background 150ms ease,
    border-color 150ms ease,
    transform 150ms ease;
}
.sort-order-button:hover {
  background: white;
  border-color: rgba(99, 102, 241, 0.4);
  transform: translateY(-1px);
}
.sort-order-button:active {
  transform: translateY(0);
}

/* ===== Main Content ===== */
.main-content {
  flex: 1;
  overflow-y: auto;
  margin-top: 50px;
  padding: 40px 50px 40px 50px; /* 上右下左 */
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
<!-- src/renderer/pages/Library/LibraryPage.vue -->
<template>
  <div class="library-layout">
    <div class="title-block"></div>

    <!-- 左侧侧边栏 -->
    <!-- <aside class="sidebar">
      <div class="sidebar-header">
        <input class="search" placeholder="搜索游戏…" />
      </div>
      <div
        v-for="game in gameStore.games"
        :key="game.id"
        class="sidebar-item"
        :class="{ active: game.id === gameStore.selectedId }"
        @click="gameStore.selectGame(game.id)"
      >
        {{ game.originalTitle }}
      </div>
    </aside> -->

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

const gameStore = useGameStore()
const uiStore = useUIStore()
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

/* ===== 空白占位 ===== */
.title-block{
  height: 10px;
  width: 100%;
}
/* ===== Sidebar ===== */
.sidebar {
  width: 210px;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.app-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 12px;
}

/* Sidebar Item */
.sidebar-item {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s;
}

.sidebar-item:hover {
  background: #f3f4f6;
}

.sidebar-item.active {
  background: #e0e7ff;
  color: #1e3a8a;
  font-weight: 600;
}

/* ===== Main Content ===== */
.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
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
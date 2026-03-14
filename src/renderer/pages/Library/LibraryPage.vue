<!-- src/renderer/pages/Library/LibraryPage.vue -->
<template>
  <div class="library-layout">

    <!-- 左侧侧边栏 -->
    <aside class="sidebar">

      <div class="sidebar-header">
        <input class="search" placeholder="搜索游戏…" />
      </div>
      <!-- 侧边列表的每项游戏 -->
      <div
        v-for="game in gameStore.games"
        :key="game.id"
        class="sidebar-item"
        :class="{ active: game.id === gameStore.selectedId }"
        @click="gameStore.selectGame(game.id)"
      >
        {{ game.originalTitle }}
      </div>
    </aside>

    <!-- 右侧主内容 -->
    <main class="main-content">

      <!-- 没选中游戏：显示 Grid -->
      <div v-if="!gameStore.selectedGame" class="game-grid">
        <GameCard
          v-for="game in gameStore.games"
          :key="game.id"
          :game="game"
        />
      </div>

      <!-- 选中游戏：显示详情 -->
      <GameDetail
        v-else
        @back="gameStore.selectGame(null)"
      />

    </main>
  </div>
</template>


<script setup lang="ts">
import { onMounted } from 'vue'
import { useGameStore } from '@/renderer/stores/game.store'
import GameDetail from './GameDetail.vue'
import GameCard from '@/renderer/components/GameCard.vue'

const gameStore = useGameStore()

onMounted(() => {
  gameStore.initGames()
})
</script>


<style scoped>
/* ===== 全局布局 ===== */
.library-layout {
  display: flex;
  height: 100%;
  background: #f3f4f6;
  color: #111827;
  font-family: system-ui, -apple-system, BlinkMacSystemFont;
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

.search {
  width: 100%;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  font-size: 13px;
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

/* ===== Game Detail 容器 ===== */
.game-detail {
  max-width: 720px;
  margin: 0 auto;
}

</style>
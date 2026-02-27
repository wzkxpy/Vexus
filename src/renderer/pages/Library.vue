// src/renderer/pages/Library.vue
<template>
  <div class="library-layout">
    <!-- 左侧侧边栏 -->
    <aside class="sidebar">

      <div class="sidebar-header">
        <!-- <div class="app-title">Vexus</div> -->
        <input class="search" placeholder="搜索游戏…" />
      </div>

      <div
        v-for="game in gameStore.games"
        :key="game.id"
        class="sidebar-item"
        :class="{ active: game.id === selectedGameId }"
        @click="selectedGameId = game.id"
      >
        {{ game.originalTitle }}
      </div>
    </aside>

    <!-- 右侧主内容 -->
    <main class="main-content">
      <!-- 没选中游戏：显示卡片 -->
      <div v-if="!selectedGameId" class="game-grid">
        <div
        v-for="game in gameStore.games"
        :key="game.id"
        class="game-card"
        @click="selectedGameId = game.id"
        >
          <div class="cover-placeholder">
            🎮
          </div>

          <div class="game-info">
            <div class="game-name">{{ game.originalTitle }}</div>
            <div class="game-data">{{ game.description }}</div>
          </div>
        </div>
      </div>

      <!-- 选中游戏：显示详情 -->
      <GameDetail
      v-else-if="selectedGame"
      :game="selectedGame"
      @back="selectedGameId = null"
      @launch="launchGame"
      @delete="handleDelete"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGameStore } from '@/renderer/stores/game.store'
import type { Game } from '@/shared/types'
import GameDetail from '@/renderer/components/GameDetail.vue'

// load game store
const gameStore = useGameStore()
// 当前选中的游戏 ID，初始为 null
const selectedGameId = ref<string | null>(null)
// 根据 游戏ID 从游戏列表中找到对应的游戏对象
const selectedGame = computed(() =>
  gameStore.games.find(g => g.id === selectedGameId.value) || null
)
// 删除游戏的处理函数
const handleDelete = async (game: Game) => {
  await gameStore.deleteGame(game.id)
  selectedGameId.value = null
}
// 组件挂载时，初始化游戏列表
onMounted(() => {
  gameStore.initGames()
})
// 启动游戏的处理函数
const launchGame = async (game: Game) => {
  console.log('launch game:', game)
  if (!game.exePath) {
    alert('该游戏尚未配置启动程序')
    return
  }
  try {
    await window.launchAPI.launchGame(game.exePath)
  } catch (err: any) {
    alert(err.message || '启动失败')
  }
}
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
  width: 220px;
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
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
}

/* ===== Game Card ===== */
.game-card {
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  overflow: hidden;
}

.game-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
}

/* 封面占位 */
.cover-placeholder {
  height: 220px;
  background: linear-gradient(135deg, #c7d2fe, #e0e7ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
}

/* 信息区 */
.game-info {
  padding: 12px;
}

.game-name {
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 14px;
}

.game-data {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

/* ===== Game Detail 容器 ===== */
.game-detail {
  max-width: 720px;
  margin: 0 auto;
}

</style>
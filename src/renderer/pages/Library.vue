// src/renderer/pages/Library.vue

<template>
  <div class="games-page">
    <h1>🎮 游戏列表页面</h1>

    <!-- 添加游戏（保持不变） -->
    <div class="add-game">
      <h2>➕ 添加新游戏</h2>

      <div class="form-item">
        <label>游戏名：</label>
        <input v-model="newGameName" placeholder="请输入游戏名" />
      </div>

      <div class="form-item">
        <label>游戏信息：</label>
        <input v-model="newGameData" placeholder="请输入游戏信息" />
      </div>

      <button @click="addGame">添加</button>
    </div>

    <!-- 游戏卡片区域 -->
    <div class="game-grid">
      <!-- <div
        v-for="game in games"
        :key="game.id"
        class="game-card"
        @contextmenu.prevent="onRightClick(game)"
      >
 -->
      <div
        v-for="game in gameStore.games"
        :key="game.id"
        class="game-card"
        @contextmenu.prevent="onRightClick(game.id, game.name)"
      >
        <div class="game-name">{{ game.name }}</div>
        <div class="game-data">{{ game.data }}</div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Game } from '@/shared/types'
import { useGameStore } from '@/renderer/stores/game.store'


const gameStore = useGameStore()
// 表单数据
const newGameName = ref('')
const newGameData = ref('')

// 页面加载
onMounted(() => {
  gameStore.initGames()
})

// 添加游戏
const addGame = async () => {
  if (!newGameName.value.trim()) {
    alert('请输入游戏名')
    return
  }

  await gameStore.addGame({
    name: newGameName.value,
    data: newGameData.value,
  })

  newGameName.value = ''
  newGameData.value = ''
}

// 右键删除
const onRightClick = async (gameId: string, gameName: string) => {
  const ok = confirm(`确定删除游戏「${gameName}」吗？`)
  if (!ok) return

  await gameStore.deleteGame(gameId)
}

</script>


<style scoped>
.games-page {
  padding: 16px;
  user-select: none; /* 禁止选中文本 */
}

/* 添加区域 */
.add-game {
  margin-bottom: 24px;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.form-item {
  margin-bottom: 8px;
}

input {
  margin-left: 8px;
  user-select: text; /* 允许选中输入框文本 */
}

/* 游戏卡片网格 */
.game-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

/* 单个游戏卡片 */
.game-card {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #ddd;
  background: #fafafa;
  cursor: default;
  user-select: none;
  transition: box-shadow 0.2s, transform 0.1s;
}

.game-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

/* 游戏名 */
.game-name {
  font-weight: bold;
  margin-bottom: 6px;
  font-size: 15px;
}

/* 游戏信息 */
.game-data {
  font-size: 13px;
  color: #555;
  word-break: break-all;
}
</style>

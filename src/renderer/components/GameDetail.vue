<!-- src/renderer/components/GameDetail.vue -->
<template>
  <div class="game-detail">
    <!-- 顶部操作栏 -->
    <div class="header">
      <button class="back-btn" @click="emit('back')">
        ← 返回
      </button>
    </div>

    <!-- 主信息 -->
    <div class="content">
      <h2 class="title">{{ game.originalTitle }}</h2>

      <div class="info-item">
        <span class="label">游戏信息：</span>
        <span class="value">{{ game.description || '（无）' }}</span>
      </div>

      <div class="actions">
        <button class="primary" @click="emit('launch', game)">
          ▶ 启动游戏
        </button>

        <button class="danger" @click="onDelete">
          🗑 删除游戏
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Game } from '@/shared/types'

const props = defineProps<{
  game: Game
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'launch', game: Game): void
  (e: 'delete', game: Game): void
}>()

const onDelete = () => {
  const ok = confirm(`确定删除游戏「${props.game.originalTitle}」吗？`)
  if (!ok) return

  emit('delete', props.game)
}
</script>

<style scoped>
.game-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 顶部栏 */
.header {
  display: flex;
  align-items: center;
}

.back-btn {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
  background: #fff;
  cursor: pointer;
}

/* 内容 */
.content {
  padding: 16px;
  border-radius: 10px;
  border: 1px solid #ddd;
  background: #fafafa;
}

.title {
  margin-bottom: 12px;
}

.info-item {
  margin-bottom: 16px;
  font-size: 14px;
}

.label {
  font-weight: bold;
}

.actions {
  display: flex;
  gap: 12px;
}

button.primary {
  background: #2563eb;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
}

button.danger {
  background: #ef4444;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
}
</style>

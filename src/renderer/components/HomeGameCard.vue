<!-- src/renderer/components/GameCard.vue -->
<template>
  <div class="game-card">

    <!-- 封面 -->
    <div class="cover" @click="select">
      <img
        v-if="game.media.coverPath"
        :src="game.media.coverPath"
        class="cover-img"
      />
    </div>

  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '@/renderer/stores/game.store'
import type { Game } from '@/shared/types'

const props = defineProps<{ game: Game }>()
const gameStore = useGameStore()

function select() {
  gameStore.setFeaturedGame(props.game.id)
}
</script>


<style scoped>

.game-card {
  border-radius: 12px;
  overflow: hidden;
  user-select: none;
  display: flex;
  flex-direction: column;
}

/* 封面容器 */
.cover {
  width: 100%;
  aspect-ratio: 7 / 10; /* 固定宽高比 */
  background: #2a2a2a;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden; /* 防止图片放大溢出 */
  position: relative;
}

/* 图片本体 */
.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  -webkit-user-drag: none; /* 禁止拖动图片 */
  transition: transform 0.3s ease; /* 平滑放大动画 */
  will-change: transform, filter; /* 提前告知浏览器优化 */
}


/* .cover:hover .cover-img { */
  /* transform: scale(1.08); 放大但不会溢出 */
  /* filter: blur(0.9px); 轻微模糊 */
/* } */

/* 标题 */
.game-title {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 550;
  text-align: center;
  color: #2d2d2d;
}
</style>
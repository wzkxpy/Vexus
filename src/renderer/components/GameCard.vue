<template>
  <div class="game-card">

    <div class="cover" @click="select">
      <img
        v-if="game.media.coverPath"
        :src="game.media.coverPath"
        class="cover-img"
      />

      <div v-else class="cover-placeholder">
        🎮
      </div>
    </div>

    <div class="game-title">
      {{ game.originalTitle }}
    </div>

  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '@/renderer/stores/game.store'
import type { Game } from '@/shared/types'

const props = defineProps<{ game: Game }>()

const gameStore = useGameStore()

function select() {
  gameStore.selectGame(props.game.id)
}
</script>


<style scoped>

.game-card {
  border-radius: 14px;
  transition: transform 0.15s, box-shadow 0.15s;
  overflow: hidden;
}

.cover {
  width: 100%;
  aspect-ratio: 3 / 4;
  background: #2a2a2a;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
}
.cover:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
}
.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
/* 封面占位 */
.cover-placeholder {
  width: 100%;
  aspect-ratio: 3 / 4;
  background: linear-gradient(135deg, #c7d2fe, #e0e7ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
}

.game-title {
  margin-top: 8px;
  font-size: 14px; 
  font-weight: 550; 
  text-align: center; 
  color: #2d2d2d; 
}
</style>
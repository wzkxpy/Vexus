<template>
  <div class="guide-panel">
    <h3>游戏攻略</h3>
    <p v-if="game?.guide" class="guide-content">{{ game.guide }}</p>
    <div v-else class="empty-guide">
      <span>◇</span>
      <p>暂未记录攻略内容</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useGameStore } from '@/renderer/stores/game.store'

const route = useRoute()
const gameStore = useGameStore()
const game = computed(() => gameStore.getGameById(route.params.id as string))
</script>

<style scoped>
.guide-panel {
  min-height: 210px;
  padding: 20px;
  border: 1px solid #e5e9f0;
  border-radius: 14px;
  background: rgba(255,255,255,.86);
  box-shadow: 0 7px 25px rgba(50,61,86,.04);
}
.guide-panel h3 { margin: 0 0 17px; color: #444e60; font-size: 14px; font-weight: 600; }
.guide-content { margin: 0; color: #586476; font-size: 14px; line-height: 1.9; white-space: pre-wrap; }
.empty-guide { min-height: 145px; display: grid; place-content: center; justify-items: center; color: #a0a8b6; }
.empty-guide span { margin-bottom: 6px; color: #b3bfd8; font-size: 24px; }
.empty-guide p { margin: 0; font-size: 13px; }
</style>

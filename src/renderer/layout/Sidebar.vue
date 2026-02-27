<template>
  <aside class="sidebar">
    <nav class="menu">
      <div class="item" @click="go('/library')">🎮</div>
      <div class="item" @click="go('/categories')">📂</div>
      <div class="item" @click="go('/stats')">📊</div>
    </nav>

    <!-- 添加按钮 -->
    <div class="add" @click="openAddGame">➕</div>

    <!-- 设置按钮 -->
    <div class="settings" @click="go('/settings')">⚙️</div>

    <!-- 添加游戏弹窗 -->
    <AddGameModal
      v-if="showAddGame"
      @close="showAddGame = false"
    />
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AddGameModal from '@/renderer/components/AddGameModal.vue'

const router = useRouter()
const showAddGame = ref(false)

function go(path: string) {
  router.push(path)
}

function openAddGame() {
  showAddGame.value = true
}
</script>

<style scoped>
.sidebar {
  width: 52px;
  background: var(--color-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  user-select: none;
}

.menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 24px;
}

.item,
.add,
.settings {
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.item:hover,
.add:hover,
.settings:hover {
  opacity: 1;
}

.add {
  margin-bottom: 12px;
}

.settings {
  margin-bottom: 16px;
}
</style>

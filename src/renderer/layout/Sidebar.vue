<template>
  <aside class="sidebar">

    <nav class="menu">
      <div class="item" @click="go('/library')">🎮</div>
      <div class="item" @click="go('/categories')">📂</div>
      <div class="item" @click="go('/stats')">📊</div>
    </nav>

    <div class="settings" @click="go('/settings')">⚙️</div>
  </aside>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function go(path: string) {
  router.push(path)
}
</script>

<style scoped>
.sidebar {
  width: 52px;
  background: var(--color-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  user-select: none; /* 禁止选中文本 */
}

.logo {
  height: 72px;
  display: flex;
  align-items: center;
  font-weight: bold;
}

.menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 24px;
}

.item,
.settings {
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.item:hover,
.settings:hover {
  opacity: 1;
}

.settings {
  margin-bottom: 16px;
}
</style>

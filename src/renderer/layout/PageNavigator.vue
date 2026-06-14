<!-- src/renderer/layout/PageNavigator.vue -->

<template>
  <transition name="nav-fade">
    <div
      v-if="showNavigator"
      class="navigator"
    >
      <button
        v-for="item in pages"
        :key="item.path"
        class="nav-item"
        :class="{ active: route.path === item.path }"
        @click="router.push(item.path)"
      >
        <!-- <component :is="item.icon" /> -->
         {{ item.icon }}
      </button>
    </div>
  </transition>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUIStore } from '../stores/ui.store'

const route = useRoute()
const router = useRouter()
const uiStore = useUIStore()

const pages = [
  {
    path: '/library',
    icon: 'L'
  },
  {
    path: '/dashboard',
    icon: 'D'
  },
  {
    path: '/settings',
    icon: 'S'
  }
]

const showNavigator = computed(() => {
  return ['library', 'dashboard', 'settings'].includes(uiStore.currentPage)
})
</script>

<style scoped> 
.navigator {
  position: fixed;
  left: 24px;
  bottom: 24px;
  /* width: 56px; */
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(20px);
  z-index: 500;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  user-select: none;
}

.nav-item {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: transparent;
  transition: all .25s ease;
}
.nav-item:hover {
  background: rgba(255,255,255,.08);
}
.nav-item.active {
  background: rgba(255,255,255,.15);
  transform: scale(1.08);
}

/* 导航器淡入淡出效果 */
.nav-fade-enter-active,
.nav-fade-leave-active {
  transition: all .3s ease;
}
.nav-fade-enter-from,
.nav-fade-leave-to {
  opacity: 0;
  transform: translateY(80px);
}
</style>
<!-- src/renderer/App.vue -->
<template>
  <AppLayout />
</template>

<script setup lang="ts">
import AppLayout from './layout/AppLayout.vue'
import { useRoute } from 'vue-router'
import router from './router'
import { onMounted, onUnmounted, watch } from 'vue'
import { useUIStore } from './stores/ui.store'

// 页面跳转
const route = useRoute()
const uiStore = useUIStore()

// let wheelLock = false
let scrollOffset = 0 // 累计滚动距离
let resetTimer: ReturnType<typeof setTimeout> | null = null
const THRESHOLD = 200 // 滚动阈值
const RESET_MS = 150  // 停止滚动多久后重置累加器

const handleWheel = (e: WheelEvent) => {
  if (!uiStore.canWheelRoute) return
  if (Math.abs(e.deltaY) < 60) return // 忽略小幅滚动（触控板抖动）
  
  // 方向变化时清空累计
  if (scrollOffset !== 0 && Math.sign(scrollOffset) !== Math.sign(e.deltaY)) { scrollOffset = 0 }
  scrollOffset += e.deltaY

  // 清除并重置定时器
  if (resetTimer) clearTimeout(resetTimer)
  resetTimer = setTimeout(() => { scrollOffset = 0 }, RESET_MS)

  if (uiStore.currentPage === 'home' && scrollOffset > THRESHOLD) {
    routePage('/library')
  }
  else if (uiStore.currentPage === 'library' && getLibraryTop() <= 5 && scrollOffset < -THRESHOLD) {
    routePage('/home')
  }
}

const getLibraryTop = () => {
  const el = document.querySelector('.main-content') 
  return el ? el.scrollTop : window.scrollY
}

const routePage = (targetPath: string) => {
  scrollOffset = 0
  router.push(targetPath)
}

onMounted(() => {
  window.addEventListener('wheel', handleWheel, { passive: true })
})
onUnmounted(() => {
  window.removeEventListener('wheel', handleWheel)
  if (resetTimer) clearTimeout(resetTimer)
})
watch(
  () => route.path,
  (path) => {
    if (path === '/home') uiStore.currentPage = 'home'
    else if (path === '/library') uiStore.currentPage = 'library'
    else if (path.startsWith('/game/')) uiStore.currentPage = 'game'
  },
  { immediate: true }
)
</script>

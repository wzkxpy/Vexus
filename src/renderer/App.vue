<!-- src/App.vue -->
<template>
  <AppLayout />
</template>

<script setup lang="ts">
import AppLayout from './layout/AppLayout.vue'
import { useRoute } from 'vue-router'
import router from './router'
import { onMounted, onUnmounted } from 'vue'

// 页面跳转
const route = useRoute()

let wheelLock = false
let scrollOffset = 0
let resetTimer: ReturnType<typeof setTimeout> | null = null
const THRESHOLD = 200
const RESET_MS = 150  // 停止滚动多久后重置累加器

const handleWheel = (e: WheelEvent) => {
  if (wheelLock) return
  if (Math.abs(e.deltaY) < 60) return // 忽略小幅滚动（触控板抖动）
  
  // 方向变化时清空累计
  if (scrollOffset !== 0 && Math.sign(scrollOffset) !== Math.sign(e.deltaY)) { scrollOffset = 0 }
  scrollOffset += e.deltaY

  // 清除并重置定时器
  if (resetTimer) clearTimeout(resetTimer)
  resetTimer = setTimeout(() => { scrollOffset = 0 }, RESET_MS)

  if (route.path === '/home' && scrollOffset > THRESHOLD) {
    routePage('/library')
  }
  else if (route.path === '/library' && getLibraryTop() <= 5 && scrollOffset < -THRESHOLD) {
    routePage('/home')
  }
}

const getLibraryTop = () => {
  const el = document.querySelector('.main-content') 
  return el ? el.scrollTop : window.scrollY
}

const routePage = (targetPath: string) => {
  wheelLock = true
  scrollOffset = 0
  router.push(targetPath)
  setTimeout(() => { wheelLock = false }, 850)
}

onMounted(() => {
  window.addEventListener('wheel', handleWheel, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('wheel', handleWheel)
})
</script>

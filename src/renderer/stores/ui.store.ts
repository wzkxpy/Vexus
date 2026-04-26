// src/renderer/stores/ui.store.ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const currentPage = ref<'home' | 'library' | 'game'>('home')
  const activeModal = ref<string | null>(null) // [null, 'add-game', 'session', 'media', 'edit-*']
  const isTransitioning = ref(false) // 页面切换动画中

  const canWheelRoute = computed(() => {
    return (
      !activeModal.value &&
      !isTransitioning.value &&
      ['home', 'library'].includes(currentPage.value) // 只有在首页和库页才允许滚轮切换页面
    )
  })

  return {
    currentPage,
    activeModal,
    isTransitioning,
    canWheelRoute
  }
})

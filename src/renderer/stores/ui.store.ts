// src/renderer/stores/ui.store.ts
// UI状态管理，包含当前页面、活动模态框、页面切换动画状态等
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const currentPage = ref<'home' | 'library' | 'game' | 'dashboard' | 'settings'>('home')
  const activeModal = ref<string | null>(null) // [null, 'add-game', 'session', 'media', 'character-sort', 'edit-*', 'titleSplit']
  const isTransitioning = ref(false) // 页面切换动画中

  const canWheelRoute = computed(() => { // 判断是否允许通过滚轮切换页面
    return (
      !activeModal.value &&
      !isTransitioning.value &&
       // 只有在首页、库页、仪表板页和设置页才允许滚轮切换页面
      ['home', 'library', 'dashboard', 'settings'].includes(currentPage.value)
    )
  })

  return {
    currentPage,
    activeModal,
    isTransitioning,
    canWheelRoute
  }
})

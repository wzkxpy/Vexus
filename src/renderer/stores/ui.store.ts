// src/renderer/stores/ui.store.ts
// UI状态管理，包含当前页面、活动模态框等
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const currentPage = ref<'library' | 'game' | 'dashboard' | 'settings'>('library')
  const activeModal = ref<string | null>(null) // [null, 'add-game', 'session', 'media', 'character-sort', 'edit-*', 'titleSplit']

  return {
    currentPage,
    activeModal
  }
})

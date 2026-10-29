<!-- src/renderer/App.vue -->
<template>
  <AppLayout />
</template>

<script setup lang="ts">
import AppLayout from './layout/AppLayout.vue'
import { useRoute } from 'vue-router'
import { watch } from 'vue'
import { useUIStore } from './stores/ui.store'

const route = useRoute()
const uiStore = useUIStore()

watch(
  () => route.path,
  (path) => {
    if (path === '/library') uiStore.currentPage = 'library'
    else if (path.startsWith('/game/')) uiStore.currentPage = 'game'
    else if (path === '/dashboard') uiStore.currentPage = 'dashboard'
    else if (path === '/settings') uiStore.currentPage = 'settings'
  },
  { immediate: true }
)
</script>

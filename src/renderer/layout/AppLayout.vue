<!-- /src/renderer/layout/AppLayout.vue -->
<template>
  <div class="app">
    <router-view v-slot="{ Component, route }">
      <transition
        :name="transitionName"
        @before-enter="onTransitionStart"
        @after-enter="onTransitionEnd"
      >
        <component
          :is="Component"
          :key="route.path"
          class="page-view"
        />
      </transition>
    </router-view>
    <PageNavigator />
  </div>

  <AppHeader />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './AppHeader.vue'
import { useUIStore } from '../stores/ui.store'
import PageNavigator from './PageNavigator.vue'

const route = useRoute()
const uiStore = useUIStore()
const transitionName = ref('slide-down')

const onTransitionStart = () => {
  uiStore.isTransitioning = true
}
const onTransitionEnd = () => {
  uiStore.isTransitioning = false
}

const pageLevel: Record<string, number> = {
  '/home': 0,
  '/library': 1,
  '/dashboard': 2,
  '/settings': 3
}
watch(
  () => route.path,
  (to, from) => {
    const fromLevel = pageLevel[from] ?? -1
    const toLevel = pageLevel[to] ?? -1

    // 不参与层级动画的页面 (例如 game page)
    if (fromLevel === -1 || toLevel === -1) {
      transitionName.value = ''
      return
    }

    if (toLevel > fromLevel) {
      transitionName.value = 'slide-down'
    } else if (toLevel < fromLevel) {
      transitionName.value = 'slide-up'
    } else {
      transitionName.value = ''
    }
  }
)
</script>


<style scoped>
.app {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.page-view {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* Home -> Library */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.8s cubic-bezier(0.22,1,0.36,1);
}

/* 新页面刚开始进入时：
完全透明，在下方 100px 的位置 */
.slide-down-enter-from {
  opacity: 0;
  transform: translateY(100px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-80px);
}

/* Library -> Home */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.8s cubic-bezier(0.22,1,0.36,1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(-100px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(80px);
}
</style>

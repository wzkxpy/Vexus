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
  </div>

  <TitleBar />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import TitleBar from './AppTitlebar.vue'
import { useUIStore } from '../stores/ui.store'

const route = useRoute()
const uiStore = useUIStore()
const transitionName = ref('slide-down')

const onTransitionStart = () => {
  uiStore.isTransitioning = true
}
const onTransitionEnd = () => {
  uiStore.isTransitioning = false
}

watch(
  () => route.path,
  (to, from) => {
    if (from === '/home' && to === '/library') {
      console.log('slide-down');
      transitionName.value = 'slide-down'
    } else if (from === '/library' && to === '/home') {
      console.log('slide-up');
      transitionName.value = 'slide-up'
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

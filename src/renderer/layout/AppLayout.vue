<!-- /src/renderer/layout/AppLayout.vue -->
<template>
  <div class="app">
    <router-view v-slot="{ Component, route }">
      <!-- 游戏库保活：返回时复用已有卡片 DOM 与滚动容器，避免封面重新加载。 -->
      <KeepAlive :include="['LibraryPage']">
        <component
          :is="Component"
          :key="route.path"
          class="page-view"
        />
      </KeepAlive>
    </router-view>
    <PageNavigator />
  </div>

  <AppHeader />
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue'
import PageNavigator from './PageNavigator.vue'
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
</style>

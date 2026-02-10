<template>
  <div class="app">
    <TitleBar />

    <div class="body">
      <Sidebar />

      <div class="content">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TitleBar from './Titlebar.vue'
import Sidebar from './Sidebar.vue'
</script>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.content {
  flex: 1;
  overflow: auto;
}
</style>

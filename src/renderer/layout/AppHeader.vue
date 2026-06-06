<!-- /src/renderer/layout/AppHeader.vue -->
<template>
  <div class="titlebar">
    <div class="drag-area"></div>
    <div class="window-controls">
      <button @click="minimize">—</button>
      <button @click="maximize">▢</button>
      <button class="close" @click="close">✕</button>
    </div>
  </div>
</template>


<script setup lang="ts">
const minimize = () => window.windowAPI.minimize()
const maximize = () => window.windowAPI.maximize()
const close = () => window.windowAPI.close()
</script>

<style scoped>
.titlebar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 55px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  z-index: 999;
}

.drag-area {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 38px;
  /* background-color: aqua; */
  -webkit-app-region: drag;
  pointer-events: auto;
} 
/* 右侧按钮容器 */
.window-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  /* padding: 6px; */
  margin-right: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  -webkit-app-region: no-drag;
  pointer-events: auto;
}

button {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #374151;
  font-size: 12px;
  cursor: pointer;
  transition:
    background 0.15s,
    transform 0.12s;
}
button:hover {
  background: rgba(0, 0, 0, 0.08);
}
button.close:hover {
  background: #e34451;
  color: white;
}
button:active {
  transform: scale(0.9);
}
</style>


<!-- /src/renderer/layout/AppHeader.vue -->
<template>
  <div class="window-controls">
    <button @click="minimize">—</button>
    <button @click="maximize">▢</button>
    <button class="close" @click="close">✕</button>
  </div>
</template>


<script setup lang="ts">
const minimize = () => window.windowAPI.minimize()
const maximize = () => window.windowAPI.maximize()
const close = () => window.windowAPI.close()
</script>

<style scoped>

.window-controls {
  position: fixed;
  top: 14px;
  right: 10px;
  z-index: 999;
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
  pointer-events: auto;
  user-select: none;
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


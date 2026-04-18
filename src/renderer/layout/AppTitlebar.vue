<!-- /src/renderer/layout/AppTitlebar.vue -->
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
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  /* background-color: rgb(255, 153, 0); */
  z-index: 9999;
}


/* 可拖动区域 */
.drag-area {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  right: 130px;
  /* background-color: aqua; */
  -webkit-app-region: drag;
}


/* 右侧按钮容器 */
.window-controls {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
}

/* 按钮样式 */
button {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: #000;
  font-size: 10px;
  cursor: pointer;
  transition: background 0.15s ease;
}

button:hover {
  background: rgba(0, 0, 0, 0.08);
}
button.close:hover {
  background: #e34451;
  color: white;
}

</style>


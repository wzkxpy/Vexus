<template>
  <div class="titlebar">
    <div class="drag-area">
      <span class="title">Vexus</span>

      <!-- 头像：紧贴标题 -->
      <div class="avatar">
        <img src="../assets/images/avatar.png" alt="avatar" />
      </div>
    </div>

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
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-primary);
  color: #fff;
  user-select: none;
}

/* 可拖动区域 */
.drag-area {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 12px;
  -webkit-app-region: drag;
}

/* 标题 */
.title {
  font-weight: 600;
  margin-left: 6px;
  margin-right: 4px;
}

/* 头像（在 drag-area 里，但不可拖拽） */
.avatar {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  /* -webkit-app-region: no-drag; */
}

.avatar img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

/* 右侧按钮 */
.window-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

button {
  width: 46px;
  height: 36px;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
}

button:hover {
  background: #333;
}

button.close:hover {
  background: #e81123;
}

</style>


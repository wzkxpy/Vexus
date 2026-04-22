<!-- /src/renderer/components/CloseButton.vue -->
<template>
  <button class="close-btn" @click="$emit('click')">✕</button>
</template>

<style scoped>
.close-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 10px;
  background: #f3f4f6;
  cursor: pointer;
}
.close-btn:hover {
  background: #e5e7eb;
}
</style>
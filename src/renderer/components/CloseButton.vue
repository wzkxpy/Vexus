<!-- /src/renderer/components/CloseButton.vue -->
<template>
  <button class="close-btn" aria-label="关闭" @click="$emit('click')">
    <X :size="16" :stroke-width="2" />
  </button>
</template>

<script setup lang="ts">
import { X } from '@lucide/vue'
</script>

<style scoped>
.close-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 10px;
  background: #f3f4f6;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4b5563;
}
.close-btn:hover {
  background: #e5e7eb;
}
</style>

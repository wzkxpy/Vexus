<template>
  <div class="dropdown-wrapper" ref="dropdownRef">
    <div @click="toggleMenu">
      <slot name="button">
        <!-- 默认按钮样式 -->
        <button class="default-btn">⚙</button>
      </slot>
    </div>

    <div v-if="showMenu" class="dropdown-menu">
      <div
        v-for="item in items"
        :key="item.label"
        class="menu-item"
        :class="{ danger: item.danger }"
        @click="handleClick(item)"
      >
        {{ item.label }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

interface MenuItem<T = any> {
  label: string
  action: (context?: T) => void | Promise<void>
  danger?: boolean
}

const props = defineProps<{
  items: MenuItem[]
  context?: any
}>()

const showMenu = ref(false)

const dropdownRef = ref<HTMLElement | null>(null) // 定义一个用于绑定根元素的 ref

const toggleMenu = () => (showMenu.value = !showMenu.value)
const closeMenu = () => (showMenu.value = false)

const handleClick = async (item: MenuItem) => {
  await item.action(props.context)
  closeMenu()
}

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (dropdownRef.value && !dropdownRef.value.contains(target)) {
    closeMenu()
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<style scoped>
.dropdown-wrapper {
  position: relative;
  display: inline-block;
}

.default-btn {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  width: 38px;
  height: 38px;
  /* padding: 6px 12px; */
  cursor: pointer;
}

.default-btn:hover {
  background: #e5e7eb;
}

.dropdown-menu {
  position: absolute;
  top: 110%;
  left: 0;
  min-width: 150px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 50;
}

.menu-item {
  padding: 8px 14px;
  font-size: 14px;
  cursor: pointer;
}

.menu-item:hover {
  background: #f3f4f6;
}

.menu-item.danger {
  color: #dc2626;
}

.menu-item.danger:hover {
  background: #fee2e2;
}
</style>

<!-- src/renderer/components/OptionsMenu.vue -->
<template>
  <div class="dropdown-wrapper" ref="dropdownRef">
    <div @click="toggleMenu">
      <slot name="button">
        <button
          class="default-btn"
          type="button"
          :aria-expanded="showMenu"
          aria-haspopup="menu"
          aria-label="Open options menu"
        >
          <span class="dot" />
          <span class="dot" />
          <span class="dot" />
        </button>
      </slot>
    </div>

    <Transition name="menu-pop">
      <div v-if="showMenu" class="dropdown-menu" role="menu">
        <button
          v-for="item in items"
          :key="item.label"
          class="menu-item"
          :class="{
            danger: item.danger,
            selected: item.value != null && selected != null && item.value === selected,
            checked: item.checked === true
          }"
          type="button"
          role="menuitem"
          @click="handleClick(item)"
        >
          <span class="indicator" />
          <span class="menu-label">{{ item.label }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

interface MenuItem<T = any> {
  label: string // 菜单项文本
  value?: string // 菜单项标识 (单选菜单用)
  checked?: boolean  // 多选状态用, 是否选中
  action: (context?: T) => void | Promise<void>
  danger?: boolean
}

const props = defineProps<{
  items: MenuItem[]
  context?: any // 传递给菜单项操作的上下文数据
  selected?: string // 当前选中项的值
}>()

const showMenu = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

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

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.dropdown-wrapper {
  position: relative;
  display: inline-block;
  color: #111827;
}

.default-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 38px;
  height: 38px;
  padding: 0;
  color: #475569;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid rgba(148, 163, 184, 0.36);
  border-radius: 12px;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.75);
  cursor: pointer;
  transition:
    color 160ms ease,
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.default-btn:hover {
  color: #0f172a;
  border-color: rgba(99, 102, 241, 0.38);
  background: #ffffff;
  box-shadow:
    0 10px 24px rgba(15, 23, 42, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  transform: translateY(-1px);
}

.default-btn:active {
  transform: translateY(0);
}

.default-btn:focus-visible {
  outline: 3px solid rgba(99, 102, 241, 0.22);
  outline-offset: 2px;
}

.dot {
  width: 4px;
  height: 4px;
  background: currentColor;
  border-radius: 999px;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 50;
  min-width: 168px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 12px;
  box-shadow:
    0 18px 45px rgba(15, 23, 42, 0.16),
    0 1px 0 rgba(255, 255, 255, 0.8) inset;
  backdrop-filter: blur(14px);
}

.menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 36px;
  padding: 8px 10px;
  color: #334155;
  font: inherit;
  font-size: 14px;
  line-height: 1.35;
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  transition:
    color 140ms ease,
    background-color 140ms ease,
    transform 140ms ease;
}

.indicator {
  width: 6px;
  height: 6px;
  margin-right: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  opacity: 0;
}
.menu-item.selected .indicator,
.menu-item.checked .indicator {
  opacity: 1;
  background: #6366f1;
}

.menu-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-item:hover,
.menu-item:focus-visible {
  color: #0f172a;
  background: #f1f5f9;
  outline: none;
  transform: translateX(2px);
}

.menu-item.danger {
  color: #dc2626;
}

.menu-item.danger:hover,
.menu-item.danger:focus-visible {
  color: #b91c1c;
  background: #fee2e2;
}

.menu-pop-enter-active,
.menu-pop-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
  transform-origin: top left;
}

.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

</style>

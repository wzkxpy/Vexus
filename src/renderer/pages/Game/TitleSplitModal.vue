<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal">
      <!-- Header -->
      <div class="modal-header">
        <div>
          <h3>划分主副标题</h3>
        </div>
        <CloseButton @click="emit('close')" />
      </div>
      
      <!-- Body -->
      <div class="modal-body">
        <!-- 原名 -->
        <div class="section">
          <div class="label">原名</div>

          <div class="title-row">
            <template v-for="(char, index) in originalChars" :key="index">
              <span class="boundary"
                :class="[{ active: isOriginalBoundaryActive(index) },
                         { disabled: !canOriginalBoundary(index) }]"
                @click="handleOriginalBoundary(index)"
              >
                |
              </span>
              <span :class="[getOriginalCharClass(index), { space: char === ' ' }]">
                {{ char }}
              </span>
            </template>

            <span
              class="boundary"
              :class="{ active: isOriginalBoundaryActive(originalChars.length) }"
              @click="handleOriginalBoundary(originalChars.length)"
            >
              |
            </span>
          </div>
        </div>

        <!-- 译名 -->
        <div v-if="localizedTitle" class="section">
          <div class="label">译名</div>

          <div class="title-row">
            <template v-for="(char, index) in localizedChars" :key="index">
              <span
                class="boundary"
                :class="[{ active: isLocalizedBoundaryActive(index) },
                         { disabled: !canLocalizedBoundary(index) }]"
                @click="handleLocalizedBoundary(index)"
              >
                |
              </span>
              <span :class="[getLocalizedCharClass(index), { space: char === ' ' }]">
                {{ char }}
              </span>
            </template>

            <span
              class="boundary"
              :class="{ active: isLocalizedBoundaryActive(localizedChars.length) }"
              @click="handleLocalizedBoundary(localizedChars.length)"
            >
              |
            </span>
          </div>

        </div>

        <div class="actions">
          <button @click="reset">清除</button>
          <button @click="autoSplit">自动</button>
          <button class="primary" @click="save">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TitleSplit } from '@/shared/types'
import { computeTitleSplit } from '@/shared/utils/title'
import CloseButton from '@/renderer/components/CloseButton.vue'

const props = defineProps<{
  originalTitle: string
  localizedTitle?: string
  initialSplit: TitleSplit
}>()

const emit = defineEmits<{
  close: []
  save: [split: TitleSplit]
}>()

const originalSplit = ref<[number | null, number | null]>([
  props.initialSplit[0],
  props.initialSplit[1]
])
const localizedSplit = ref<[number | null, number | null]>([
  props.initialSplit[2],
  props.initialSplit[3]
])

const originalPhase = ref<'main' | 'sub'>('main')
const localizedPhase = ref<'main' | 'sub'>('main')

const originalChars = computed(() => [...props.originalTitle])
const localizedChars = computed(() => [...(props.localizedTitle ?? '')])

// 点击逻辑
function handleOriginalBoundary(index: number) {
  if (originalPhase.value === 'main') {
    originalSplit.value[0] = index
    originalSplit.value[1] = null
    originalPhase.value = 'sub'
  } else {
    const mainEnd = originalSplit.value[0]
    if (mainEnd != null && index < mainEnd) {
      return
    }
    originalSplit.value[1] = index
    originalPhase.value = 'main'
  }
}
function handleLocalizedBoundary(index: number) {
  if (localizedPhase.value === 'main') {
    localizedSplit.value[0] = index
    localizedSplit.value[1] = null
    localizedPhase.value = 'sub'
  } else {
    const mainEnd = localizedSplit.value[0]
    if (mainEnd != null && index < mainEnd) {
      return
    }
    localizedSplit.value[1] = index
    localizedPhase.value = 'main'
  }
}

// 判断字符样式属于主标题、分隔符还是副标题
function getCharClass(
  index: number,
  split: [number | null, number | null]
) {
  const [mainEnd, subStart] = split
  if (mainEnd == null || subStart == null) {
    return 'main'
  }
  if (index < mainEnd) return 'main'
  if (index < subStart) return 'gap'
  return 'sub'
}

function getOriginalCharClass(index: number) {
  return getCharClass(index, originalSplit.value)
}

function getLocalizedCharClass(index: number) {
  return getCharClass(index, localizedSplit.value)
}

// 判断 boundary 是否处于选中状态
function isOriginalBoundaryActive(index: number) {
  return (
    originalSplit.value[0] === index ||
    originalSplit.value[1] === index
  )
}
function isLocalizedBoundaryActive(index: number) {
  return (
    localizedSplit.value[0] === index ||
    localizedSplit.value[1] === index
  )
}

// 判断 boundary 是否可选
function canOriginalBoundary(index: number) {
  if (originalPhase.value === 'main') {
    return true
  }
  const mainEnd = originalSplit.value[0]
  return mainEnd == null || index >= mainEnd
}
function canLocalizedBoundary(index: number) {
  if (localizedPhase.value === 'main') {
    return true
  }
  const mainEnd = localizedSplit.value[0]
  return mainEnd == null || index >= mainEnd
}

// 重置划分状态
function reset() {
  originalSplit.value = [null, null]
  localizedSplit.value = [null, null]
  originalPhase.value = 'main'
  localizedPhase.value = 'main'
}

// 自动划分
function autoSplit() {
  const split = computeTitleSplit(props.originalTitle, props.localizedTitle)
  originalSplit.value = [split[0], split[1]]
  localizedSplit.value = [split[2], split[3]]
  originalPhase.value = 'main'
  localizedPhase.value = 'main'
}

// 保存划分结果
// function save() {
//   const titleSplit: TitleSplit = [
//     originalSplit.value[0],
//     originalSplit.value[1],
//     localizedSplit.value[0],
//     localizedSplit.value[1]
//   ]
//   gameActions.updateTitleSplit(route.params.id as string, titleSplit)
//   uiStore.activeModal = null
// }
function save() {
  emit('save', [
    originalSplit.value[0],
    originalSplit.value[1],
    localizedSplit.value[0],
    localizedSplit.value[1]
  ])
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modal {
  width: 760px;
  max-width: 90vw;
  background: white;
  border-radius: 12px;
  user-select: none;
}

.modal-header {
  padding: 20px 28px 16px;
  border-bottom: 1px solid #eef1f4;
  display: flex;
  justify-content: space-between;
  align-items: start;
}
.modal-header h3 {
  margin: 0;
  color: #111827;
}
.modal-header p {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.modal-body {
  padding: 24px 28px;
}

.section {
  margin-bottom: 28px;
}

.label {
  margin-bottom: 12px;
  color: #aaa;
}

.title-row {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
  word-break: break-all;
  background: #f4f4f4;
  border-radius: 22px;
  padding: 12px 20px 16px 20px;
}

.boundary {
  font-size: 28px;
  font-weight: 400;
  color: #d8d8d8;
  cursor: pointer;
}
.boundary:hover {
  color: #888888;
}
.boundary.active {
  color: #323232;
}
.boundary.disabled {
  opacity: 0.15; /*  */
  pointer-events: none;
}

.main {
  color: #474747;
}
.gap {
  color: #ccc;
}
.sub {
  color: #6aa9ff;
}

/* 空格样式 */
.space {
  min-width: 0.4em;
  display: inline-block;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

button {
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.primary {
  background: #4d8dff;
  color: white;
}
</style>
<template>
  <div class="overlay" @mousedown.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="route-editor-title">
      <div class="modal-header">
        <div>
          <h3 id="route-editor-title">编辑线路</h3>
        </div>
        <button class="close-btn" aria-label="关闭" :disabled="saving" @click="emit('close')">×</button>
      </div>

      <div class="route-list">
        <div
          v-for="(route, index) in draftRoutes"
          :key="route.id"
          class="route-item"
          :class="{ dragging: draggedIndex === index, 'drag-over': dragOverIndex === index }"
          @dragover.prevent="dragOverIndex = index"
          @drop.prevent="handleDrop(index)"
        >
          <span
            class="drag-handle"
            title="拖动排序"
            aria-label="拖动排序"
            draggable="true"
            @dragstart="handleDragStart(index, $event)"
            @dragend="resetDrag"
          >⋮</span>
          <span class="route-number">{{ index + 1 }}</span>
          <input v-model="route.name" type="text" maxlength="80" placeholder="线路名称" @input="errorMessage = ''" />
          <select v-model="route.type">
            <option
              v-for="option in ROUTE_TYPE_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <div class="move-actions">
            <button title="上移" :disabled="index === 0" @click="moveRoute(index, index - 1)">↑</button>
            <button title="下移" :disabled="index === draftRoutes.length - 1" @click="moveRoute(index, index + 1)">↓</button>
            <button class="delete-btn" title="删除" @click="removeRoute(index)">×</button>
          </div>
        </div>

        <div v-if="draftRoutes.length === 0" class="empty-list">尚未添加线路</div>
      </div>

      <button class="add-btn" @click="addRoute">＋ 添加线路</button>
      <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

      <div class="modal-actions">
        <button class="cancel-btn" :disabled="saving" @click="emit('close')">取消</button>
        <button class="save-btn" :disabled="saving" @click="saveRoutes">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ROUTE_TYPE_OPTIONS, type Route } from '@/shared/types'
import { useRouteStore } from '@/renderer/stores/route.store'

const props = defineProps<{ gameId: string; routes: Route[] }>()
const emit = defineEmits<{ close: [] }>()
const routeStore = useRouteStore()

const draftRoutes = ref<Route[]>(props.routes
  .slice()
  .sort((a, b) => a.order - b.order)
  .map(route => ({ ...route })))
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const saving = ref(false)
const errorMessage = ref('')

// 编辑器数组位置就是线路的全局编号，任何增删和移动后都重新连续编号。
const normalizeOrder = () => {
  draftRoutes.value.forEach((route, index) => { route.order = index + 1 })
}

const addRoute = () => {
  draftRoutes.value.push({
    id: crypto.randomUUID(),
    gameId: props.gameId,
    name: '',
    description: undefined,
    color: '',
    type: draftRoutes.value.length === 0 ? 'common' : 'character',
    order: draftRoutes.value.length + 1,
    status: 'NotStarted',
    playtime: 0
  })
  errorMessage.value = ''
}

const removeRoute = (index: number) => {
  draftRoutes.value.splice(index, 1)
  normalizeOrder()
  errorMessage.value = ''
}

const moveRoute = (from: number, to: number) => {
  if (from === to || to < 0 || to >= draftRoutes.value.length) return
  const [route] = draftRoutes.value.splice(from, 1)
  draftRoutes.value.splice(to, 0, route)
  normalizeOrder()
  errorMessage.value = ''
}

const handleDragStart = (index: number, event: DragEvent) => {
  draggedIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

const handleDrop = (index: number) => {
  if (draggedIndex.value !== null) moveRoute(draggedIndex.value, index)
  resetDrag()
}

const resetDrag = () => {
  draggedIndex.value = null
  dragOverIndex.value = null
}

const saveRoutes = async () => {
  if (draftRoutes.value.some(route => !route.name.trim())) {
    errorMessage.value = '请填写每条线路的名称。'
    return
  }

  saving.value = true
  errorMessage.value = ''
  normalizeOrder()
  try {
    await routeStore.saveGameRoutes(props.gameId, draftRoutes.value.map(route => ({ ...route })))
    emit('close')
  } catch (error) {
    console.error('Failed to save routes:', error)
    errorMessage.value = '保存失败，原有线路未改变，请重试。'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(27, 34, 48, 0.58);
}

.modal {
  display: flex;
  flex-direction: column;
  width: min(780px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  padding: 22px;
  border: 1px solid #e1e5ed;
  border-radius: 15px;
  color: #354052;
  background: #fff;
  box-shadow: 0 24px 70px rgba(27, 37, 57, 0.25);
}

.modal-header { display: flex; justify-content: space-between; gap: 16px; }
.modal-header h3 { margin: 0; font-size: 18px; }
.modal-header p { margin: 7px 0 0; color: #8a94a5; font-size: 13px; }

.close-btn {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 7px;
  color: #7b8698;
  background: #f2f4f7;
  font-size: 21px;
  cursor: pointer;
}

.route-list { overflow-y: auto; min-height: 90px; margin-top: 20px; padding-right: 5px; }
.route-list::-webkit-scrollbar { width: 6px; }
.route-list::-webkit-scrollbar-thumb { border-radius: 999px; background: #cbd2df; }
.route-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  padding: 9px 10px;
  gap: 9px;
  border: 1px solid #e6eaf1;
  border-radius: 10px;
  background: #fafbfc;
  transition: border-color 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
}
.route-item.dragging { opacity: 0.42; }
.route-item.drag-over { border-color: #7697e4; transform: translateY(2px); }
.drag-handle {
  flex: 0 0 auto;
  padding: 5px 2px;
  color: #a5adba;
  cursor: grab;
  font-size: 22px;
  line-height: 1;
  user-select: none;
}
.drag-handle:active { cursor: grabbing; }
.route-number { flex: 0 0 auto; width: 25px; color: #7d889b; text-align: center; font-size: 12px; }

.route-item input,
.route-item select {
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  border: 1px solid #dfe4ed;
  border-radius: 7px;
  color: #465064;
  background: #fff;
  outline: none;
}
.route-item input { flex: 1; }
.route-item select { width: 112px; }
.route-item input:focus,
.route-item select:focus { border-color: #7899e2; box-shadow: 0 0 0 2px rgba(93, 130, 216, 0.12); }

.move-actions { display: flex; gap: 4px; }
.move-actions button {
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid #dfe4ed;
  border-radius: 6px;
  color: #60708a;
  background: #fff;
  cursor: pointer;
}
.move-actions button:hover:not(:disabled) { color: #456bc3; border-color: #bdcbed; background: #f2f6fd; }
.move-actions button:disabled { opacity: 0.35; cursor: default; }
.move-actions .delete-btn:hover { color: #c64f5d; border-color: #e8bdc3; background: #fff4f5; }

.empty-list { display: grid; min-height: 90px; place-items: center; color: #9aa3b1; font-size: 13px; }
.add-btn {
  align-self: flex-start;
  margin-top: 10px;
  padding: 8px 13px;
  border: 1px dashed #bdc9dc;
  border-radius: 8px;
  color: #5673b2;
  background: #f6f8fc;
  cursor: pointer;
}
.error-message { margin: 10px 0 0; color: #c84d5a; font-size: 13px; }
.modal-actions { display: flex; justify-content: flex-end; margin-top: 18px; gap: 9px; }
.modal-actions button { min-width: 82px; padding: 8px 15px; border-radius: 8px; font-size: 13px; cursor: pointer; }
.cancel-btn { color: #687386; border: 1px solid #dfe3ea; background: #fff; }
.save-btn { color: #fff; border: 1px solid #557bd3; background: #5d82d8; }
.modal-actions button:disabled,
.close-btn:disabled { opacity: 0.5; cursor: default; }

@media (max-width: 620px) {
  .overlay { padding: 12px; }
  .modal { max-height: calc(100vh - 24px); padding: 16px; }
  .route-item { flex-wrap: wrap; }
  .route-item input { flex-basis: calc(100% - 70px); }
  .route-item select { margin-left: 50px; }
  .move-actions { margin-left: auto; }
}
</style>

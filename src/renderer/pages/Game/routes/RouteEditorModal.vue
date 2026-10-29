<template>
  <div class="overlay" @mousedown.self="!saving && emit('close')">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="route-editor-title">
      <div class="modal-header">
        <div>
          <h3 id="route-editor-title">编辑线路</h3>
        </div>
        <button class="close-btn" aria-label="关闭" :disabled="saving" @click="emit('close')">
          <X :size="16" />
        </button>
      </div>

      <div class="list-heading"><span>线路列表 <b>{{ draftRoutes.length }}</b></span></div>
      <div class="route-list">
        <fieldset class="route-fields" :disabled="saving">
        <div
          v-for="(route, index) in draftRoutes"
          :key="route.id"
          class="route-item"
          :style="{ '--route-color': routeColor(route) }"
          :class="{ dragging: draggedIndex === index, 'drag-over': dragOverIndex === index, 'is-common': route.type === 'common' }"
          @dragover.prevent="draggedIndex !== null && (dragOverIndex = index)"
          @drop.prevent="handleDrop(index)"
        >
          <span
            class="drag-handle"
            title="拖动排序"
            aria-label="拖动排序"
            draggable="true"
            @dragstart="handleDragStart(index, $event)"
            @dragend="resetDrag"
          ><GripVertical :size="15" /></span>
          <span class="route-number">{{ index + 1 }}</span>
          <select v-model="route.type" aria-label="线路类型" @change="handleTypeChange(route)">
            <option
              v-for="option in ROUTE_TYPE_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <input v-model="route.name" type="text" maxlength="80" placeholder="线路名称" aria-label="线路名称" @input="errorMessage = ''" />
          <button
            v-if="route.type !== 'common'"
            class="lock-button"
            :class="{ active: route.lockCondition }"
            :popovertarget="`route-lock-${route.id}`"
            :aria-label="`${route.name || '未命名线路'}的剧情锁设置`"
            aria-haspopup="dialog"
            @click="positionLockPanel($event)"
          >
            剧情锁<ChevronDown :size="13" aria-hidden="true" />
          </button>
          <span v-else class="common-note">无剧情锁</span>
          <div class="color-control">
            <label class="color-picker" title="选择线路颜色">
              <input type="color" :value="routeColor(route)" :aria-label="`${route.name || '未命名线路'}的颜色`" @input="setRouteColor(route, $event)" />
            </label>
            <button type="button" class="reset-color" :disabled="!route.color" title="恢复类型默认颜色" @click="route.color = ''">重置</button>
          </div>
          <button type="button" class="delete-btn" :aria-label="`删除${route.name || '未命名线路'}`" title="删除线路" @click="removeRoute(index)"><Trash2 :size="14" /></button>
          <div
            v-if="route.type !== 'common'"
            :id="`route-lock-${route.id}`"
            class="lock-editor"
            popover="auto"
            role="dialog"
            :aria-label="`${route.name || '未命名线路'}的剧情锁设置`"
            :style="lockPanelStyle"
          >
            <div class="lock-heading">剧情锁设置</div>
            <div v-if="canResetLock(route)" class="lock-warning">
              <button type="button" @click="resetLock(route)">重新上锁</button>
            </div>
              <label class="lock-mode">
                解锁条件
                <select :value="route.lockCondition?.mode ?? lockModes[route.id] ?? 'all'" @change="setLockMode(route, $event)">
                  <option value="all">全部前置线路通关</option>
                  <option value="any">任一前置线路通关</option>
                </select>
              </label>
              <div class="prerequisites" role="group" :aria-label="`${route.name || '未命名线路'}的前置线路`">
                <label v-for="candidate in prerequisiteOptions(index)" :key="candidate.id" class="prerequisite">
                  <input :checked="route.lockCondition?.preRouteIds.includes(candidate.id) ?? false" type="checkbox" @change="setPrerequisite(route, candidate.id, $event)" />
                  <span>{{ candidate.name.trim() || '未命名线路' }}</span>
                </label>
              </div>
          </div>
        </div>

        <div v-if="draftRoutes.length === 0" class="empty-list"><strong>从第一条线路开始</strong><span>添加共通线、个人线或章节，构建你的剧情树。</span></div>
        </fieldset>
      </div>

      <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

      <div class="modal-actions">
        <button class="add-btn" :disabled="saving" @click="addRoute">＋ 添加线路</button>
        <button class="cancel-btn" :disabled="saving" @click="emit('close')">取消</button>
        <button class="save-btn" :disabled="saving" @click="saveRoutes">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronDown, GripVertical, Trash2, X } from '@lucide/vue'
import { getRouteLockState } from '@/shared/routeLocks'
import { ROUTE_TYPE_OPTIONS, type Route } from '@/shared/types'
import { useRouteStore } from '@/renderer/stores/route.store'

const props = defineProps<{ gameId: string; routes: Route[] }>()
const emit = defineEmits<{ close: [] }>()
const routeStore = useRouteStore()

// 嵌套条件也必须复制，取消编辑不能修改 store 中的原始数据。
const copyRoute = (route: Route): Route => ({
  ...route,
  lockCondition: route.type !== 'common' && route.lockCondition?.preRouteIds.length ? {
    mode: route.lockCondition.mode,
    unlocked: route.lockCondition.unlocked,
    preRouteIds: [...route.lockCondition.preRouteIds]
  } : null
})

const draftRoutes = ref<Route[]>(props.routes
  .slice()
  .sort((a, b) => a.order - b.order)
  .map(copyRoute))
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const saving = ref(false)
const resetLockIds = ref<string[]>([])
const prerequisiteStates = computed(() => {
  const latest = new Map(props.routes.map(route => [route.id, route.status]))
  return new Map(draftRoutes.value.map(route => [route.id, { ...route, status: latest.get(route.id) ?? route.status }]))
})
// 已解锁与当前满足条件是两件事；只有条件不满足时重锁才有意义。
const canResetLock = (route: Route) => Boolean(!resetLockIds.value.includes(route.id) && route.lockCondition?.unlocked &&
  !getRouteLockState(route, prerequisiteStates.value)?.conditionsMet)
const resetLock = (route: Route) => {
  if (!canResetLock(route)) return
  resetLockIds.value.push(route.id)
}
const errorMessage = ref('')
const lockPanelStyle = ref<Record<string, string>>({})
// 模式属于未保存草稿；未选前置时更改模式不应创建剧情锁。
const lockModes = ref<Record<string, 'all' | 'any'>>({})
const setLockMode = (route: Route, event: Event) => {
  const mode = (event.target as HTMLSelectElement).value === 'any' ? 'any' : 'all'
  lockModes.value[route.id] = mode
  if (route.lockCondition) route.lockCondition.mode = mode
  errorMessage.value = ''
}
const setPrerequisite = (route: Route, id: string, event: Event) => {
  const mode = route.lockCondition?.mode ?? lockModes.value[route.id] ?? 'all'
  const ids = new Set(route.lockCondition?.preRouteIds ?? [])
  if ((event.target as HTMLInputElement).checked) ids.add(id)
  else ids.delete(id)
  lockModes.value[route.id] = mode
  route.lockCondition = ids.size ? { mode, preRouteIds: [...ids], unlocked: route.lockCondition?.unlocked ?? false } : null
  errorMessage.value = ''
}
const defaultColors: Record<Route['type'], string> = {
  common: '#5d82d8', chapter: '#7b70c9', character: '#d77e9c', main: '#4f9b82'
}
// 空颜色保留类型默认色，切换类型时仍可自动跟随。
const routeColor = (route: Route) => /^#[0-9a-f]{6}$/i.test(route.color) ? route.color : defaultColors[route.type]
const setRouteColor = (route: Route, event: Event) => {
  route.color = (event.target as HTMLInputElement).value
}

// 以草稿中的实际位置为准，拖动排序后选项立即更新。
const prerequisiteOptions = (index: number) =>
  draftRoutes.value.slice(0, index).filter(route => route.type !== 'common')

const invalidPrerequisiteIds = (index: number) => {
  const allowed = new Set(prerequisiteOptions(index).map(route => route.id))
  return draftRoutes.value[index].lockCondition?.preRouteIds.filter(id => !allowed.has(id)) ?? []
}

const removeInvalidPrerequisites = (index: number) => {
  const condition = draftRoutes.value[index].lockCondition
  if (!condition) return
  const invalid = new Set(invalidPrerequisiteIds(index))
  condition.preRouteIds = condition.preRouteIds.filter(id => !invalid.has(id))
  if (!condition.preRouteIds.length) {
    lockModes.value[draftRoutes.value[index].id] = condition.mode
    draftRoutes.value[index].lockCondition = null
  }
  errorMessage.value = ''
}

const handleTypeChange = (route: Route) => {
  if (route.type === 'common') route.lockCondition = null
  cleanPrerequisites()
  errorMessage.value = ''
}

const closeLockPanels = () => {
  document.querySelectorAll<HTMLElement>('.lock-editor:popover-open').forEach(panel => panel.hidePopover())
}

const positionLockPanel = (event: MouseEvent) => {
  const button = event.currentTarget as HTMLButtonElement
  const rect = button.getBoundingClientRect()
  const width = Math.min(320, window.innerWidth - 24)
  const spaceBelow = window.innerHeight - rect.bottom - 12
  const openAbove = spaceBelow < 300 && rect.top > spaceBelow
  // 原生 popover 位于顶层，不受线路列表的 overflow 裁剪。
  lockPanelStyle.value = {
    width: `${width}px`,
    left: `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`,
    top: openAbove ? 'auto' : `${rect.bottom + 8}px`,
    bottom: openAbove ? `${window.innerHeight - rect.top + 8}px` : 'auto',
    maxHeight: `${Math.max(0, (openAbove ? rect.top - 12 : spaceBelow) - 8)}px`
  }
}

// 列表滚动或窗口改变后关闭面板，避免面板脱离触发按钮。
const handleScroll = (event: Event) => {
  if (event.target instanceof Element && event.target.closest('.lock-editor')) return
  closeLockPanels()
}
onMounted(() => {
  window.addEventListener('resize', closeLockPanels)
  document.addEventListener('scroll', handleScroll, true)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', closeLockPanels)
  document.removeEventListener('scroll', handleScroll, true)
})

// 编辑器数组位置就是线路的全局编号，任何增删和移动后都重新连续编号。
const normalizeOrder = () => {
  draftRoutes.value.forEach((route, index) => { route.order = index + 1 })
}

const cleanPrerequisites = () => {
  // 排序或类型变化后按最终草稿清理，空条件直接关闭剧情锁。
  draftRoutes.value.forEach((_, index) => removeInvalidPrerequisites(index))
  resetLockIds.value = resetLockIds.value.filter(id => draftRoutes.value.some(route => route.id === id && route.lockCondition &&
    !getRouteLockState(route, prerequisiteStates.value)?.conditionsMet))
}

const addRoute = () => {
  draftRoutes.value.push({
    id: crypto.randomUUID(),
    gameId: props.gameId,
    name: '',
    description: null,
    color: '',
    type: draftRoutes.value.length === 0 ? 'common' : 'character',
    order: draftRoutes.value.length + 1,
    lockCondition: null,
    status: 'NotStarted',
    playtime: 0
  })
  errorMessage.value = ''
}

const removeRoute = (index: number) => {
  const dependents = draftRoutes.value.filter(route => route.lockCondition?.preRouteIds.includes(draftRoutes.value[index].id))
  if (dependents.length) {
    errorMessage.value = `无法删除：${dependents.map(route => `「${route.name || '未命名线路'}」`).join('、')}仍依赖此线路，请先修改剧情锁条件。`
    return
  }
  draftRoutes.value.splice(index, 1)
  normalizeOrder()
  errorMessage.value = ''
}

const moveRoute = (from: number, to: number) => {
  if (from === to || to < 0 || to >= draftRoutes.value.length) return
  const [route] = draftRoutes.value.splice(from, 1)
  draftRoutes.value.splice(to, 0, route)
  normalizeOrder()
  cleanPrerequisites()
  errorMessage.value = ''
}

const handleDragStart = (index: number, event: DragEvent) => {
  if (saving.value) { event.preventDefault(); return }
  draggedIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

const handleDrop = (index: number) => {
  if (saving.value) return
  if (draggedIndex.value !== null) moveRoute(draggedIndex.value, index)
  resetDrag()
}

const resetDrag = () => {
  draggedIndex.value = null
  dragOverIndex.value = null
}

const saveRoutes = async () => {
  if (saving.value) return
  if (draftRoutes.value.some(route => !route.name.trim())) {
    errorMessage.value = '请填写每条线路的名称。'
    return
  }

  cleanPrerequisites()

  saving.value = true
  closeLockPanels()
  errorMessage.value = ''
  normalizeOrder()
  try {
    await routeStore.saveGameRoutes(props.gameId, draftRoutes.value.map(copyRoute), resetLockIds.value.filter(id => draftRoutes.value.some(route => route.id === id && route.lockCondition)))
    emit('close')
  } catch (error) {
    console.error('Failed to save routes:', error)
    const message = error instanceof Error ? error.message : String(error)
    errorMessage.value = message.includes('Circular route prerequisites')
      ? '剧情锁存在循环依赖，请检查前置线路，不能互相等待解锁。'
      : message.includes('Prerequisite route must exist in the same game')
        ? '前置线路不存在，请重新选择剧情锁条件。'
        : '保存失败，原有线路未改变，请重试。'
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
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: min(880px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  padding: 18px 26px;
  border: 1px solid #e1e5ed;
  border-radius: 15px;
  color: #354052;
  background: #fff;
  box-shadow: 0 24px 70px rgba(27, 37, 57, 0.25);
}

.modal-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.modal-header h3 { margin: 0; font-size: 18px; }

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 7px;
  color: #7b8698;
  background: #f2f4f7;
  cursor: pointer;
}

/* fieldset 有特殊的内部布局；由外层 flex 子项收缩并承担滚动。 */
.list-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 14px; margin-bottom: 8px; font-size: 12px; color: #657189; }
.list-heading b { display: inline-block; margin-left: 6px; padding: 2px 7px; border-radius: 6px; background: #edf2fc; color: #5d82d8; font-size: 11px; }
.route-list { flex: 1 1 auto; overflow-y: auto; min-width: 0; min-height: 0; padding-right: 5px; }
.route-fields { min-width: 0; margin: 0; padding: 0; border: 0; }
.modal-header, .add-btn, .modal-actions { flex-shrink: 0; }
.route-list::-webkit-scrollbar { width: 6px; }
.route-list::-webkit-scrollbar-thumb { border-radius: 999px; background: #cbd2df; }
.route-item {
  display: grid;
  grid-template-columns: 18px 24px 96px minmax(100px, 1fr) 88px 70px 28px;
  align-items: center;
  margin-bottom: 8px;
  padding: 14px 12px;
  gap: 9px;
  border: 1px solid #e6eaf1;
  border-left: 3px solid var(--route-color);
  border-radius: 10px;
  background: #fafbfc;
  transition: border-color 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
}
.route-item.dragging { opacity: 0.42; }
.route-item:hover { background: #f7f9fd; }
.route-item.drag-over { border-color: #7697e4; box-shadow: 0 -3px 0 #7697e4; }
.drag-handle {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  padding: 5px 2px;
  color: #a5adba;
  cursor: grab;
  line-height: 1;
  user-select: none;
}
.drag-handle:active { cursor: grabbing; }
.route-number { flex: 0 0 auto; width: 25px; color: #7d889b; text-align: center; font-size: 12px; }

.route-item input[type="text"],
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
.route-item input[type="text"] { flex: 1; }
.route-item > select { width: 100%; }
.route-item input:focus,
.route-item select:focus { border-color: #7899e2; box-shadow: 0 0 0 2px rgba(93, 130, 216, 0.12); }

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid #dfe4ed;
  border-radius: 6px;
  color: #60708a;
  background: #fff;
  cursor: pointer;
}
.delete-btn:hover:not(:disabled) { color: #c64f5d; border-color: #e8bdc3; background: #fff4f5; }
.color-control { display: flex; align-items: center; gap: 6px; }
.color-picker { display: flex; width: 28px; height: 28px; overflow: hidden; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px #dfe4ed; }
.color-picker input { width: 100%; height: 100%; padding: 0; border: 0; background: transparent; cursor: pointer; }
.color-picker input::-webkit-color-swatch-wrapper { padding: 0; }
.color-picker input::-webkit-color-swatch { border: 0; border-radius: 50%; }
.reset-color { border: 0; padding: 3px 0; color: #7a879b; background: transparent; font-size: 11px; cursor: pointer; }
.reset-color:disabled { opacity: 0.4; cursor: default; }
.common-note { text-align: center; color: #a0a8b6; font-size: 11px; }
button:focus-visible, .color-picker:focus-within { outline: 2px solid #7899e2; outline-offset: 3px; }

.empty-list { display: flex; flex-direction: column; gap: 9px; min-height: 150px; justify-content: center; align-items: center; color: #9aa3b1; font-size: 12px; text-align: center; }
.empty-list strong { color: #657189; font-size: 14px; }
.add-btn {
  margin-right: auto;
  padding: 8px 13px;
  border: 1px dashed #bdc9dc;
  border-radius: 8px;
  color: #5673b2;
  background: #f6f8fc;
  cursor: pointer;
}
.error-message { margin: 10px 0 0; color: #c84d5a; font-size: 13px; }
.modal-actions { display: flex; justify-content: flex-end; margin-top: 12px; padding-top: 10px; border-top: 1px solid #edf0f5; gap: 9px; }
.modal-actions button { min-width: 82px; padding: 8px 15px; border-radius: 8px; font-size: 13px; cursor: pointer; }
.cancel-btn { color: #687386; border: 1px solid #dfe3ea; background: #fff; }
.save-btn { color: #fff; border: 1px solid #557bd3; background: #5d82d8; }
.modal-actions button:disabled,
.close-btn:disabled { opacity: 0.5; cursor: default; }

.lock-button { display: flex; align-items: center; justify-content: center; gap: 5px; height: 34px; padding: 0 9px; border: 1px solid #dfe4ed; border-radius: 7px; color: #788397; background: #fff; font-size: 12px; white-space: nowrap; cursor: pointer; }
.lock-button:hover, .lock-button.active { color: #5076c5; border-color: #b9cbee; background: #eef4ff; }
.lock-button:focus-visible { outline: 2px solid #7899e2; outline-offset: 2px; }
.lock-button:disabled { opacity: 0.5; cursor: default; }
.lock-editor { position: fixed; inset: auto; box-sizing: border-box; margin: 0; padding: 16px; overflow-y: auto; border: 1px solid #dce4f0; border-radius: 12px; background: #fff; color: #465064; box-shadow: 0 12px 36px rgba(32, 48, 78, 0.18); font-size: 12px; }
.lock-heading { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; font-size: 14px; font-weight: 600; }
.lock-heading small { color: #8a94a5; font-size: 12px; font-weight: 400; overflow-wrap: anywhere; }
.lock-mode { display: flex; align-items: center; gap: 8px; }
.lock-mode { flex-wrap: wrap; margin-top: 14px; }
.lock-mode select { width: 100%; max-width: 100%; }
.prerequisites { display: flex; flex-direction: column; gap: 4px; max-height: 180px; overflow-y: auto; margin-top: 10px; }
.prerequisite { display: flex; align-items: flex-start; gap: 6px; min-width: 0; max-width: 100%; padding: 7px 6px; border-radius: 6px; cursor: pointer; }
.prerequisite:hover { background: #f2f6fd; }
.prerequisite span { overflow-wrap: anywhere; }
.lock-editor input[type="checkbox"] { flex: 0 0 auto; accent-color: #5d82d8; }
.lock-hint { margin: 8px 0 0; color: #7d889b; line-height: 1.5; }
.lock-warning { margin-top: 10px; color: #b56334; line-height: 1.5; }
.lock-warning button { display: block; margin-top: 6px; padding: 5px 8px; border: 1px solid #ecd4c4; border-radius: 6px; background: #fff8f2; color: inherit; cursor: pointer; }
.error-message { overflow-wrap: anywhere; }
.add-btn:disabled { opacity: 0.5; cursor: default; }

@media (max-width: 760px) {
  .overlay { padding: 12px; }
  .modal { max-height: calc(100vh - 24px); padding: 12px 16px; }
  .route-item { grid-template-columns: 16px 20px minmax(74px, 1fr) minmax(70px, 1fr) 28px; gap: 9px; padding: 12px 9px; }
  .route-item > input[type="text"] { grid-column: 3 / 5; grid-row: 1; }
  .route-item > select { grid-column: 3; grid-row: 2; }
  .lock-button, .common-note { grid-column: 4; grid-row: 2; }
  .color-control { grid-column: 3 / 5; grid-row: 3; }
  .delete-btn { grid-column: 5; grid-row: 1; }
  .route-number { width: 18px; }
  .route-item input[type="text"], .route-item > select { box-sizing: border-box; width: 100%; padding: 0 5px; }
  .lock-button { padding: 0 5px; gap: 3px; }
  .list-heading { align-items: flex-start; }
}
</style>

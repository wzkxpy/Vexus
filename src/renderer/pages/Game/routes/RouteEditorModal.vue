<template>
  <div class="overlay" @mousedown.self="!saving && emit('close')">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="route-editor-title">
      <div class="modal-header">
        <h3 id="route-editor-title">编辑线路</h3>
        <button class="close-btn" aria-label="关闭" :disabled="saving" @click="emit('close')">
          <X :size="16" />
        </button>
      </div>

      <div class="tabs" role="tablist">
        <button type="button" role="tab" class="tab" :class="{ active: activeTab === 'routes' }"
          :aria-selected="activeTab === 'routes'" @click="switchTab('routes')">线路</button>
        <button type="button" role="tab" class="tab" :class="{ active: activeTab === 'tree' }"
          :aria-selected="activeTab === 'tree'" @click="switchTab('tree')">线路树</button>
      </div>

      <div v-show="activeTab === 'routes'" class="tab-panel routes-panel" role="tabpanel" aria-label="线路数据">
        <div class="routes-toolbar">
          <button class="add-btn" :disabled="saving" @click="addRoute"><Plus :size="15" />添加线路</button>
        </div>

        <div class="route-table">
          <div class="route-table-head" aria-hidden="true">
            <span>类型</span>
            <span>线路名称</span>
            <span>剧情锁</span>
            <span>颜色</span>
            <span>操作</span>
          </div>
          <div class="route-list" ref="routeListElement">
            <fieldset class="route-fields" :disabled="saving">
              <div v-for="route in draftRoutes" :key="route.id" class="route-row">
                <div class="type-cell">
                  <select v-model="route.type" aria-label="线路类型" @change="handleTypeChange(route)">
                    <option v-for="option in ROUTE_TYPE_OPTIONS" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </div>
                <input v-model="route.name" class="name-input" type="text" maxlength="80" placeholder="线路名称" aria-label="线路名称" @input="errorMessage = ''" />
                <div class="lock-cell">
                  <button v-if="route.type !== 'common'" type="button" class="icon-btn lock-trigger"
                    :class="{ active: route.lockCondition }"
                    :popovertarget="`route-lock-${route.id}`"
                    :aria-label="route.lockCondition ? '修改剧情锁' : '设置剧情锁'"
                    aria-haspopup="dialog" @click="positionLockPanel($event)">
                    <Lock v-if="route.lockCondition" :size="15" />
                    <LockOpen v-else :size="15" />
                  </button>
                  <span v-else class="empty-mark">—</span>
                </div>
                <div class="color-cell">
                  <label class="color-swatch" :style="{ background: routeColor(route) }">
                    <input type="color" :value="routeColor(route)" :aria-label="`${route.name || '未命名线路'}的颜色`" @input="setRouteColor(route, $event)" />
                  </label>
                </div>
                <button type="button" class="icon-btn delete-btn" :aria-label="`删除${route.name || '未命名线路'}`" @click="removeRoute(route)"><Trash2 :size="15" /></button>

                <div v-if="route.type !== 'common'" :id="`route-lock-${route.id}`" class="lock-editor" popover="auto"
                  role="dialog" :aria-label="`${route.name || '未命名线路'}的剧情锁设置`" :style="lockPanelStyle">
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
                    <label v-for="candidate in prerequisiteOptions(route.id)" :key="candidate.id" class="prerequisite">
                      <input :checked="route.lockCondition?.preRouteIds.includes(candidate.id) ?? false" type="checkbox" @change="setPrerequisite(route, candidate.id, $event)" />
                      <span>{{ candidate.name.trim() || '未命名线路' }}</span>
                    </label>
                  </div>
                </div>
              </div>

              <div v-if="draftRoutes.length === 0" class="empty-list"><strong>还没有线路</strong></div>
            </fieldset>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'tree'" class="tab-panel tree-panel" role="tabpanel" aria-label="线路树结构">
        <div class="tree-toolbar">
          <div v-if="draftTree.roots.length" class="tree-hint">拖动节点调整位置；拖线路到节点上加分支</div>
          <div class="tree-actions">
            <button type="button" class="tool-btn" :disabled="saving || !draftTree.roots.length" @click="autoArrange">自动整理</button>
            <button type="button" class="tool-btn danger" :disabled="saving || !draftTree.roots.length" @click="clearTree">清空线路树</button>
            <button type="button" class="tool-btn" :disabled="saving" aria-label="缩小" @click="zoomOut">−</button>
            <span class="zoom-label">{{ Math.round(scale * 100) }}%</span>
            <button type="button" class="tool-btn" :disabled="saving" aria-label="放大" @click="zoomIn">+</button>
            <button type="button" class="tool-btn" :disabled="saving" @click="resetZoom">100%</button>
          </div>
        </div>

        <div class="tree-body">
          <aside ref="trayElement" class="tray" :class="{ 'drop-remove': trayDragOver }">
            <div class="tray-heading">未放入线路 <b>{{ trayRoutes.length }}</b></div>
            <div class="tray-subhint">拖节点到这里移出树</div>
            <div class="tray-list">
              <div v-for="route in trayRoutes" :key="route.id" class="tray-chip" draggable="true"
                @dragstart="startRouteDrag(route.id, $event)" @dragend="endDrag">
                <span class="tray-dot" :style="{ background: routeColor(route) }"></span>
                <span class="tray-name">{{ route.name }}</span>
              </div>
            </div>
            <div class="tray-heading">分叉点</div>
            <div class="tray-list tray-tools">
              <div class="tray-chip fork-chip" draggable="true" @dragstart="startForkDrag($event)" @dragend="endDrag">
                <span class="fork-glyph"></span>
                <span class="tray-name">拖到连接线上</span>
              </div>
            </div>
          </aside>

          <div class="tree-scroll" @dragover.prevent @drop.prevent="handleCanvasDrop">
            <div v-if="!draftTree.roots.length" class="canvas-empty">把线路拖到这里作为根节点</div>
            <div class="tree-zoom" :style="{ width: `${canvasLayout.width * scale}px`, height: `${canvasLayout.height * scale}px` }">
              <div class="tree-canvas" ref="canvasElement"
                :style="{ width: `${canvasLayout.width}px`, height: `${canvasLayout.height}px`, transform: `scale(${scale})` }">
                <svg class="edge-layer" :width="canvasLayout.width" :height="canvasLayout.height" aria-hidden="true">
                  <path v-for="edge in canvasLayout.edges" :key="`${edge.from.id}-${edge.childIndex}`" :d="edgePath(edge)" />
                </svg>

                <svg v-if="dragPayload?.kind === 'fork'" class="edge-hit-layer" :width="canvasLayout.width" :height="canvasLayout.height">
                  <path v-for="edge in canvasLayout.edges" :key="`hit-${edge.from.id}-${edge.childIndex}`"
                    class="edge-hit" :class="{ active: dragOverEdgeKey === edgeKey(edge) }" :d="edgePath(edge)"
                    @dragover.prevent.stop="dragOverEdgeKey = edgeKey(edge)"
                    @dragleave.stop="dragOverEdgeKey === edgeKey(edge) && (dragOverEdgeKey = null)"
                    @drop.prevent.stop="dropOnEdge(edge, $event)" />
                </svg>

                <div v-for="node in routeNodes" :key="node.id" class="editor-node"
                  :class="{ dragging: dragState?.pointId === node.id, 'drop-child': dropTarget === node.id, 'drop-parent': dragParentTargetId === node.id }"
                  :style="{ left: `${node.x}px`, top: `${node.y}px`, width: `${node.width}px`, height: `${node.height}px`, borderLeftColor: nodeColor(node) }"
                  draggable="false"
                  @pointerdown="startNodeDrag(node, $event)"
                  @dragover.prevent.stop="setDropTarget(node.id)"
                  @dragleave.stop="clearDropTarget(node.id)"
                  @drop.prevent.stop="dropOnNode(node)">
                  <div class="editor-node-copy" aria-hidden="true">
                    <strong><span v-for="(line, index) in node.nameLines" :key="index">{{ line }}</span></strong>
                    <small>{{ routeTypeLabel(node.route?.type) }}</small>
                  </div>
                </div>

                <div v-for="node in forkNodes" :key="node.id" class="editor-fork"
                  :class="{ dragging: dragState?.pointId === node.id, 'drop-active': dropTarget === node.id, 'drop-parent': dragParentTargetId === node.id }"
                  :style="{ left: `${node.x}px`, top: `${node.y}px` }"
                  draggable="false" title="分叉点"
                  @pointerdown="startNodeDrag(node, $event)"
                  @dragover.prevent.stop="setDropTarget(node.id)"
                  @dragleave.stop="clearDropTarget(node.id)"
                  @drop.prevent.stop="dropOnNode(node)">
                  <span class="fork-diamond"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Lock, LockOpen, Plus, Trash2, X } from '@lucide/vue'
import { getRouteLockState } from '@/shared/routeLocks'
import { getRouteColor, nextRouteColor } from '@/shared/routeColors'
import { treeRouteIds } from '@/shared/routeTree'
import {
  ROUTE_TYPE_OPTIONS,
  type Route,
  type RouteTree,
  type RouteType
} from '@/shared/types'
import { useRouteStore } from '@/renderer/stores/route.store'
import { useSessionStore } from '@/renderer/stores/session.store'
import {
  autoLayoutRouteTree,
  buildRouteLayout,
  findChildSlot,
  measureRouteNode,
  routeTreeEdgePath,
  type RouteLayoutNode,
  type RouteTreeEdge
} from './routeTree'
import {
  addForkOnEdge,
  addRootRoute,
  addRouteAsChild,
  cloneTree,
  findPointContext,
  movePoint,
  movePointSubtree,
  movePointTo,
  pointSubtreeIds,
  removePoint,
  removeRouteFromTree
} from './routeEditorModel'

const props = defineProps<{ gameId: string; routes: Route[]; tree: RouteTree; initialTab?: 'routes' | 'tree' }>()
const emit = defineEmits<{ close: [] }>()
const routeStore = useRouteStore()
const sessionStore = useSessionStore()
const routeColor = getRouteColor

const activeTab = ref<'routes' | 'tree'>(props.initialTab === 'tree' ? 'tree' : 'routes')

// 嵌套条件也必须复制，取消编辑不能修改 store 中的原始数据。
const copyRoute = (route: Route): Route => ({
  ...route,
  lockCondition: route.type !== 'common' && route.lockCondition?.preRouteIds.length ? {
    mode: route.lockCondition.mode,
    unlocked: route.lockCondition.unlocked,
    preRouteIds: [...route.lockCondition.preRouteIds]
  } : null
})

const draftRoutes = ref<Route[]>(props.routes.map(copyRoute))
const draftTree = ref<RouteTree>(cloneTree(props.tree))
const routesById = computed(() => new Map(draftRoutes.value.map(route => [route.id, route])))

const routeTypeLabel = (type?: RouteType) =>
  ROUTE_TYPE_OPTIONS.find(option => option.value === type)?.label ?? ''

const routeListElement = ref<HTMLElement | null>(null)

const addRoute = async () => {
  draftRoutes.value.push({
    id: crypto.randomUUID(),
    gameId: props.gameId,
    name: '',
    description: null,
    color: nextRouteColor(draftRoutes.value.map(route => route.color)),
    type: draftRoutes.value.length === 0 ? 'common' : 'character',
    lockCondition: null,
    status: 'NotStarted',
    playtime: 0
  })
  errorMessage.value = ''
  await nextTick()
  // 新线路不预填名称，直接把焦点放到最后一行的名称输入框。
  const inputs = routeListElement.value?.querySelectorAll<HTMLInputElement>('.name-input')
  const input = inputs?.[inputs.length - 1]
  input?.scrollIntoView({ block: 'nearest' })
  input?.focus()
}

const removeRoute = (route: Route) => {
  const dependents = draftRoutes.value.filter(item => item.lockCondition?.preRouteIds.includes(route.id))
  if (dependents.length) {
    errorMessage.value = `无法删除：${dependents.map(item => `「${item.name || '未命名线路'}」`).join('、')}仍依赖此线路，请先修改剧情锁条件。`
    return
  }
  removeRouteFromTree(draftTree.value, route.id)
  draftRoutes.value = draftRoutes.value.filter(item => item.id !== route.id)
  cleanPrerequisites()
  errorMessage.value = ''
}

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
const setRouteColor = (route: Route, event: Event) => {
  route.color = (event.target as HTMLInputElement).value
}
const handleTypeChange = (route: Route) => {
  if (route.type === 'common') route.lockCondition = null
  cleanPrerequisites()
  errorMessage.value = ''
}
// 树不再参与前置线路的先后判断，候选是所有其它非共通线，循环由主进程校验。
const prerequisiteOptions = (routeId: string) =>
  draftRoutes.value.filter(route => route.id !== routeId && route.type !== 'common')

const cleanPrerequisites = () => {
  draftRoutes.value.forEach(route => {
    const condition = route.lockCondition
    if (!condition) return
    const allowed = new Set(draftRoutes.value
      .filter(item => item.id !== route.id && item.type !== 'common')
      .map(item => item.id))
    condition.preRouteIds = condition.preRouteIds.filter(id => allowed.has(id))
    if (!condition.preRouteIds.length) {
      lockModes.value[route.id] = condition.mode
      route.lockCondition = null
    }
  })
  resetLockIds.value = resetLockIds.value.filter(id => draftRoutes.value.some(route => route.id === id && route.lockCondition &&
    !getRouteLockState(route, prerequisiteStates.value)?.conditionsMet))
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
  lockPanelStyle.value = {
    width: `${width}px`,
    left: `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`,
    top: openAbove ? 'auto' : `${rect.bottom + 8}px`,
    bottom: openAbove ? `${window.innerHeight - rect.top + 8}px` : 'auto',
    maxHeight: `${Math.max(0, (openAbove ? rect.top - 12 : spaceBelow) - 8)}px`
  }
}
const handleScroll = (event: Event) => {
  if (event.target instanceof Element && event.target.closest('.lock-editor')) return
  closeLockPanels()
}

const textContext = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
const measureName = (text: string, size: number) => {
  if (!textContext) return Array.from(text).length * size
  textContext.font = `700 ${size}px sans-serif`
  return textContext.measureText(text).width
}

const canvasElement = ref<HTMLElement | null>(null)
const trayElement = ref<HTMLElement | null>(null)
const trayDragOver = ref(false)
const canvasLayout = computed(() => buildRouteLayout(draftTree.value, routesById.value, measureName))
const routeNodes = computed(() => canvasLayout.value.nodes.filter(node => !node.isFork))
const forkNodes = computed(() => canvasLayout.value.nodes.filter(node => node.isFork))
const edgePath = (edge: RouteTreeEdge) => routeTreeEdgePath(edge)
const nodeColor = (node: RouteLayoutNode) => node.route ? routeColor(node.route) : undefined
const placedIds = computed(() => treeRouteIds(draftTree.value))
const trayRoutes = computed(() => draftRoutes.value.filter(route => !placedIds.value.has(route.id)))

const scale = ref(1)
const zoomIn = () => { scale.value = Math.min(2, Math.round((scale.value + 0.1) * 10) / 10) }
const zoomOut = () => { scale.value = Math.max(0.5, Math.round((scale.value - 0.1) * 10) / 10) }
const resetZoom = () => { scale.value = 1 }

const autoArrange = () => {
  if (saving.value || !draftTree.value.roots.length) return
  autoLayoutRouteTree(draftTree.value, routesById.value, measureName)
  errorMessage.value = ''
}

const clearTree = () => {
  if (saving.value || !draftTree.value.roots.length) return
  draftTree.value.roots = []
  errorMessage.value = ''
}

type DragPayload = { kind: 'route'; routeId: string } | { kind: 'fork' }
const dragPayload = ref<DragPayload | null>(null)
const dragOverEdgeKey = ref<string | null>(null)
const dropTarget = ref<string | null>(null)

const startRouteDrag = (routeId: string, event: DragEvent) => {
  if (saving.value) {
    event.preventDefault()
    return
  }
  dragPayload.value = { kind: 'route', routeId }
  event.dataTransfer?.setData('text/plain', routeId)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
const startForkDrag = (event: DragEvent) => {
  if (saving.value) {
    event.preventDefault()
    return
  }
  dragPayload.value = { kind: 'fork' }
  event.dataTransfer?.setData('text/plain', 'fork')
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}
const endDrag = () => {
  dragPayload.value = null
  dragOverEdgeKey.value = null
  dropTarget.value = null
}
const setDropTarget = (pointId: string) => {
  dropTarget.value = pointId
}
const clearDropTarget = (pointId: string) => {
  if (dropTarget.value === pointId) dropTarget.value = null
}
const edgeKey = (edge: RouteTreeEdge) => `${edge.from.id}:${edge.childIndex}`

const clientToWorld = (clientX: number, clientY: number) => {
  const canvas = canvasElement.value
  if (!canvas) return { x: 0, y: 0 }
  const rect = canvas.getBoundingClientRect()
  return {
    x: (clientX - rect.left) / scale.value,
    y: (clientY - rect.top) / scale.value
  }
}

const eventToWorld = (event: DragEvent) => clientToWorld(event.clientX, event.clientY)

const finishDrop = (message = '') => {
  errorMessage.value = message
  endDrag()
}

const dropOnNode = (node: RouteLayoutNode) => {
  const payload = dragPayload.value
  if (!payload || saving.value) { endDrag(); return }
  if (payload.kind !== 'route') {
    finishDrop('分叉点需要拖到连接线上。')
    return
  }
  const route = routesById.value.get(payload.routeId)
  if (!route) {
    finishDrop('无法放置：线路不存在。')
    return
  }
  const size = measureRouteNode(route, measureName)
  const slot = findChildSlot(node, size.width, size.height, canvasLayout.value.nodes)
  const id = addRouteAsChild(draftTree.value, node.id, payload.routeId)
  if (id) movePoint(draftTree.value, id, slot.x, slot.y)
  finishDrop(id ? '' : '无法放置：目标节点不存在或该线路已经在树中。')
}

const dropOnEdge = (edge: RouteTreeEdge, event: DragEvent) => {
  const payload = dragPayload.value
  if (!payload || payload.kind !== 'fork' || saving.value) { endDrag(); return }
  const { x, y } = eventToWorld(event)
  const id = addForkOnEdge(draftTree.value, edge.from.id, edge.childIndex, x, y)
  finishDrop(id ? '' : '无法在这条连线上放置。')
}

const handleCanvasDrop = (event: DragEvent) => {
  const payload = dragPayload.value
  if (!payload || saving.value) { endDrag(); return }
  if (payload.kind !== 'route') {
    finishDrop('根线路必须是一条线路。')
    return
  }
  const { x, y } = eventToWorld(event)
  const id = addRootRoute(draftTree.value, payload.routeId, Math.max(24, x), Math.max(24, y))
  finishDrop(id ? '' : '无法放置根线路。')
}

const dragState = ref<{
  pointId: string
  parentId: string | null
  startX: number
  startY: number
  originX: number
  originY: number
  moved: boolean
  subtreeIds: Set<string>
} | null>(null)
const dragParentTargetId = ref<string | null>(null)

const isOverTray = (x: number, y: number) => {
  const tray = trayElement.value
  if (!tray) return false
  const rect = tray.getBoundingClientRect()
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

const findDragTarget = (worldX: number, worldY: number, excludeIds: Set<string>,
  excludeId: string | null = null) => {
  let best: RouteLayoutNode | null = null
  for (const node of canvasLayout.value.nodes) {
    if (excludeIds.has(node.id) || node.id === excludeId) continue
    if (worldX < node.x || worldX > node.x + node.width || worldY < node.y || worldY > node.y + node.height) continue
    if (!best || node.width * node.height < best.width * best.height) best = node
  }
  return best
}

const handleNodeDragMove = (event: PointerEvent) => {
  const state = dragState.value
  if (!state) return
  const dx = (event.clientX - state.startX) / scale.value
  const dy = (event.clientY - state.startY) / scale.value
  if (!state.moved && Math.hypot(dx, dy) < 3) return
  state.moved = true
  const overTray = isOverTray(event.clientX, event.clientY)
  trayDragOver.value = overTray
  if (overTray) {
    dragParentTargetId.value = null
  } else {
    const world = clientToWorld(event.clientX, event.clientY)
    dragParentTargetId.value = findDragTarget(world.x, world.y, state.subtreeIds, state.parentId)?.id ?? null
  }
  movePoint(draftTree.value, state.pointId, state.originX + dx, state.originY + dy)
}

const handleNodeDragEnd = (event: PointerEvent) => {
  const state = dragState.value
  if (state?.moved) {
    if (isOverTray(event.clientX, event.clientY)) {
      removePoint(draftTree.value, state.pointId)
      errorMessage.value = ''
    } else {
      const world = clientToWorld(event.clientX, event.clientY)
      const target = findDragTarget(world.x, world.y, state.subtreeIds, state.parentId)
      if (target && movePointTo(draftTree.value, state.pointId, target.id)) {
        const sourceNode = canvasLayout.value.nodes.find(node => node.id === state.pointId)
        if (sourceNode) {
          const slot = findChildSlot(target, sourceNode.width, sourceNode.height,
            canvasLayout.value.nodes, state.subtreeIds)
          movePointSubtree(draftTree.value, state.pointId, slot.x, slot.y)
        }
      }
    }
  }
  stopNodeDrag()
}

const handleNodeDragCancel = () => stopNodeDrag()

const stopNodeDrag = () => {
  dragState.value = null
  dragParentTargetId.value = null
  trayDragOver.value = false
  window.removeEventListener('pointermove', handleNodeDragMove)
  window.removeEventListener('pointerup', handleNodeDragEnd)
  window.removeEventListener('pointercancel', handleNodeDragCancel)
}

const startNodeDrag = (node: RouteLayoutNode, event: PointerEvent) => {
  if (saving.value || event.button !== 0) return
  event.preventDefault()
  const context = findPointContext(draftTree.value, node.id)
  const subtreeIds = context ? pointSubtreeIds(context.point) : new Set<string>([node.id])
  dragState.value = {
    pointId: node.id,
    parentId: context?.parent?.id ?? null,
    startX: event.clientX,
    startY: event.clientY,
    originX: node.x,
    originY: node.y,
    moved: false,
    subtreeIds
  }
  window.addEventListener('pointermove', handleNodeDragMove)
  window.addEventListener('pointerup', handleNodeDragEnd)
  window.addEventListener('pointercancel', handleNodeDragCancel)
}

const switchTab = (tab: 'routes' | 'tree') => {
  activeTab.value = tab
  closeLockPanels()
  endDrag()
}

onMounted(() => {
  window.addEventListener('resize', closeLockPanels)
  document.addEventListener('scroll', handleScroll, true)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', closeLockPanels)
  document.removeEventListener('scroll', handleScroll, true)
  stopNodeDrag()
})

const saveRoutes = async () => {
  if (saving.value) return
  if (draftRoutes.value.some(route => !route.name.trim())) {
    errorMessage.value = '请填写每条线路的名称。'
    return
  }
  cleanPrerequisites()
  saving.value = true
  closeLockPanels()
  endDrag()
  errorMessage.value = ''
  try {
    await routeStore.saveGameRoutes(
      props.gameId,
      draftRoutes.value.map(copyRoute),
      cloneTree(draftTree.value),
      resetLockIds.value.filter(id => draftRoutes.value.some(route => route.id === id && route.lockCondition))
    )
    // 删除线路会由外键清空记录的 routeId，同步缓存避免继续提交已失效的线路。
    await sessionStore.refreshGameSessions(props.gameId)
    emit('close')
  } catch (error) {
    console.error('Failed to save routes:', error)
    const message = error instanceof Error ? error.message : String(error)
    errorMessage.value = message.includes('Circular route prerequisites')
      ? '剧情锁存在循环依赖，请检查前置线路，不能互相等待解锁。'
      : message.includes('Prerequisite route must exist in the same game')
        ? '前置线路不存在，请重新选择剧情锁条件。'
        : message.includes('Route names must be unique')
          ? '线路名称不能重复。'
          : message.includes('Route color required')
            ? '请为每条线路选择颜色。'
            : message.includes('Route appears more than once in the route tree')
            ? '同一条线路在树中出现多次。'
            : message.includes('Route tree root must be a route point')
                ? '线路树的根必须是线路节点。'
                : message.includes('Invalid route tree coordinates')
                  ? '线路位置数据无效，请重试。'
                  : message.includes('Unsupported route tree version')
                    ? '线路树版本不受支持，请重新创建线路树。'
                    : message.includes('Route tree references an unknown route')
                      ? '线路树引用了不存在的线路。'
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
  width: min(1000px, 100%);
  height: min(820px, calc(100vh - 48px));
  padding: 18px 24px;
  border: 1px solid #e1e5ed;
  border-radius: 15px;
  color: #354052;
  background: #fff;
  box-shadow: 0 24px 70px rgba(27, 37, 57, 0.25);
}

.modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
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

.tabs { display: flex; gap: 4px; margin-top: 12px; border-bottom: 1px solid #edf0f5; }
.tab {
  padding: 8px 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #5f6c80;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.tab.active { color: #4a6fc4; border-bottom-color: #5d82d8; font-weight: 600; }
.tab:focus-visible { outline: 2px solid #7899e2; outline-offset: 2px; }
button:focus-visible { outline: 2px solid #7899e2; outline-offset: 2px; }

.tab-panel { flex: 1; min-height: 0; display: flex; flex-direction: column; padding-top: 12px; }

.routes-panel { overflow: hidden; }
.routes-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  width: 100%;
  max-width: 720px;
  margin: 0 auto 10px;
}
.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #cdd9ee;
  border-radius: 8px;
  color: #4668b8;
  background: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.add-btn:hover:not(:disabled) { border-color: #a9c0e8; background: #f2f6ff; }
.add-btn:focus-visible { outline: 2px solid #7899e2; outline-offset: 2px; }
.add-btn:disabled { opacity: 0.5; cursor: default; }

.route-table {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  border: 1px solid #e2e8f2;
  box-sizing: border-box;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}
.route-table-head,
.route-row {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) 64px 72px 36px;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
}
.route-table-head {
  flex-shrink: 0;
  height: 40px;
  padding-right: 16px;
  background: #f5f8fd;
  border-bottom: 1px solid #e4eaf3;
  color: #4a576b;
  font-size: 13px;
  font-weight: 500;
}
.route-table-head span:nth-child(3),
.route-table-head span:nth-child(4),
.route-table-head span:nth-child(5) { text-align: center; }
.route-list { flex: 1; overflow-y: auto; min-height: 0; min-width: 0; scrollbar-gutter: stable; }
.route-list::-webkit-scrollbar { width: 6px; }
.route-list::-webkit-scrollbar-thumb { border-radius: 999px; background: #cbd2df; }
.route-fields { min-width: 0; margin: 0; padding: 0; border: 0; }
.route-row {
  min-height: 60px;
  padding-top: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #edf1f7;
  background: #fff;
}
.route-row:last-child { border-bottom: 0; }
.route-row:hover { background: #f8fafe; }
.type-cell select,
.name-input {
  font: inherit;
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 7px;
  outline: none;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.type-cell select {
  flex: 1;
  padding: 0 8px;
  color: #3f4b5f;
  background: #f4f6fa;
  font-size: 13px;
}
.name-input {
  width: 100%;
  max-width: 360px;
  justify-self: start;
  color: #2b3648;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
}
.name-input::placeholder { color: #9aa6b6; font-weight: 400; }
.type-cell select:hover { background: #eef2f8; }
.name-input:hover { background: #f5f7fb; }
.type-cell select:focus,
.name-input:focus {
  border-color: #7899e2;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(93, 130, 216, 0.12);
}
.type-cell { display: flex; align-items: center; min-width: 0; }
.type-cell select { flex: 1; }
.lock-cell { display: flex; justify-content: center; }
.icon-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 7px;
  color: #6b7789;
  background: transparent;
  cursor: pointer;
}
.icon-btn:hover:not(:disabled) { color: #4668b8; background: #f1f5fc; }
.icon-btn:focus-visible { outline: 2px solid #7899e2; outline-offset: 2px; }
.lock-trigger.active { border-color: #d5e2fb; background: #edf3ff; color: #4668b8; }
.lock-trigger.active:hover { background: #e4eeff; }
.empty-mark { color: #9aa6b6; font-size: 14px; }
.color-cell { display: flex; align-items: center; justify-content: center; }
.color-swatch {
  position: relative;
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px #d8dfe9;
  cursor: pointer;
}
.color-swatch:hover { box-shadow: 0 0 0 1px #a9c0e8; }
.color-swatch:focus-within { outline: 2px solid #7899e2; outline-offset: 2px; }
.color-swatch input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.color-swatch input::-webkit-color-swatch-wrapper { padding: 0; }
.color-swatch input::-webkit-color-swatch { border: 0; }
.delete-btn { justify-self: center; }
.delete-btn:hover:not(:disabled) { color: #c64f5d; background: #fff2f4; }
.empty-list { display: flex; flex-direction: column; gap: 8px; min-height: 220px; justify-content: center; align-items: center; color: #6b7789; font-size: 13px; text-align: center; }
.empty-list strong { color: #2b3648; font-size: 15px; }

.tree-panel { gap: 10px; }
.tree-toolbar { display: flex; align-items: center; gap: 10px; flex-shrink: 0; min-height: 36px; }
.tree-hint {
  flex: 1;
  min-width: 0;
  color: #7b879a;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.tree-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-left: auto; }
.tool-btn {
  height: 30px;
  padding: 0 10px;
  border: 1px solid #dfe4ed;
  border-radius: 7px;
  background: #fff;
  color: #4a576b;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.tool-btn:hover:not(:disabled) { border-color: #bdcbed; color: #4668b8; background: #f5f8ff; }
.tool-btn.danger:hover:not(:disabled) { border-color: #eccdd2; color: #c64f5d; background: #fff7f8; }
.tool-btn:disabled { opacity: 0.4; cursor: default; }
.zoom-label { min-width: 38px; color: #7b879a; font-size: 11px; text-align: center; font-variant-numeric: tabular-nums; }

.tree-body { flex: 1; display: flex; gap: 10px; min-height: 0; }
.tray { order: 2; flex: 0 0 160px; display: flex; flex-direction: column; min-height: 0; border: 1px solid #e6eaf1; border-radius: 10px; background: #fafbfc; transition: border-color 0.12s ease, background 0.12s ease; }
.tray.drop-remove { border-color: #e3a6ae; border-style: dashed; background: #fff7f8; }
.tray-heading { padding: 10px 12px; border-bottom: 1px solid #edf0f5; color: #4a576b; font-size: 12px; flex-shrink: 0; }
.tray-heading b { display: inline-block; margin-left: 5px; padding: 2px 7px; border-radius: 6px; background: #edf2fc; color: #4668b8; font-size: 11px; }
.tray-subhint { padding: 6px 12px 8px; color: #98a1b1; font-size: 11px; line-height: 1.4; flex-shrink: 0; }
.tray.drop-remove .tray-subhint { color: #b55664; }
.tray-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding: 8px; min-height: 0; }
.tray-tools { flex: 0 0 auto; border-top: 1px solid #edf0f5; }
.tray-chip { display: flex; align-items: center; gap: 8px; padding: 8px 9px; border: 1px solid #e1e5ed; border-radius: 8px; background: #fff; color: #2b3648; font-size: 13px; cursor: grab; }
.tray-chip:active { cursor: grabbing; }
.tray-dot { flex: 0 0 8px; width: 8px; height: 8px; border-radius: 50%; }
.tray-name { min-width: 0; overflow-wrap: anywhere; }
.fork-chip { border-style: dashed; color: #5f6c80; }
.fork-glyph { flex: 0 0 10px; width: 10px; height: 10px; border: 2px solid #7e91b5; border-radius: 2px; transform: rotate(45deg); }
.tree-scroll { position: relative; flex: 1; min-width: 0; min-height: 0; overflow: auto; border: 1px solid #e6eaf1; border-radius: 10px; background: #fff; }
.canvas-empty {
  position: absolute;
  inset: 12px;
  z-index: 0;
  display: grid;
  place-items: center;
  border: 1px dashed #b9c6da;
  border-radius: 10px;
  background: #fafbfe;
  color: #5f6c80;
  font-size: 13px;
  pointer-events: none;
}
.tree-zoom { position: relative; }
.tree-canvas {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  background-color: #fff;
  background-image: radial-gradient(#e8ecf3 1px, transparent 1px);
  background-size: 20px 20px;
}
.edge-layer,
.edge-hit-layer { position: absolute; inset: 0; overflow: visible; }
.edge-layer { pointer-events: none; }
.edge-layer path { fill: none; stroke: #cbd5e6; stroke-width: 2; }
.edge-hit-layer { pointer-events: none; }
.edge-hit {
  fill: none;
  stroke: transparent;
  stroke-width: 20;
  pointer-events: stroke;
  cursor: copy;
}
.edge-hit.active { stroke: rgba(93, 130, 216, 0.28); }
.editor-node {
  position: absolute;
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border: 1px solid #dce3ef;
  border-left: 4px solid #7e91b5;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(46, 61, 88, 0.07);
  box-sizing: border-box;
  text-align: left;
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.editor-node:active { cursor: grabbing; }
.editor-node:hover { border-color: #b9cbee; }
.editor-node.dragging, .editor-fork.dragging { opacity: 0.72; outline: 2px solid #7192d1; outline-offset: 2px; }
.editor-node.drop-child { border-color: #7697e4; box-shadow: 0 0 0 2px rgba(93, 130, 216, 0.2); }
.editor-node.drop-parent, .editor-fork.drop-parent { border-color: #4f9b82; box-shadow: 0 0 0 2px rgba(79, 155, 130, 0.22); }
.editor-node-copy { min-width: 0; display: flex; flex-direction: column; pointer-events: none; }
.editor-node-copy strong { color: #2b3648; font-size: 13px; line-height: 17px; }
.editor-node-copy strong span { display: block; white-space: pre; }
.editor-node-copy small { margin-top: 2px; color: #7b879a; font-size: 11px; }
.editor-fork {
  position: absolute;
  width: 28px;
  height: 28px;
  margin-left: -4px;
  margin-top: -4px;
  display: grid;
  place-items: center;
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.editor-fork:active { cursor: grabbing; }
.editor-fork .fork-diamond {
  width: 12px;
  height: 12px;
  border: 2px solid #7e91b5;
  border-radius: 2px;
  background: #fff;
  transform: rotate(45deg);
  box-shadow: 0 2px 6px rgba(46, 61, 88, 0.12);
}
.editor-fork.drop-active .fork-diamond,
.editor-fork:hover .fork-diamond { border-color: #5d82d8; background: #eef4ff; }
.editor-fork.drop-parent .fork-diamond { border-color: #4f9b82; background: #effaf6; }
.error-message { margin: 10px 0 0; color: #c84d5a; font-size: 13px; overflow-wrap: anywhere; }
.modal-actions { display: flex; justify-content: flex-end; align-items: center; margin-top: 12px; padding-top: 10px; border-top: 1px solid #edf0f5; gap: 9px; flex-shrink: 0; }
.modal-actions button { min-width: 82px; padding: 8px 15px; border-radius: 8px; font-size: 13px; cursor: pointer; }
.cancel-btn { color: #5f6c80; border: 1px solid #dfe3ea; background: #fff; }
.save-btn { color: #fff; border: 1px solid #557bd3; background: #5d82d8; }
.modal-actions button:disabled,
.close-btn:disabled { opacity: 0.5; cursor: default; }

.lock-editor { position: fixed; inset: auto; box-sizing: border-box; margin: 0; padding: 16px; overflow-y: auto; border: 1px solid #dce4f0; border-radius: 12px; background: #fff; color: #3f4b5f; box-shadow: 0 12px 36px rgba(32, 48, 78, 0.18); font-size: 13px; }
.lock-heading { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; color: #2b3648; font-size: 14px; font-weight: 600; }
.lock-mode { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
.lock-mode select {
  width: 100%;
  max-width: 100%;
  height: 34px;
  padding: 0 8px;
  border: 1px solid #dfe4ed;
  border-radius: 7px;
  color: #3f4b5f;
  background: #fff;
  font: inherit;
  outline: none;
}
.lock-mode select:focus { border-color: #7899e2; box-shadow: 0 0 0 2px rgba(93, 130, 216, 0.12); }
.prerequisites { display: flex; flex-direction: column; gap: 4px; max-height: 180px; overflow-y: auto; margin-top: 10px; }
.prerequisite { display: flex; align-items: flex-start; gap: 6px; min-width: 0; max-width: 100%; padding: 7px 6px; border-radius: 6px; cursor: pointer; }
.prerequisite:hover { background: #f2f6fd; }
.prerequisite span { overflow-wrap: anywhere; }
.lock-editor input[type="checkbox"] { flex: 0 0 auto; accent-color: #5d82d8; }
.lock-warning { margin-top: 10px; color: #b56334; line-height: 1.5; }
.lock-warning button { display: block; margin-top: 6px; padding: 5px 8px; border: 1px solid #ecd4c4; border-radius: 6px; background: #fff8f2; color: inherit; cursor: pointer; }

@media (max-width: 900px) {
  .tree-body { flex-direction: column; }
  .tray { flex: 0 0 auto; max-height: 220px; }
}

@media (max-width: 760px) {
  .overlay { padding: 12px; }
  .modal { height: calc(100vh - 24px); padding: 12px 16px; }
  .route-table-head { display: none; }
  .route-row { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 10px; }
  .type-cell { flex: 0 0 92px; }
  .name-input { flex: 1 1 140px; }
  .lock-cell { flex: 0 0 auto; }
  .color-cell { flex: 0 0 auto; }
  .delete-btn { margin-left: auto; }
  .routes-toolbar { align-items: center; }
  .empty-list { min-height: 160px; }
  .tree-toolbar { flex-wrap: wrap; }
  .tree-actions { flex-wrap: wrap; }
}
</style>

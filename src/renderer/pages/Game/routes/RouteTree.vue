<template>
  <div v-if="routeNodes.length === 0" class="empty-state">{{ routes.length ? '线路尚未放入树' : '暂无线路' }}</div>
  <div v-else ref="treeElement" class="route-tree" :style="{ '--node-font-size': `${layout.fontSize}px`, '--node-padding': `${layout.padding}px` }">
    <div class="tree-scroll" :style="{ maxHeight: `${heightBudget}px` }" @scroll="closeDetails" @click.self="closeDetails">
      <div class="tree-canvas" :style="{ width: `${canvasWidth}px`, height: `${layout.height}px` }"
        @click.self="closeDetails">
        <svg class="edge-layer" :width="canvasWidth" :height="layout.height" aria-hidden="true">
          <defs>
            <marker :id="`${panelId}-done`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5"
              orient="auto-start-reverse">
              <polygon points="0,0 10,5 0,10" fill="#4f9b82" />
            </marker>
            <marker :id="`${panelId}-pending`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5"
              orient="auto-start-reverse">
              <polygon points="0,0 10,5 0,10" fill="#929eaf" />
            </marker>
          </defs>
          <path v-for="edge in layout.edges" :key="`${edge.from.id}-${edge.to.id}`" :d="edgePath(edge)" :opacity="dependencyBus.paths.length ? 0.35 : 1" />
          <path v-for="edge in dependencyBus.paths" :key="`halo-${edge.id}`" class="dependency-halo" :d="edge.path" />
          <path v-for="edge in dependencyBus.paths" :key="`lock-${edge.id}`" class="dependency-edge"
            :class="{ completed: edge.completed }" :d="edge.path"
            :marker-end="edge.arrow ? `url(#${panelId}-${edge.completed ? 'done' : 'pending'})` : undefined" />
        </svg>

        <div v-for="node in forkNodes" :key="node.id" class="route-fork"
          :style="{ left: `${node.x}px`, top: `${node.y}px`, width: `${node.width}px`, height: `${node.height}px` }"
          aria-hidden="true"><span></span></div>

        <button type="button" v-for="node in routeNodes" :key="node.id" class="route-node"
          :class="[`type-${node.route?.type}`, { locked: node.route && lockStates.get(node.route.id) && !lockStates.get(node.route.id)?.unlocked, selected: node.route && selectedId === node.route.id, prerequisite: node.route && selectedState?.prerequisites.some(item => item.id === node.route?.id), 'prerequisite-completed': node.route && selectedState?.prerequisites.some(item => item.id === node.route?.id && item.completed) }]"
          :style="{ left: `${node.x}px`, top: `${node.y}px`, width: `${node.width}px`, height: `${node.height}px`, borderLeftColor: nodeBorderColor(node) }"
          :title="`${node.route?.name ?? ''} · ${statusLabel(nodeStatus(node))}，点击查看详情`" :aria-expanded="selectedId === node.route?.id"
          :aria-controls="panelId" aria-haspopup="dialog" @click="showDetails(node, $event)">
          <div class="route-copy">
            <strong><span v-for="(line, index) in node.nameLines" :key="index">{{ line }}</span></strong>
            <small v-if="nodeStatus(node) !== 'NotStarted'" class="node-status" :class="`node-status-${nodeStatus(node)}`">
              <Play v-if="nodeStatus(node) === 'Playing'" :size="10" fill="currentColor" aria-hidden="true" />
              <Pause v-else-if="nodeStatus(node) === 'OnHold'" :size="10" fill="currentColor" aria-hidden="true" />
              <Check v-else :size="11" :stroke-width="2.6" aria-hidden="true" />
              {{ statusLabel(nodeStatus(node)) }}
            </small>
          </div>
          <svg v-if="node.route && lockStates.get(node.route.id)" class="lock-icon" :class="{ unlocked: lockStates.get(node.route.id)?.unlocked }"
            viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="10" width="14" height="11" rx="3" />
            <path :d="lockStates.get(node.route.id)?.unlocked ? 'M9 10 V6 a4 4 0 0 1 8 0' : 'M8 10 V6 a4 4 0 0 1 8 0 V10'" />
            <path d="M12 14 v3" />
          </svg>
        </button>
      </div>
    </div>
    <div :id="panelId" ref="detailsPanel" popover="auto" class="lock-details" :style="panelStyle" role="dialog"
      aria-label="线路详情" @toggle="handlePanelToggle">
      <template v-if="selectedRoute">
        <div class="details-heading"><strong>{{ selectedRoute.name }}</strong></div>
        <span class="route-type-badge">{{ routeTypeLabel(selectedRoute.type) }}</span>
        <p v-if="canEditStatus && selectedRoute.description" class="route-description">{{ selectedRoute.description }}</p>
        <template v-if="selectedState">
          <p class="lock-status" :class="{ unlocked: selectedState.unlocked }">{{ selectedState.unlocked ? '已解锁' : '未解锁'
            }}</p>
          <p class="condition-summary">{{ selectedState.mode === 'all' ? '全部前置线路通关' : '以下任一线路通关即可' }} · {{
            selectedState.completedCount }}/{{ selectedState.prerequisites.length }} 已完成</p>
          <ul class="condition-list">
            <li v-for="item in selectedState.prerequisites" :key="item.id" :class="{ completed: item.completed }">
              <Check v-if="item.completed" :size="12" :stroke-width="2.6" aria-hidden="true" />
              <Circle v-else :size="11" aria-hidden="true" />
              <span>{{ item.route?.name ?? '前置线路已不存在' }}</span><small>{{
                item.completed ? '已完成' : '未完成' }}</small></li>
          </ul>
          <p v-if="!selectedState.prerequisites.length" class="details-note">尚未设置前置线路，请在编辑线路中补充条件。</p>
        </template>
        <p v-if="statusErrors[selectedRoute.id]" class="status-error" role="alert">{{ statusErrors[selectedRoute.id] }}</p>
        <div class="details-footer" :aria-busy="statusSaving[selectedRoute.id] || false">
          <select v-model="statusDraft" class="status-select" :class="`status-${selectedRoute.status}`"
            aria-label="游玩状态" :title="canEditStatus ? '点击更改游玩状态' : '前置条件尚未满足，暂不可更改状态'"
            :disabled="!canEditStatus || statusSaving[selectedRoute.id]" @change="saveStatus">
            <option v-for="option in ROUTE_STATUS_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
          <span v-if="statusSaving[selectedRoute.id]" class="saving-note" role="status">保存中…</span>
          <span class="route-playtime" :aria-label="`游玩时长：${formatPlaytime(selectedRoute.playtime)}`" title="累计游玩时长">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            {{ formatPlaytime(selectedRoute.playtime) }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { Check, Circle, Pause, Play } from '@lucide/vue'
import { getRouteLockState } from '@/shared/routeLocks'
import { getRouteColor } from '@/shared/routeColors'
import { placeRoutePanel } from './routePanelPosition'
import { buildDependencyBus } from './routeDependencyPath'
import { ROUTE_TYPE_OPTIONS, ROUTE_STATUS_OPTIONS, type Route, type RouteTree, type RouteType, type RouteStatus } from '@/shared/types'
import { useRouteStore } from '@/renderer/stores/route.store'
import {
  buildRouteLayout,
  routeTreeEdgePath,
  type RouteLayoutNode,
  type RouteTreeEdge
} from './routeTree'

const props = defineProps<{ routes: Route[]; tree: RouteTree }>()
const routeStore = useRouteStore()
const statusDraft = ref<RouteStatus>('NotStarted')
const statusSaving = ref<Record<string, boolean>>({})
const statusErrors = ref<Record<string, string>>({})
const statusLabel = (status: RouteStatus) => ROUTE_STATUS_OPTIONS.find(option => option.value === status)?.label ?? status
const formatPlaytime = (seconds: number) => {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor(total % 3600 / 60)
  return hours ? `${hours} 小时 ${minutes} 分钟` : minutes ? `${minutes} 分钟 ${total % 60} 秒` : `${total} 秒`
}

const routeTypeLabel = (type: RouteType) =>
  ROUTE_TYPE_OPTIONS.find(option => option.value === type)?.label ?? type

const treeElement = ref<HTMLElement | null>(null)
const heightBudget = ref(Math.max(240, Math.min(480, window.innerHeight * 0.55)))
const fontFamily = ref('sans-serif')
const textContext = document.createElement('canvas').getContext('2d')
const measureName = (text: string, size: number) => {
  if (!textContext) return Array.from(text).length * size
  textContext.font = `700 ${size}px ${fontFamily.value}`
  return textContext.measureText(text).width
}
const routesById = computed(() => new Map(props.routes.map(route => [route.id, route])))
const layout = computed(() => buildRouteLayout(props.tree, routesById.value, measureName))
const routeNodes = computed(() => layout.value.nodes.filter(node => !node.isFork))
const forkNodes = computed(() => layout.value.nodes.filter(node => node.isFork))
const nodeStatus = (node: RouteLayoutNode): RouteStatus => node.route?.status ?? 'NotStarted'
const nodeBorderColor = (node: RouteLayoutNode) =>
  node.route ? getRouteColor(node.route) : undefined
const resizeTree = () => {
  if (treeElement.value) fontFamily.value = getComputedStyle(treeElement.value).fontFamily
  heightBudget.value = Math.max(240, Math.min(480, window.innerHeight * 0.55))
  closeDetails()
}
const lockStates = computed(() => new Map(props.routes.map(route => [route.id, getRouteLockState(route, routesById.value)])))
const selectedId = ref<string | null>(null)
const selectedRoute = computed(() => selectedId.value ? routesById.value.get(selectedId.value) : undefined)
const selectedState = computed(() => selectedId.value ? lockStates.value.get(selectedId.value) : null)
const canEditStatus = computed(() => !selectedState.value || selectedState.value.unlocked)
const saveStatus = async () => {
  const route = selectedRoute.value
  if (!route || !canEditStatus.value || statusSaving.value[route.id] || statusDraft.value === route.status) return
  const status = statusDraft.value
  statusSaving.value[route.id] = true
  statusErrors.value[route.id] = ''
  try {
    await routeStore.updateRouteStatus(route.gameId, route.id, status)
  } catch (error) {
    // 即选即存失败后恢复已保存值，用户可重新选择同一目标状态重试。
    if (selectedId.value === route.id) statusDraft.value = selectedRoute.value?.status ?? route.status
    const message = error instanceof Error ? error.message : String(error)
    statusErrors.value[route.id] = message.includes('Route is locked')
      ? '前置条件尚未满足，状态未修改。'
      : '状态保存失败，原状态未改变，请重试。'
  } finally {
    statusSaving.value[route.id] = false
  }
}
const panelId = `route-lock-details-${useId()}`
const detailsPanel = ref<HTMLElement | null>(null)
const panelStyle = ref<Record<string, string>>({})
const dependencyEdges = computed(() => {
  const target = layout.value.nodes.find(node => node.route?.id === selectedId.value)
  if (!target || !selectedState.value) return []
  return selectedState.value.prerequisites.flatMap(item => {
    const source = layout.value.nodes.find(node => node.route?.id === item.id)
    return source && source !== target ? [{ from: source, to: target, completed: item.completed }] : []
  })
})
const dependencyBus = computed(() => buildDependencyBus(dependencyEdges.value, layout.value, selectedState.value?.unlocked ?? false))
// 显示依赖关系不再扩展画布，避免点击后出现额外的横向滚动。
const canvasWidth = computed(() => layout.value.width)
const closeDetails = () => {
  detailsPanel.value?.hidePopover()
  selectedId.value = null
}
const handlePanelToggle = () => {
  if (!detailsPanel.value?.matches(':popover-open')) selectedId.value = null
}
const showDetails = async (node: RouteLayoutNode, event: MouseEvent) => {
  const route = node.route
  if (!route) return
  if (selectedId.value === route.id) { closeDetails(); return }
  const trigger = event.currentTarget as HTMLElement
  const rect = trigger.getBoundingClientRect()
  const scroller = trigger.closest('.tree-scroll')!
  const width = Math.max(0, Math.min(300, window.innerWidth - 24))
  // Measure the actual content in the top layer before revealing it to avoid a position flash.
  panelStyle.value = {
    width: `${width}px`, left: '12px', top: '12px', bottom: 'auto', visibility: 'hidden',
    maxHeight: `${Math.max(0, window.innerHeight - 24)}px`
  }
  selectedId.value = route.id
  await nextTick()
  const panel = detailsPanel.value
  if (selectedId.value !== route.id || !panel) return
  panel.showPopover()
  const bounds = scroller.getBoundingClientRect()
  // Only visible portions matter: nodes outside the horizontal scroll area cannot be obscured.
  const nodes = Array.from(scroller.querySelectorAll<HTMLElement>('.route-node')).map(node => {
    const box = node.getBoundingClientRect()
    return {
      left: Math.max(0, bounds.left, box.left), top: Math.max(0, bounds.top, box.top),
      right: Math.min(window.innerWidth, bounds.right, box.right),
      bottom: Math.min(window.innerHeight, bounds.bottom, box.bottom)
    }
  }).filter(box => box.right > box.left && box.bottom > box.top)
  const measured = panel.getBoundingClientRect()
  const canvas = scroller.querySelector('.tree-canvas')!.getBoundingClientRect()
  const wires = dependencyBus.value.obstacles.map(wire => ({
    left: Math.max(0, bounds.left, canvas.left + wire.left),
    top: Math.max(0, bounds.top, canvas.top + wire.top),
    right: Math.min(window.innerWidth, bounds.right, canvas.left + wire.right),
    bottom: Math.min(window.innerHeight, bounds.bottom, canvas.top + wire.bottom)
  })).filter(wire => wire.right > wire.left && wire.bottom > wire.top)
  const position = placeRoutePanel(rect, nodes, measured.width, measured.height, window.innerWidth, window.innerHeight, wires)
  panelStyle.value = { ...panelStyle.value, left: `${position.left}px`, top: `${position.top}px`, visibility: 'visible' }
}
watch(selectedRoute, route => {
  if (route) statusDraft.value = route.status
  else if (selectedId.value) closeDetails()
})
const handlePageScroll = (event: Event) => {
  // 面板自身可滚动；页面移动时收起，防止与节点位置脱离。
  if (event.target instanceof Node && detailsPanel.value?.contains(event.target)) return
  closeDetails()
}
onMounted(() => {
  resizeTree()
  window.addEventListener('resize', resizeTree)
  document.addEventListener('scroll', handlePageScroll, true)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeTree)
  document.removeEventListener('scroll', handlePageScroll, true)
})

const edgePath = (edge: RouteTreeEdge) => routeTreeEdgePath(edge)
</script>

<style scoped>
.empty-state {
  display: grid;
  min-height: 116px;
  place-items: center;
  color: #98a1b1;
  font-size: 13px;
}

.tree-scroll {
  overflow: auto;
  padding: 4px 0 8px;
}

.tree-canvas {
  position: relative;
  min-width: 100%;
}

.edge-layer {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
}

.edge-layer path {
  fill: none;
  stroke: #cbd5e6;
  stroke-width: 2;
}

.route-fork {
  position: absolute;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.route-fork span {
  width: 11px;
  height: 11px;
  border: 2px solid #9aa8bf;
  border-radius: 2px;
  background: #fff;
  transform: rotate(45deg);
  box-shadow: 0 2px 6px rgba(46, 61, 88, 0.12);
}

.route-node {
  position: absolute;
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 6px var(--node-padding);
  gap: 9px;
  border: 1px solid #dce3ef;
  border-left: 4px solid #7e91b5;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(46, 61, 88, 0.07);
  box-sizing: border-box;
  text-align: left;
  font-family: inherit;
}

button.route-node {
  cursor: pointer;
}

.route-node.locked {
  background: #f4f6fa;
}

.route-node.selected {
  outline: 2px solid #7192d1;
  outline-offset: 2px;
}

.route-node.prerequisite {
  box-shadow: 0 0 0 2px #bdc6d5;
}

.route-node.prerequisite-completed {
  box-shadow: 0 0 0 2px #7dbca6;
}

.route-node:focus-visible {
  outline: 2px solid #7192d1;
  outline-offset: 3px;
}

.lock-icon {
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  margin-left: auto;
  fill: none;
  stroke: #8a95a7;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.lock-icon.unlocked {
  stroke: #4f9b82;
}

.edge-layer .dependency-edge {
  stroke-linejoin: round;
  stroke-linecap: round;
  stroke: #929eaf;
  stroke-dasharray: 5 4;
  stroke-width: 1.6;
}

.edge-layer .dependency-halo {
  stroke: #fff;
  stroke-width: 5;
  stroke-linejoin: round;
  stroke-linecap: round;
  opacity: 0.85;
}

.edge-layer .dependency-edge.completed {
  stroke: #4f9b82;
}

.lock-details {
  position: fixed;
  inset: auto;
  margin: 0;
  padding: 16px;
  box-sizing: border-box;
  overflow-y: auto;
  border: 1px solid #dce4f0;
  border-radius: 12px;
  background: #fff;
  color: #465064;
  box-shadow: 0 12px 36px #20304e2e;
  font-size: 12px;
}

.details-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.details-heading strong {
  overflow-wrap: anywhere;
  font-size: 14px;
}

.route-type-badge {
  display: inline-block;
  margin-top: 8px;
  padding: 3px 7px;
  border-radius: 5px;
  background: #f1f4f9;
  color: #7b879a;
  font-size: 11px;
}

.lock-status {
  color: #8b7599;
  margin: 10px 0;
}

.lock-status.unlocked,
.condition-list .completed {
  color: #4f9b82;
}

.condition-summary,
.details-note {
  line-height: 1.6;
}

.condition-list {
  list-style: none;
  padding: 0;
  margin: 12px 0;
}

.condition-list li {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 0;
}

.condition-list svg {
  flex: 0 0 auto;
}

.condition-list li>span:nth-child(2) {
  flex: 1;
  overflow-wrap: anywhere;
  min-width: 0;
}

.condition-list small {
  flex-shrink: 0;
}

.details-note {
  color: #8c96a6;
  margin: 10px 0 0;
}

.details-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e8edf4;
}

.route-playtime {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  min-width: 0;
  margin-left: auto;
  color: #7b879a;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.route-playtime svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.saving-note { color: #8c96a6; font-size: 10px; }
.status-select {
  flex-shrink: 0;
  max-width: 100%;
  padding: 5px 6px;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #68758b;
  background: #f2f4f8;
  font: inherit;
  cursor: pointer;
}
.status-select.status-Playing { color: #5076c5; background: #eef4ff; }
.status-select.status-Completed { color: #43876f; background: #edf7f2; }
.status-select.status-OnHold { color: #9a7d4c; background: #faf5e9; }
.status-select:hover:not(:disabled) { border-color: #bdcbed; }
.status-select:focus-visible { outline: 2px solid #7899e2; outline-offset: 2px; }
.status-select:disabled {
  opacity: 0.6;
  cursor: default;
}

.status-error {
  color: #c84d5a;
  line-height: 1.6;
}

.route-description {
  margin: 12px 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.6;
}

.route-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.route-copy strong {
  color: #465064;
  font-size: var(--node-font-size);
  white-space: nowrap;
  line-height: calc(var(--node-font-size) + 4px);
}

.route-copy strong span { display: block; white-space: pre; min-height: calc(var(--node-font-size) + 4px); }

.route-copy small {
  margin-top: 2px;
  color: #9aa3b1;
  font-size: 10px;
  line-height: 12px;
}

.route-copy .node-status { display: flex; align-items: center; gap: 4px; }
.node-status svg { flex: 0 0 auto; }
.route-copy .node-status-Playing { color: #5076c5; }
.route-copy .node-status-OnHold { color: #9a7d4c; }
.route-copy .node-status-Completed { color: #43876f; }
</style>

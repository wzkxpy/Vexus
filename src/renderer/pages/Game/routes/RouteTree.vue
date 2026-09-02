<template>
  <div v-if="routes.length === 0" class="empty-state">暂无线路</div>
  <div v-else class="tree-scroll">
    <div class="tree-canvas" :style="{ width: `${layout.width}px`, height: `${layout.height}px` }">
      <svg class="edge-layer" :width="layout.width" :height="layout.height" aria-hidden="true">
        <path
          v-for="edge in layout.edges"
          :key="`${edge.from.id}-${edge.to.id}`"
          :d="edgePath(edge)"
        />
      </svg>

      <div
        v-for="node in layout.nodes"
        :key="node.id"
        class="route-node"
        :class="`type-${node.type}`"
        :style="{ left: `${node.x}px`, top: `${node.y}px`, width: `${node.width}px` }"
        :title="node.name"
      >
        <div class="route-copy">
          <strong>{{ node.name }}</strong>
          <small>{{ routeTypeLabel(node.type) }}</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ROUTE_TYPE_OPTIONS, type Route, type RouteType } from '@/shared/types'
import {
  buildRouteTree,
  layoutRouteTree,
  routeTreeColumnGap,
  routeTreeNodeSize,
  type RouteTreeEdge
} from './routeTree'

const props = defineProps<{ routes: Route[] }>()

const routeTypeLabel = (type: RouteType) =>
  ROUTE_TYPE_OPTIONS.find(option => option.value === type)?.label ?? type

const layout = computed(() => layoutRouteTree(buildRouteTree(props.routes)))

const edgePath = ({ from, to }: RouteTreeEdge) => {
  const startX = from.x + from.width
  const startY = from.y + routeTreeNodeSize.height / 2
  const endX = to.x
  const endY = to.y + routeTreeNodeSize.height / 2
  const span = endX - startX

  const isMainType = ROUTE_TYPE_OPTIONS.some(
    option => option.value === to.type && option.isMain
  )
  if (isMainType && span > routeTreeColumnGap * 2) {
    // 跨两列主干先在第一列完成曲线转向，再沿目标行直连第二列。
    const firstColumnX = startX + routeTreeColumnGap
    const firstCurveMiddleX = (startX + firstColumnX) / 2
    return `M ${startX} ${startY} C ${firstCurveMiddleX} ${startY}, ${firstCurveMiddleX} ${endY}, ${firstColumnX} ${endY} L ${endX} ${endY}`
  }

  const middleX = (startX + endX) / 2
  return `M ${startX} ${startY} C ${middleX} ${startY}, ${middleX} ${endY}, ${endX} ${endY}`
}
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
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 0 8px;
}

.tree-canvas { position: relative; min-width: 100%; }
.edge-layer { position: absolute; inset: 0; overflow: visible; }
.edge-layer path { fill: none; stroke: #cbd5e6; stroke-width: 2; }

.route-node {
  position: absolute;
  display: flex;
  align-items: center;
  min-width: 110px;
  height: 52px;
  padding: 7px 10px;
  gap: 9px;
  border: 1px solid #dce3ef;
  border-left: 4px solid #7e91b5;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(46, 61, 88, 0.07);
  box-sizing: border-box;
}

.route-node.type-common { border-left-color: #5d82d8; }
.route-node.type-main { border-left-color: #4f9b82; }
.route-node.type-chapter { border-left-color: #7b70c9; }
.route-node.type-character { border-left-color: #d77e9c; }

.route-copy { min-width: 0; display: flex; flex-direction: column; }
.route-copy strong { color: #465064; font-size: 13px; white-space: nowrap; }
.route-copy small { margin-top: 2px; color: #9aa3b1; font-size: 10px; }
</style>

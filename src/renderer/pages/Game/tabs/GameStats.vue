<!-- src/renderer/components/GameStats.vue -->
<template>
  <div class="stats">
    <div class="stats-header">
      <h3>每日游玩时间</h3>

      <button class="session-btn" @click="uiStore.activeModal = 'session'">
        查看 / 编辑记录
      </button>
    </div>

    <div class="chart-panel">
      <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
    </div>

    <div class="summary">
      <div><span>总时长</span><strong>{{ Math.round(totalPlaytime) }}</strong><small>分钟</small></div>
      <div><span>游戏次数</span><strong>{{ playCount }}</strong><small>次</small></div>
      <div><span>次均时长</span><strong>{{ avgSession }}</strong><small>分钟</small></div>
      <div><span>日均时长</span><strong>{{ avgDaily }}</strong><small>分钟</small></div>
    </div>

    <SessionModal
      v-if="uiStore.activeModal === 'session'"
      @close="uiStore.activeModal = null"
    />

  </div>
</template>


<script setup lang="ts">
import { computed, watch } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions
} from 'chart.js'
import { useRoute } from 'vue-router'
import { useSessionStore } from '@/renderer/stores/session.store'
import { useGameStore } from '@/renderer/stores/game.store'
import { useRouteStore } from '@/renderer/stores/route.store'
import { getRouteColor } from '@/shared/routeColors'
import SessionModal from '../SessionModal.vue'
import { useUIStore } from '@/renderer/stores/ui.store'

Chart.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
)

const route = useRoute()
const uiStore = useUIStore()
const gameStore = useGameStore()
const sessionStore = useSessionStore()
const routeStore = useRouteStore()
const game = computed(() => {
  const id = route.params.id as string
  return gameStore.getGameById(id)
})
const sessions = computed(() => sessionStore.getGameSessions(game.value!.id))
const gameRoutes = computed(() => routeStore.getGameRoutes(game.value!.id))

// 统计页可能先于概览加载，缺失时补一次；已加载则复用。
watch(
  () => game.value?.id,
  id => {
    if (id && routeStore.routesByGame[id] === undefined) void routeStore.loadGameRoutes(id)
  },
  { immediate: true }
)

const dailyPlaytime = computed(() => {
  const map: Record<string, number> = {}
  for (const s of sessions.value) {
    const date = s.playDate
    map[date] = (map[date] || 0) + Math.round(s.duration / 60)
  }
  return map
})

const chartData = computed<ChartData<'bar'>>(() => {
  const routeIds = new Set(gameRoutes.value.map(item => item.id))
  const dates = new Set<string>()
  const minutesByRoute = new Map<string, Map<string, number>>()
  const unassigned = new Map<string, number>()

  const addMinutes = (bucket: Map<string, number>, date: string, value: number) => {
    bucket.set(date, (bucket.get(date) ?? 0) + value)
  }

  for (const session of sessions.value) {
    const date = session.playDate
    dates.add(date)
    const minutes = Math.round(session.duration / 60)
    if (session.routeId && routeIds.has(session.routeId)) {
      let bucket = minutesByRoute.get(session.routeId)
      if (!bucket) {
        bucket = new Map()
        minutesByRoute.set(session.routeId, bucket)
      }
      addMinutes(bucket, date, minutes)
    } else {
      addMinutes(unassigned, date, minutes)
    }
  }

  const labels = [...dates].sort()
  const datasets: ChartData<'bar'>['datasets'] = gameRoutes.value
    .filter(item => minutesByRoute.has(item.id))
    .map(item => ({
      label: item.name,
      data: labels.map(date => minutesByRoute.get(item.id)?.get(date) ?? 0),
      backgroundColor: getRouteColor(item),
      stack: 'playtime',
      maxBarThickness: 34
    }))

  if (unassigned.size > 0) {
    datasets.push({
      label: '未归属',
      data: labels.map(date => unassigned.get(date) ?? 0),
      backgroundColor: '#b0b9c8',
      stack: 'playtime',
      maxBarThickness: 34
    })
  }

  return { labels, datasets }
})

const chartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        color: '#8d96a6',
        font: { size: 10 }
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      filter: item => item.parsed.y > 0,
      callbacks: {
        label: item => `${item.dataset.label ?? ''}: ${item.parsed.y} 分钟`
      }
    }
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      ticks: { color: '#8d96a6', font: { size: 10 } },
      border: { display: false }
    },
    y: {
      stacked: true,
      beginAtZero: true,
      grid: { color: '#edf0f4' },
      ticks: { color: '#8d96a6', font: { size: 10 } },
      border: { display: false }
    }
  }
}


const totalPlaytime = computed(() =>
  sessions.value.reduce((sum, s) => sum + s.duration / 60, 0)
)
const playCount = computed(() => sessions.value.length)
const avgSession = computed(() => {
  if (!playCount.value) return 0
  return Math.round(totalPlaytime.value / playCount.value)
})
const avgDaily = computed(() => {
  const days = Object.keys(dailyPlaytime.value).length
  if (!days) return 0
  return Math.round(totalPlaytime.value / days)
})

</script>

<style scoped>
.stats {
  padding: 20px;
  border: 1px solid #e5e9f0;
  border-radius: 14px;
  background: rgba(255,255,255,.86);
  box-shadow: 0 7px 25px rgba(50,61,86,.04);
}
.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}
.stats-header h3 { margin: 0; color: #444e60; font-size: 14px; font-weight: 600; }
.session-btn {
  padding: 6px 10px;
  border: 1px solid #dce4f5;
  border-radius: 7px;
  background: #edf2fc;
  color: #5474bd;
  font-size: 12px;
  cursor: pointer;
}
.session-btn:hover { background: #e4ecfb; }
.chart-panel { height: 260px; padding: 12px 10px 5px; border: 1px solid #edf0f4; border-radius: 11px; background: #fafbfc; }
.summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-top: 14px; }
.summary > div { padding: 13px; border: 1px solid #edf0f4; border-radius: 10px; background: #fafbfc; }
.summary span { display: block; margin-bottom: 7px; color: #9099a9; font-size: 12px; }
.summary strong { color: #3d485b; font-size: 20px; font-weight: 600; }
.summary small { margin-left: 4px; color: #9aa2b0; font-size: 11px; }
@media (max-width: 680px) { .summary { grid-template-columns: repeat(2,1fr); } }
</style>

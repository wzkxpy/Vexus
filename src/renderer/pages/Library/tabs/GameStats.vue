<!-- src/renderer/components/GameStats.vue -->
<template>
  <div class="stats">
    <div class="stats-header">
      <h3>每日游玩时间</h3>

      <button class="session-btn" @click="showSessions = true">
        查看 / 编辑记录
      </button>
    </div>

    <Bar
      v-if="chartData"
      :data="chartData"
      :options="chartOptions"
    />

    <div class="summary">
      <p>总时长：{{ totalPlaytime }} 分钟</p>
      <p>游戏次数：{{ playCount }}</p>
      <p>次均时长：{{ avgSession }}</p>
      <p>日均时长：{{ avgDaily }}</p>
    </div>

    <SessionModal
      v-if="showSessions"
      @close="showSessions = false"
    />

  </div>
</template>


<script setup lang="ts">
import { computed, ref } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js'

import { useSessionStore } from '@/renderer/stores/session.store'
import { useGameStore } from '@/renderer/stores/game.store'
import SessionModal from '../modals/SessionModal.vue'

const showSessions = ref(false)

Chart.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
)

const sessionStore = useSessionStore()
const gameStore = useGameStore()

const game = computed(() => gameStore.selectedGame)

const sessions = computed(() =>
  sessionStore.getGameSessions(game.value!.id)
)

const dailyPlaytime = computed(() => {
  const map: Record<string, number> = {}
  // console.log(sessions.value);
  
  for (const s of sessions.value) {
    const date = s.playDate
    map[date] = (map[date] || 0) + Math.round(s.duration / 60)
  }
  return map
})

const chartData = computed(() => {
  const labels = Object.keys(dailyPlaytime.value)
  const data = Object.values(dailyPlaytime.value)
  return {
    labels,
    datasets: [
      {
        label: '分钟',
        data
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { display: false }
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

<style>
.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.session-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: none;
  background: #4f46e5;
  color: white;
  cursor: pointer;
}

</style>
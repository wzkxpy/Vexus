<!-- src/renderer/pages/Game/GamePage.vue -->
<template>
  <div v-if="game" class="game-page">
    
    <button class="back-btn" @click="handleBack()">
      ← 返回
    </button>

    <!-- 标题 + 封面 -->
    <div class="top-section">
      <div class="left">
        <h3 class="title">{{ game.originalTitle }}</h3>
        
        <div class="action-row">
          <button class="launch-btn" @click="isRunning ? handleStop() : handleLaunch()">
            {{ isRunning ? '■ 停止游戏' : '▶ 启动游戏' }}
          </button>
          
          <SettingsMenu :items="menuItems" :context="game">
            <template #button>
              <button class="settings-btn">⚙</button>
            </template>
          </SettingsMenu>
        </div>

        <!-- 评分 -->
        <div class="section" v-if="game.externalScore">
          <span>评分</span>
          <button class="edit-btn" @click="openEdit('externalScore')">编辑</button>
          <div class="score-grid">
            <div v-if="game.externalScore.erogame">
              <span class="label">Erogame: </span>
              {{ game.externalScore.erogame }}
            </div>
            <div v-if="game.externalScore.bgm">
              <span class="label">Bangumi: </span>
              {{ game.externalScore.bgm }}
            </div>
            <div v-if="game.externalScore.vndb">
              <span class="label">VNDB: </span>
              {{ game.externalScore.vndb }}
            </div>
          </div>
        </div>

        <!-- 游玩数据 -->
        <div class="stats-row">
          <div><span>游玩状态：</span>
            <SettingsMenu :items="statusItems" :context="game">
            <template #button>
              <button> {{ currentStatus }} </button>
            </template>
          </SettingsMenu>
          </div>
          <div>
            <span>游玩时长：</span>
            <span
              class="playtime"
              @contextmenu.prevent="togglePlaytimeFormat"
            >
              {{ formattedPlaytime }}
            </span>
          </div>
          <!-- <div><span>游玩时长：</span>{{ (game.record.sessionPlaytime + game.record.extraPlaytime) / 3600 }} 小时</div> -->
        </div>

      </div>
      
      <!-- 封面 -->
      <div class="right">
        <img
          v-if="game.media?.coverPath"
          :src="game.media.coverPath"
          class="cover-img"
        />
        <div v-else class="cover-placeholder">🎮</div>
      </div>
      
    </div>

    <!-- 分割线 -->
    <div class="divider"></div>

    <!--  Tab   -->
    <div class="tabs">
      <button :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">概览</button>
      <button :class="{ active: activeTab === 'stats' }" @click="activeTab = 'stats'">统计</button>
      <button :class="{ active: activeTab === 'guide' }" @click="activeTab = 'guide'">攻略</button>
    </div>

    <div v-if="activeTab === 'overview'"><GameOverview/></div>
    <div v-if="activeTab === 'stats'"><GameStats/></div>
    <div v-if="activeTab === 'guide'"><GameGuide/></div>

    <EditModal
      v-if="editType"
      :type="editType"
      @close="closeEdit"
    />
    <MediaModal
      v-if="editType === 'media'"
      @close="closeEdit"
     />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGameStore } from '@/renderer/stores/game.store'
import { useSessionStore } from '@/renderer/stores/session.store'
import { useGameActions } from '@/renderer/composables/useGameActions'
import { useRuntimeStore } from '@/renderer/stores/runtime.store'
import SettingsMenu from '@/renderer/components/OptionsMenu.vue'
import EditModal from './EditModal.vue'
import GameStats from './tabs/GameStats.vue'
import GameOverview from './tabs/GameOverview.vue'
import GameGuide from './tabs/GameGuide.vue'
import { Game } from '@/shared/types'
import { useRoute } from 'vue-router'
import router from '@/renderer/router'
import MediaModal from './MediaModal.vue'

const route = useRoute()
const gameStore = useGameStore()
const sessionStore = useSessionStore()
const runtimeStore = useRuntimeStore()
const gameActions = useGameActions()
const game = computed(() => {
  const id = route.params.id as string
  return gameStore.getGameById(id)
})

// 返回
const handleBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/library')
  }
}
// 游戏启动 / 停止
const isRunning = computed(() => runtimeStore.isGameRunning(game.value?.id || ''))
const handleLaunch = async () => {
  await gameActions.launchGame(game.value!)
} 
const handleStop = async () => {
  await gameActions.stopGame(game.value!)
} 

// 设置菜单项
const menuItems = [
  { label: '配置游戏路径', action: () =>  openEdit('exePath') },
  { label: '浏览本地文件', action: () =>  gameActions.browseFolder(game.value!) },
  // { label: '更新游戏信息', action: () =>  gameActions.updateGameInfo(game.value!) },
  { label: '标记 NSFW', action: () => gameActions.toggleNSFW(game.value!) },
  { label: '启用 Magpie', action: () =>  gameActions.toggleMagpie(game.value!) },
  { label: '配置媒体文件', action: () =>  openEdit('media') },
  { label: '移除游戏', action: () =>  gameActions.removeGame(game.value!), danger: true }
]

// 游玩状态
const statusMap = {
  'NotStarted': '未开始',
  'Playing':    '游玩中',
  'OnHold':     '搁置中',
  'Completed':  '已完成'
} as const;
const statusItems = [
  { label: '未开始', action: () => gameActions.updatePlayStatus(game.value!, 'NotStarted') },
  { label: '游玩中', action: () => gameActions.updatePlayStatus(game.value!, 'Playing') },
  { label: '搁置中', action: () => gameActions.updatePlayStatus(game.value!, 'OnHold') },
  { label: '已完成', action: () => gameActions.updatePlayStatus(game.value!, 'Completed') }
]
const currentStatus = computed(() => {
  const status = game.value?.record.playStatus as keyof typeof statusMap;
  return statusMap[status] || { label: '未知', class: '' };
});

// 游玩时长
const playtimeFormat = ref<'detail' | 'decimal'>('detail')
const totalPlaytime = computed(() =>
  game.value
    ? game.value.record.sessionPlaytime +
      game.value.record.extraPlaytime
    : 0
)
const formattedPlaytime = computed(() => {
  const sec = totalPlaytime.value
  if (playtimeFormat.value === 'decimal') {
    return `${(sec / 3600).toFixed(1)}h`
  }
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h${m}m`
  if (m > 0) return `${m}m`
  return `${sec}s`
})
const togglePlaytimeFormat = () => {
  playtimeFormat.value =
    playtimeFormat.value === 'detail'
      ? 'decimal'
      : 'detail'
}

// Tab 切换
const activeTab = ref<'overview' | 'stats' | 'guide'>('overview')

// 编辑框
const editType = ref<keyof Game | null>(null)
const openEdit = (type: keyof Game) => {
  editType.value = type
}
const closeEdit = () => {
  editType.value = null
}
// 装载 sessions
watch(
  () => game.value?.id,
  (id) => { if (id) {
    sessionStore.loadGameSessions(id);
    // console.log(sessionStore.sessionsByGame[id]);
   }},
  { immediate: true }
)
</script>


<style scoped>
.game-page {
  display: flex;
  flex-direction: column;
  color: #1f2937;
  background: #f5f7fa;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 30px;
  box-sizing: border-box;
}

/* 滚动条 */
.game-page::-webkit-scrollbar {
  width: 6px;
}
.game-page::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,.2);
  border-radius: 999px;
}

.back-btn {
  width: 80px;
  background: white;
  border: 1px solid #e5e7eb;
  padding: 8px 12px;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0,0,0,.05);
}

.back-btn:hover {
  background: #e5e7eb;
}

/* ===== 顶部区域 ===== */
.top-section {
  display: flex;
  justify-content: space-between;
  gap: 60px;
  align-items: flex-start;
}

.left {
  flex: 1;
}

.title {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 18px;
  color: #111827;
  letter-spacing: -0.5px;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stats-row {
  display: flex;
  gap: 32px;
  margin-bottom: 30px;
}
.playtime {
  /* font-weight: 600; */
  color: #2563eb;
  cursor: context-menu;
  transition: color 0.2s ease;
}
/* 按钮组 */
.launch-btn {
  background: #2563eb;
  border: none;
  padding: 12px 26px;
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 12px;
}

.launch-btn:hover {
  background: #1e40af;
  transform: translateY(-2px);
}

.settings-btn {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  cursor: pointer;
}

.settings-btn:hover {
  background: #e5e7eb;
}

/* 封面 */
.right {
  /* width: 200px; */
  height: 200px;
}

.cover-img {
  /* width: 100%; */
  height: 100%;
  border-radius: 14px;
  object-fit: cover;
  -webkit-user-drag: none; /* 禁止拖动图片 */
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.cover-placeholder {
  width: 100%;
  aspect-ratio: 3 / 4;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42px;
  border-radius: 14px;
}

/* 分割线 */
.divider {
  margin: 20px 0;
  height: 1px;
  background: #e5e7eb;
}

/* ===== Tab 样式 ===== */
.tabs {
  display: flex;
  gap: 12px; /* tab 之间的间距 */
  margin-bottom: 16px;
}

.tabs button {
  padding: 8px 20px;          /* 内边距 */
  border-radius: 10px;        /* 圆角 */
  border: none;               /* 去掉默认边框 */
  background: #f3f4f6;        /* 默认背景色 */
  color: #374151;             /* 默认文字颜色 */
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;  /* hover 动画 */
}

.tabs button:hover {
  background: #e5e7eb;       /* hover 背景色 */
}

.tabs button.active {
  background: #2563eb;       /* 激活背景色 */
  color: #ffffff;            /* 激活文字颜色 */
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); /* 激活的轻微阴影 */
}
</style>

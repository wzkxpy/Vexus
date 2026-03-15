<!-- src/renderer/components/GameDetail.vue -->
<template>
  <div v-if="game" class="game-detail">
    
    <button class="back-btn" @click="emit('back')">
      ← 返回
    </button>

    <!-- 顶部横幅 -->
    <!-- <div class="banner">
      <img
        v-if="game.media?.bannerPath"
        :src="game.media.bannerPath"
        class="banner-img"
      />
      <div v-else class="banner-placeholder"></div>
    </div> -->

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
              <!-- 设置按钮 -->
              <button class="settings-btn">⚙</button>
            </template>
          </SettingsMenu>
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

  </div>

  <EditModal
    v-if="editType"
    :type="editType"
    @close="closeEdit"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGameStore } from '@/renderer/stores/game.store'
import { useSessionStore } from '@/renderer/stores/session.store'
import { useGameActions } from '@/renderer/composables/useGameActions'

import SettingsMenu from '@/renderer/components/OptionsMenu.vue'
import EditModal from './modals/EditModal.vue'

import GameStats from './tabs/GameStats.vue'
import GameOverview from './tabs/GameOverview.vue'
import GameGuide from './tabs/GameGuide.vue'
import { Game } from '@/shared/types'

const gameStore = useGameStore()
const sessionStore = useSessionStore()
const game = computed(() => gameStore.selectedGame)
const gameActions = useGameActions()

const activeTab = ref<'overview' | 'stats' | 'guide'>('overview')

const emit = defineEmits<{ (e: 'back'): void }>()

// 游戏启动 / 停止
const isRunning = ref(false)
const handleLaunch = async () => {
  await gameActions.launchGame(game.value!)
  isRunning.value = true
} 
const handleStop = async () => {
  await gameActions.stopGame(game.value!)
  isRunning.value = false
} 
// 定义菜单项
const menuItems = [
  { label: '配置游戏路径', action: () =>  openEdit('exePath') },
  { label: '浏览本地文件', action: () =>  gameActions.browseFolder(game.value!) },
  // { label: '更新游戏信息', action: () =>  gameActions.updateGameInfo(game.value!) },
  { label: '标记 NSFW', action: () => gameActions.toggleNSFW(game.value!) },
  { label: '启用 Magpie', action: () =>  gameActions.toggleMagpie(game.value!) },
  // { label: '媒体文件设置', action: () =>  gameActions.openMediaSettings(game.value!) },
  { label: '移除游戏', action: () =>  gameActions.removeGame(game.value!), danger: true }
]
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
.game-detail {
  display: flex;
  flex-direction: column;
  /* gap: 24px; */
  color: #1f2937;
  background: #f5f7fa;
  /* padding: 0px; */
  min-height: 100%;
}

.back-btn {
  width: 80px;
  background: white;
  border: 1px solid #e5e7eb;
  padding: 8px 12px;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
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

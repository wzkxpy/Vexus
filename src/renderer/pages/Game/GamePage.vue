<!-- src/renderer/pages/Game/GamePage.vue -->
<template>
  <div v-if="game" class="game-page">
    <div class="drag-area"></div>
    <button class="back-btn" @click="handleBack()"><span>←</span> 返回</button>

    <!-- 标题 + 封面 -->
    <div class="top-section">
      <!-- 封面 -->
      <div class="right">
        <img
          v-if="game.media?.coverPath"
          :src="game.media.coverPath"
          class="cover-img"
        />
        <div v-else class="cover-placeholder">🎮</div>
      </div>

      <div class="left">

        <div class="title">
          <span class="title-main">
            {{ displayTitleParts.main }}
          </span>
          <span v-if="displayTitleParts.sub" class="title-sub">
            {{ displayTitleParts.sub }}
          </span>
        </div>
        
        <div class="action-row">
          <button class="launch-btn" :class="{ running: isRunning }" @click="isRunning ? handleStop() : handleLaunch()">
            {{ isRunning ? '■ 停止游戏' : '▶ 启动游戏' }}
          </button>
          
          <OptionsMenu :items="menuItems" :context="game">
            <template #button>
              <button class="settings-btn">⚙</button>
            </template>
          </OptionsMenu>
        </div>

        <!-- 游玩数据 -->
        <div class="stats-row">
          <div class="stat-item"><span class="stat-label">游玩状态</span>
            <OptionsMenu :items="statusItems" :context="game" :selected="game.record.playStatus">
              <template #button>
                <button class="status-btn">{{ currentStatus }}</button>
              </template>
            </OptionsMenu>
          </div>
          <div class="stat-item">
            <span class="stat-label">游玩时长</span>
            <span
              class="playtime"
              @contextmenu.prevent="togglePlaytimeFormat"
            >
              {{ formattedPlaytime }}
            </span>
          </div>
          <div class="score-section" v-if="game.externalScore">
            <span class="score-title">网站评分</span>
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
            <button class="edit-btn" aria-label="编辑评分" title="编辑" @click="openEdit('externalScore')">✎</button>
          </div>
        </div>
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

    <div class="tab-content">
      <GameOverview v-if="activeTab === 'overview'" />
      <GameStats v-if="activeTab === 'stats'" />
      <GameGuide v-if="activeTab === 'guide'" />
    </div>

    <EditModal
      v-if="uiStore.activeModal?.startsWith('edit-')"
      :type="uiStore.activeModal.replace('edit-', '') as keyof Game"
      @close="uiStore.activeModal = null"
    />

    <MediaModal
      v-if="uiStore.activeModal === 'media'"
      @close="uiStore.activeModal = null"
     />

    <TitleSplitModal
      v-if="uiStore.activeModal === 'titleSplit'"
      :original-title="game?.originalTitle || ''"
      :localized-title="game?.localizedTitle"
      :initial-split="game?.titleSplit || [null, null, null, null]"
      @close="uiStore.activeModal = null"
      @save="handleSaveTitleSplit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useGameStore } from '@/renderer/stores/game.store'
import { useSessionStore } from '@/renderer/stores/session.store'
import { useGameActions } from '@/renderer/composables/useGameActions'
import { useRuntimeStore } from '@/renderer/stores/runtime.store'
import { useUIStore } from '@/renderer/stores/ui.store'
import OptionsMenu from '@/renderer/components/OptionsMenu.vue'
import EditModal from './EditModal.vue'
import GameStats from './tabs/GameStats.vue'
import GameOverview from './tabs/GameOverview.vue'
import GameGuide from './tabs/GameGuide.vue'
import { Game, TitleSplit } from '@/shared/types'
import { useRoute } from 'vue-router'
import router from '@/renderer/router'
import MediaModal from './MediaModal.vue'
import TitleSplitModal from './TitleSplitModal.vue'
import { splitTitle } from '@/shared/utils/title'

const route = useRoute()
const gameStore = useGameStore()
const sessionStore = useSessionStore()
const runtimeStore = useRuntimeStore()
const gameActions = useGameActions()
const game = computed(() => {
  const id = route.params.id as string
  return gameStore.getGameById(id)
})
const uiStore = useUIStore()

// 返回
// 如果有历史记录则返回上一页，否则返回游戏库
const handleBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/library')
  }
}

// 标题设置项
const gameTitleSetting = ref<'Orig' | 'Local'>('Orig')
const subTitleSetting = ref(true)

// 标题拆分显示
const displayTitleParts = computed(() => {
  if (!game.value) {
    return { main: '', sub: null }
  }
  // 根据设置选择使用原名还是译名
  const useLocal = gameTitleSetting.value === 'Local' && game.value.localizedTitle
  const title = useLocal
      ? game.value.localizedTitle as string
      : game.value.originalTitle as string
  // 如果不区分主副标题，直接返回完整标题
  if (!subTitleSetting.value) {
    return {
      main: title,
      sub: null
    }
  }

  const split = game.value.titleSplit
  const mainEnd = useLocal ? split[2] : split[0]
  const subStart = useLocal ? split[3] : split[1]
  return splitTitle(title, mainEnd, subStart)
})

// 游戏启动 / 停止
const isRunning = computed(() => runtimeStore.isGameRunning(game.value?.id || ''))
const handleLaunch = async () => {
  await gameActions.launchGame(game.value!)
} 
const handleStop = async () => {
  await gameActions.stopGame(game.value!)
} 

// 设置菜单项
const menuItems = computed(() => [
  { label: '配置游戏路径', action: () => openEdit('exePath') },
  { label: '浏览本地文件', action: () => gameActions.browseFolder(game.value!) },
  { label: '划分主副标题', action: () => uiStore.activeModal = 'titleSplit' },
  // { label: '更新游戏信息', action: () =>  gameActions.updateGameInfo(game.value!) },
  { label: '标记 NSFW', action: () => gameActions.toggleNSFW(game.value!), checked: game.value?.settings?.nsfw },
  { label: '启用 Magpie', action: () => gameActions.toggleMagpie(game.value!), checked: game.value?.settings?.magpie },
  { label: '配置媒体文件', action: () => uiStore.activeModal = 'media' },
  { label: '移除游戏', action: () => gameActions.removeGame(game.value!), danger: true }
])

// 游玩状态
const statusMap = {
  'NotStarted': '未开始',
  'Playing':    '游玩中',
  'OnHold':     '搁置中',
  'Completed':  '已完成'
} as const;
const statusItems = [
  { label: '未开始', value: 'NotStarted', action: () => gameActions.updatePlayStatus(game.value!, 'NotStarted') },
  { label: '游玩中', value: 'Playing', action: () => gameActions.updatePlayStatus(game.value!, 'Playing') },
  { label: '搁置中', value: 'OnHold', action: () => gameActions.updatePlayStatus(game.value!, 'OnHold') },
  { label: '已完成', value: 'Completed', action: () => gameActions.updatePlayStatus(game.value!, 'Completed') }
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

// 用于手动标题划分保存
const handleSaveTitleSplit = (titleSplit: TitleSplit) => {
  gameActions.updateTitleSplit(game.value!.id, titleSplit)
  uiStore.activeModal = null
}

// Tab栏切换
const activeTab = ref<'overview' | 'stats' | 'guide'>('overview')

// 编辑框
// const editType = ref<keyof Game | null>(null)
const openEdit = (type: keyof Game) => {
  // editType.value = type
  uiStore.activeModal = 'edit-' + type
}

// 加载设置项
onMounted(async () => {
  gameTitleSetting.value =
    await window.settingsAPI.getSetting('gameTitle')
  subTitleSetting.value =
    await window.settingsAPI.getSetting('subTitle')
})
// 装载 sessions
watch(
  () => game.value?.id,
  async (id) => { if (id) {
    await sessionStore.loadGameSessions(id);
    // console.log(sessionStore.getGameSessions(id));
    // console.log(uiStore.currentPage);
   }},
  { immediate: true }
)
</script>


<style scoped>
/* ===== 页面骨架 ===== */
.game-page {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 24px clamp(28px, 5vw, 72px) 56px;
  overflow-x: hidden;
  overflow-y: auto;
  color: #283142;
  user-select: none;
  background:
    radial-gradient(circle at 88% 3%, rgba(112, 145, 225, 0.12), transparent 28%),
    #f5f7fb;
}

.drag-area {
  position: fixed;
  top: 0;
  right: 138px;
  left: 0;
  z-index: 99;
  height: 52px;
  /* background: yellow; */
  -webkit-app-region: drag;
}

.game-page::-webkit-scrollbar {
  width: 6px;
}

.game-page::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #cbd2df;
}

/* ===== 返回按钮 ===== */
.back-btn {
  z-index: 999;
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  width: auto;
  margin-bottom: 22px;
  padding: 7px 11px;
  gap: 7px;
  border: 1px solid #e2e6ed;
  border-radius: 9px;
  color: #687386;
  background: #fff;
  box-shadow: 0 3px 12px rgba(50, 61, 86, 0.05);
  font-size: 13px;
  cursor: pointer;
  transition: 0.18s ease;
  -webkit-app-region: no-drag;
}

.back-btn:hover {
  color: #3c65c5;
  border-color: #cfdaf3;
  background: #fff;
  transform: translateX(-2px);
}

/* ===== 顶部资料区 ===== */
.top-section {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  min-height: 220px;
  gap: 30px;
}

.left {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  max-width: 760px;
  margin-bottom: 18px;
  gap: 7px 10px;
}

.title-main {
  color: #20283a;
  font-size: clamp(24px, 2.6vw, 30px); /* min 24, max 30 */
  font-weight: 600;
  line-height: 1.24;
  letter-spacing: -0.035em;
}

.title-sub {
  color: #7f899b;
  font-size: 20px;
  font-weight: 400;
  line-height: 1.4;
}

.action-row {
  display: flex;
  align-items: center;
  margin-bottom: 22px;
  gap: 9px;
}

/* ===== 操作按钮 ===== */
.launch-btn {
  min-width: 118px;
  height: 38px;
  padding: 0 18px;
  border: 0;
  border-radius: 9px;
  color: #fff;
  background: linear-gradient(135deg, #648be7, #5279dc);
  box-shadow: 0 7px 17px rgba(77, 115, 207, 0.24);
  font-size: 14px;
  font-weight: 550;
  cursor: pointer;
  transition: 0.18s ease;
}

.launch-btn:hover {
  background: linear-gradient(135deg, #648be7, #5279dc);
  box-shadow: 0 9px 21px rgba(77, 115, 207, 0.3);
  transform: translateY(-1px);
}

.launch-btn.running {
  background: linear-gradient(135deg, #e36f79, #d65360);
  box-shadow: 0 7px 17px rgba(202, 76, 89, 0.2);
}

.settings-btn {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid #e0e4eb;
  border-radius: 9px;
  color: #6d7788;
  background: #f8f9fb;
  font-size: 14px;
  cursor: pointer;
  transition: 0.18s ease;
}

.settings-btn:hover {
  color: #4f70bd;
  border-color: #ccd7ee;
  background: #f0f4fc;
}

.edit-btn {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  color: #7c8799;
  background: #f0f3f8;
  font-size: 14px;
  cursor: pointer;
}

.edit-btn:hover {
  color: #4f72c4;
  background: #e9effb;
}

/* ===== 评分与游玩数据 ===== */
.score-section {
  display: inline-flex;
  align-items: center;
  min-height: 35px;
  padding: 5px 7px 5px 10px;
  gap: 12px;
  border: 1px solid #e8ebf1;
  border-radius: 9px;
  background: #fafbfc;
  white-space: nowrap;
}

.score-title {
  color: #8b94a4;
  font-size: 13px;
}

.score-grid {
  display: flex;
  align-items: center;
  gap: 14px;
}

.score-grid > div {
  position: relative;
  color: #3f4858;
  font-size: 13px;
}

.score-grid > div + div::before {
  content: '';
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: -7px;
  width: 1px;
  background: #e2e6ed;
}

.score-grid .label {
  margin-right: 3px;
  color: #8b94a4;
}

.stats-row {
  display: flex;
  flex-wrap: nowrap;
  margin: auto 0 0;
  gap: 10px;
}

.stat-item {
  display: flex;
  align-items: center;
  min-height: 35px;
  padding: 5px 10px;
  gap: 9px;
  border: 1px solid #e8ebf1;
  border-radius: 9px;
  background: #fafbfc;
}

.stat-label {
  color: #929aaa;
  font-size: 12px;
}

.status-btn {
  padding: 3px 8px;
  border: 0;
  border-radius: 6px;
  color: #4f72c4;
  background: #eaf0fc;
  font-size: 13px;
  cursor: pointer;
}

.playtime {
  color: #4f72c4;
  font-size: 14px;
  font-weight: 550;
  cursor: context-menu;
}

/* ===== 封面 ===== */
.right {
  flex: 0 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 260px;
  height: 220px;
}

.cover-img {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  border-radius: 12px;
  object-fit: contain;
  box-shadow: 0 14px 28px rgba(35, 45, 67, 0.18);
  -webkit-user-drag: none;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 154px;
  height: 205px;
  border: 1px dashed #d7dce6;
  border-radius: 12px;
  color: #a4adbc;
  background: linear-gradient(145deg, #f2f4f8, #e8ecf3);
  font-size: 34px;
}

/* ===== 内容导航 ===== */
.divider {
  height: 1px;
  margin: 20px 0 0;
  background: #e4e6eb;
}

.tabs {
  display: flex;
  margin: 0 0 20px;
  padding-top: 10px;
  gap: 4px;
}

.tabs button {
  position: relative;
  padding: 9px 16px;
  border: 0;
  border-radius: 0;
  color: #858e9e;
  background: transparent;
  font-size: 14px;
  font-weight: 450;
  cursor: pointer;
  transition: 0.18s ease;
}

.tabs button:hover {
  color: #4d5a70;
  background: transparent;
}

.tabs button.active {
  color: #4d72c8;
  background: transparent;
  box-shadow: none;
  font-weight: 600;
}

.tabs button.active::after {
  content: '';
  position: absolute;
  right: 13px;
  bottom: -11px;
  left: 13px;
  height: 2px;
  border-radius: 2px;
  background: #6286dc;
}

.tab-content {
  min-height: 200px;
}

/* ===== 窄窗口适配 ===== */
@media (max-width: 720px) {
  .game-page {
    padding-right: 24px;
    padding-left: 24px;
  }

  .top-section {
    gap: 24px;
  }

  .title-main {
    font-size: 23px;
  }

  .right {
    flex-basis: 180px;
    width: 180px;
    height: 180px;
  }
}
</style>

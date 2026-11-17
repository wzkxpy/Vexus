<!-- src/renderer/pages/Game/GamePage.vue -->
<template>
  <div v-if="game" ref="pageElement" class="game-page" @scroll.passive="handlePageScroll">
    <div class="drag-area"></div>
    <Transition name="compact-header">
      <header v-if="showCompactHeader" class="compact-header" aria-label="游戏快捷操作">
        <div class="compact-title" :class="{ 'compact-title-hidden': !titleScrolledPast }" :title="[displayTitleParts.main, displayTitleParts.sub].filter(Boolean).join(' ')">
          <strong>{{ displayTitleParts.main }}</strong>
          <span v-if="displayTitleParts.sub">{{ displayTitleParts.sub }}</span>
        </div>
        <span v-if="playtimeScrolledPast" class="compact-playtime">{{ formattedPlaytime }}</span>
        <button v-if="launchScrolledPast" class="launch-btn compact-launch" :class="{ running: isRunning }" :disabled="launchPending"
          :aria-busy="launchPending" :aria-label="launchPending ? '请稍候' : isRunning ? '停止游戏' : '启动游戏'"
          @click="handleLaunchToggle">
          <Square v-if="isRunning" :size="13" fill="currentColor" />
          <Play v-else :size="15" fill="currentColor" />
        </button>
      </header>
    </Transition>
    <button class="back-btn" aria-label="返回" title="返回" @click="handleBack()"><ArrowLeft :size="19" /></button>

    <div class="page-content">
      <div class="top-section">
        <!-- 封面 -->
        <div class="right">
          <img
            v-if="coverImage"
            :src="coverImage"
            :alt="`${displayTitleParts.main} 封面`"
            @error="failedCover = coverImage"
            class="cover-img"
          />
          <div v-else class="cover-placeholder"><Gamepad2 :size="42" :stroke-width="1.4" /></div>
        </div>

        <div class="left">
          <h1 ref="titleElement" class="title">
            <span class="title-main">
              {{ displayTitleParts.main }}
            </span>
            <span v-if="displayTitleParts.sub" class="title-sub">
              {{ displayTitleParts.sub }}
            </span>
          </h1>
          
          <div class="action-row">
            <button ref="launchElement" class="launch-btn" :class="{ running: isRunning }" :disabled="launchPending" :aria-busy="launchPending" @click="handleLaunchToggle">
              <Square v-if="isRunning" :size="13" fill="currentColor" />
              <Play v-else :size="15" fill="currentColor" />
              {{ launchPending ? '请稍候…' : isRunning ? '停止游戏' : '启动游戏' }}
            </button>
            
            <OptionsMenu :items="menuItems" :context="game">
              <template #button>
                <button class="settings-btn" aria-label="更多操作" title="更多操作">
                  <Settings :size="16" />
                </button>
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
              <button type="button" title="点击或右键切换时长格式"
                ref="playtimeElement"
                class="playtime"
                @click="togglePlaytimeFormat"
                @contextmenu.prevent="togglePlaytimeFormat"
              >
                {{ formattedPlaytime }}
              </button>
            </div>
            <div class="score-section" v-if="game.externalScore">
              <span class="score-title">网站评分</span>
              <div class="score-grid">
                <div v-if="game.externalScore.erogame != null">
                  <span class="label">Erogame: </span>
                  {{ game.externalScore.erogame }}
                </div>
                <div v-if="game.externalScore.bgm != null">
                  <span class="label">Bangumi: </span>
                  {{ game.externalScore.bgm }}
                </div>
                <div v-if="game.externalScore.vndb != null">
                  <span class="label">VNDB: </span>
                  {{ game.externalScore.vndb }}
                </div>
              </div>
              <button class="edit-btn" aria-label="编辑评分" title="编辑" @click="openEdit('externalScore')">
                <Pencil :size="13" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 标签栏的吸附范围随正文延伸，避免受固定页面高度限制。 -->
      <div class="tab-section">
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
      </div>
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

    <ExternalIdsModal
      v-if="uiStore.activeModal === 'external-ids'"
      :game="game"
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
import { computed, ref, watch, watchEffect } from 'vue'
import { useGameStore } from '@/renderer/stores/game.store'
import { useSessionStore } from '@/renderer/stores/session.store'
import { useGameActions } from '@/renderer/composables/useGameActions'
import { useRuntimeStore } from '@/renderer/stores/runtime.store'
import { useUIStore } from '@/renderer/stores/ui.store'
import { useSettingsStore } from '@/renderer/stores/settings.store'
import OptionsMenu from '@/renderer/components/OptionsMenu.vue'
import EditModal from './EditModal.vue'
import GameStats from './tabs/GameStats.vue'
import GameOverview from './tabs/GameOverview.vue'
import GameGuide from './tabs/GameGuide.vue'
import { Game, TitleSplit } from '@/shared/types'
import { useRoute } from 'vue-router'
import { ArrowLeft, Gamepad2, Pencil, Play, Settings, Square } from '@lucide/vue'
import router from '@/renderer/router'
import MediaModal from './MediaModal.vue'
import ExternalIdsModal from './ExternalIdsModal.vue'
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
const pageElement = ref<HTMLElement | null>(null)
const titleElement = ref<HTMLElement | null>(null)
const launchElement = ref<HTMLElement | null>(null)
const playtimeElement = ref<HTMLElement | null>(null)
const titleScrolledPast = ref(false)
const launchScrolledPast = ref(false)
const playtimeScrolledPast = ref(false)

// 直接比较底边，快速滚动跳过整个元素时也能正确更新顶栏。
function updateCompactContent() {
  const root = pageElement.value
  if (!root) return

  const visibleTop = root.getBoundingClientRect().top + 68
  const hasScrolledPast = (element: HTMLElement | null) =>
    element !== null && element.getBoundingClientRect().bottom <= visibleTop

  titleScrolledPast.value = hasScrolledPast(titleElement.value)
  launchScrolledPast.value = hasScrolledPast(launchElement.value)
  playtimeScrolledPast.value = hasScrolledPast(playtimeElement.value)
}

watchEffect(onCleanup => {
  const root = pageElement.value
  const title = titleElement.value
  const launch = launchElement.value
  const playtime = playtimeElement.value
  if (!root || !title || !launch || !playtime) return

  const observer = new ResizeObserver(updateCompactContent)
  observer.observe(root)
  observer.observe(title)
  observer.observe(launch)
  observer.observe(playtime)
  updateCompactContent()
  onCleanup(() => observer.disconnect())
}, { flush: 'post' })

const pageScrollTop = ref(0)
// 在原返回按钮离开窗口前接管导航，不改变正文高度，避免顶栏出现时跳动。
const showCompactHeader = computed(() => pageScrollTop.value > 12)
const handlePageScroll = (event: Event) => {
  pageScrollTop.value = (event.currentTarget as HTMLElement).scrollTop
  updateCompactContent()
}

// 返回
// 如果有历史记录则返回上一页，否则返回游戏库
const handleBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/library')
  }
}

const settingsStore = useSettingsStore()
const gameTitleSetting = computed(() => settingsStore.settings?.gameTitle ?? 'Local')
const subTitleSetting = computed(() => settingsStore.settings?.subTitle ?? true)

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
const launchPending = ref(false)
const handleLaunchToggle = async () => {
  if (!game.value || launchPending.value) return
  launchPending.value = true
  try {
    if (isRunning.value) await gameActions.stopGame(game.value)
    else await gameActions.launchGame(game.value)
  } finally {
    launchPending.value = false
  }
}

// 封面加载失败时退回占位图，新地址不受旧失败记录影响。
const failedCover = ref('')
const coverImage = computed(() => {
  const path = game.value?.media?.coverPath
  return path && path !== failedCover.value ? path : ''
})
watch(() => game.value?.id, () => {
  failedCover.value = ''
})

// 设置菜单项
const menuItems = computed(() => [
  { label: '配置游戏路径', action: () => openEdit('exePath') },
  { label: '浏览本地文件', action: () => gameActions.browseFolder(game.value!) },
  { label: '划分主副标题', action: () => uiStore.activeModal = 'titleSplit' },
  { label: '编辑数据源 ID', action: () => uiStore.activeModal = 'external-ids' },
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
  return statusMap[status] || '未知';
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
  if (sec <= 0) return '0m'
  if (sec < 60) return '<1m'
  if (playtimeFormat.value === 'decimal') {
    return `${(sec / 3600).toFixed(1)}h`
  }
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h${m}m`
  return `${m}m`
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
.game-page {
  --accent: #5879cd;
  --compact-header-height: 68px;
  --page-inset: clamp(20px, 4vw, 64px);
  --page-top: 24px;
  --back-size: 36px;
  --back-gap: 6px;
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  color: #30394d;
  background: #f5f6fa;
  user-select: none;
}
.page-content {
  /* 返回按钮固定定位，正文通过顶部内边距预留空间。 */
  padding: calc(var(--page-top) + var(--back-size) + var(--back-gap)) var(--page-inset) 48px;
}
.drag-area { position: fixed; top: 0; right: 138px; left: 0; z-index: 99; height: 52px; -webkit-app-region: drag; }
button { font: inherit; cursor: pointer; transition: background .18s, color .18s, box-shadow .18s; }
button:focus-visible { outline: 3px solid #91b4ff; outline-offset: 4px; }
.back-btn {
  position: fixed;
  top: calc((var(--compact-header-height) - 1px - var(--back-size)) / 2);
  left: var(--page-inset);
  z-index: 111;
  display: grid;
  place-items: center;
  width: var(--back-size);
  height: var(--back-size);
  padding: 0;
  border: 1px solid #d7deeb;
  border-radius: 10px;
  background: white;
  color: #354966;
  -webkit-app-region: no-drag;
}
.back-btn:hover { color: #3156b4; background: #edf2fc; }
.top-section {
  /* 封面在卡片外，卡片高度只由信息区决定，不受封面高度牵制。 */
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 24px;
  margin: 0;
}
.right { flex: 0 0 144px; width: 144px; margin-top: 0; }
.cover-img, .cover-placeholder { display: block; width: 144px; height: 198px; border: 4px solid white; border-radius: 12px; box-shadow: 0 10px 24px #18284126; object-fit: cover; -webkit-user-drag: none; }
.cover-placeholder { display: grid; place-items: center; color: #8697b6; background: linear-gradient(145deg, #ecf0f8, #dce4f2); }
.left {
  flex: 1;
  min-width: 0;
  padding: 16px 24px;
  border: 1px solid #e7eaf1;
  border-radius: 18px;
  background: white;
  box-shadow: 0 12px 35px #273e6310;
}
.title { display: flex; flex-direction: column; gap: 6px; margin: 0 0 14px; overflow-wrap: anywhere; }
.title-main { color: #26324b; font-size: clamp(23px, 2.4vw, 34px); font-weight: 650; line-height: 1.3; letter-spacing: -.025em; }
.title-sub { color: #8a94a7; font-size: 15px; font-weight: 400; line-height: 1.5; }
.action-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.launch-btn { display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-width: 148px; height: 42px; padding: 0 23px; border: 0; border-radius: 10px; background: #597bd3; color: white; font-size: 13px; font-weight: 600; box-shadow: 0 5px 14px #597bd330; }
.launch-btn:hover { background: #496bc2; box-shadow: 0 6px 18px #597bd345; }
.launch-btn.running { background: #cf6473; }
.launch-btn:disabled { opacity: .6; cursor: wait; }
.settings-btn { display: grid; place-items: center; width: 42px; height: 42px; border: 1px solid #e4e8f0; border-radius: 10px; color: #7a879e; background: #f8f9fc; }
.settings-btn:hover, .edit-btn:hover { background: #eaf0fc; color: var(--accent); }
.stats-row { display: flex; flex-wrap: wrap; gap: 16px 24px; padding-top: 12px; border-top: 1px solid #eef0f5; }
.stat-item, .score-section { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; }
.stat-label, .score-title { color: #939caf; font-size: 11px; }
.status-btn { padding: 4px 9px; border: 0; border-radius: 6px; background: #edf2fc; color: var(--accent); font-size: 12px; }
.playtime { border: 0; padding: 3px 0; background: transparent; color: #4d5e7d; font-size: 13px; font-weight: 600; }
.score-grid { display: flex; flex-wrap: wrap; gap: 7px 12px; color: #465773; font-size: 12px; }
.score-grid .label { color: #939caf; font-size: 10px; }
.edit-btn { display: grid; place-items: center; width: 23px; height: 23px; border: 0; border-radius: 6px; background: #f3f5fa; color: #8b97ad; }
.tabs {
  position: sticky;
  top: var(--compact-header-height);
  z-index: 10;
  display: flex;
  gap: 26px;
  margin: 16px 0;
  border-bottom: 1px solid #e1e6ef;
  background: #f5f6fa;
}
.tabs button { position: relative; padding: 12px 7px 15px; border: 0; background: transparent; color: #919aab; font-size: 14px; }
.tabs button:hover { color: var(--accent); }
.tabs button.active { color: var(--accent); font-weight: 600; }
.tabs button.active::after { content: ''; position: absolute; bottom: -1px; left: 6px; right: 6px; height: 3px; border-radius: 3px; background: var(--accent); }
.tab-content { min-height: 200px; }
.game-page::-webkit-scrollbar { width: 6px; }
.game-page::-webkit-scrollbar-thumb { background: #cbd2df; border-radius: 6px; }
@media (max-width: 900px) {
  .top-section { gap: 20px; }
  .left { padding: 16px 20px; }
  .right { flex-basis: 122px; width: 122px; }
  .cover-img, .cover-placeholder { width: 122px; height: 170px; }
}
@media (max-width: 600px) {
  .game-page { --page-inset: 16px; --page-top: 20px; }
  .page-content { padding-bottom: 32px; }
  .top-section { flex-direction: column; gap: 12px; }
  .right { flex-basis: auto; margin-top: 0; }
  .cover-img, .cover-placeholder { width: 90px; height: 124px; }
  .left { width: 100%; padding: 14px 18px; }
  .stats-row { gap: 14px; }
  .score-section { flex-basis: 100%; }
  .tabs { margin-top: 16px; }
}
.compact-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 110;
  display: flex;
  align-items: center;
  gap: 16px;
  height: var(--compact-header-height);
  padding: 0 160px 0 calc(var(--page-inset) + 72px);
  border-bottom: 1px solid #d7deeb;
  background: rgba(250, 251, 254, .96);
  box-shadow: 0 4px 18px #24344e0d;
  backdrop-filter: blur(18px);
  -webkit-app-region: drag;
}
.compact-header button { flex-shrink: 0; -webkit-app-region: no-drag; }
.compact-title { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.compact-title-hidden { visibility: hidden; }
.compact-title strong, .compact-title span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.compact-title strong { font-size: 16px; font-weight: 600; color: #27364f; }
.compact-title span { font-size: 12px; color: #596b86; }
.compact-playtime { color: #526580; font-size: 13px; white-space: nowrap; }
.compact-launch { width: 36px; min-width: 36px; height: 36px; padding: 0; box-shadow: none; }
.compact-header-enter-active, .compact-header-leave-active { transition: opacity .16s ease, transform .16s ease; }
.compact-header-enter-from, .compact-header-leave-to { opacity: 0; transform: translateY(-8px); }
@media (max-width: 900px) {
  .compact-playtime { display: none; }
}
@media (max-width: 600px) {
  .compact-header { gap: 10px; padding-right: 154px; }
  .compact-title strong { font-size: 14px; }
  .compact-title span { font-size: 11px; }
}
@media (prefers-reduced-motion: reduce) {
  .compact-header-enter-active, .compact-header-leave-active { transition: none; }
}
</style>

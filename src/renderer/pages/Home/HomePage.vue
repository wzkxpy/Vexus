<!-- src/renderer/pages/Home/HomePage.vue -->
<template>
  <div class="home-container">
    <div class="drag-area"></div>
    <transition name="bg-fade">
      <div :key="game?.id" class="background-wrapper">
        <div 
          class="bg-image" 
          :style="{ backgroundImage: `url(${game?.media?.bannerPath})` }"
          v-if="game?.media?.bannerPath"
        ></div>
        <div v-else class="bg-fallback"></div>
        <div class="bg-overlay"></div>
      </div>
    </transition>

    <main class="main-content">
      <transition name="main-rise">
        <div :key="game?.id" class="game-info">
          <h1 class="game-title">{{ game?.originalTitle || 'Add a Game' }}</h1>
          
          <div class="game-metadata" v-if="game">
            <span class="meta-item">游玩时长: {{ game.record.sessionPlaytime + game.record.extraPlaytime }}</span>
            <span class="meta-divider">|</span>
            <span class="meta-item">{{ game.basicInfo.developer || '未知开发者' }}</span>
          </div>

          <div v-if="game" class="game-actions">
            <button
              class="launch-btn"
              @click="gameActions.launchGame(game)"
            >
              <span class="icon">▶</span> START GAME
            </button>
            <button
              class="detail-btn"
              aria-label="查看游戏详情"
              @click="openGameDetails"
            >
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>
      </transition>
    </main>

    <!-- banner -->
    <footer class="game-carousel">
      <!-- 左按钮 -->
      <button
        v-if="showLeft"
        class="nav-btn left"
        @click="scrollLeftFn"
      >
        ‹
      </button>
      <!-- 滚动区域 -->
      <div
        class="carousel-track"
        :class="{ 'has-hovered': hoveredIndex !== -1 }"
        ref="trackRef"
        @scroll="updateArrows"
        @pointermove="handleTrackPointerMove"
        @pointerleave="hoveredGameId = null"
      >
        <GameCard
          v-for="(g, index) in recentGames"
          :key="g.id"
          :game="g"
          :show-title="false" 
          class="carousel-item"
          :class="{
            'is-active': g.id === game?.id,
            'is-hovered': index === hoveredIndex,
            'is-before-hovered': hoveredIndex !== -1 && index < hoveredIndex,
            'is-after-hovered': hoveredIndex !== -1 && index > hoveredIndex
          }"
          @click="gameStore.setFeaturedGame(g.id)"
        />
      </div>
      <!-- 右按钮 -->
      <button
        v-if="showRight"
        class="nav-btn right"
        @click="scrollRightFn"
      >
        ›
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useGameStore } from '@/renderer/stores/game.store'
import { useGameActions } from '@/renderer/composables/useGameActions'
import GameCard from '@/renderer/components/HomeGameCard.vue'
import router from '@/renderer/router'

const gameStore = useGameStore()
const gameActions = useGameActions()
const game = computed(() => gameStore.featuredGame)

const openGameDetails = () => {
  if (game.value) router.push(`/game/${game.value.id}`)
}

// 游戏卡片左右滚动相关
const trackRef = ref<HTMLElement | null>(null)
const showLeft = ref(false)
const showRight = ref(false)
const hoveredGameId = ref<string | null>(null)
const hoveredIndex = computed(() =>
  recentGames.value.findIndex(g => g.id === hoveredGameId.value)
)

// 在卡片间隙中也选择离鼠标最近的卡片，避免 hover 状态短暂丢失。
const handleTrackPointerMove = (event: PointerEvent) => {
  const track = trackRef.value
  if (!track) return

  const cards = Array.from(track.querySelectorAll<HTMLElement>('.carousel-item'))
  if (!cards.length) return

  const trackRect = track.getBoundingClientRect()
  let closestIndex = 0
  let closestDistance = Number.POSITIVE_INFINITY
  cards.forEach((card, index) => {
    // offsetLeft 不受 transform 影响，突出动画不会反过来改变命中边界。
    const cardCenter = trackRect.left + card.offsetLeft - track.scrollLeft + card.offsetWidth / 2
    const distance = Math.abs(event.clientX - cardCenter)
    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = index
    }
  })

  hoveredGameId.value = recentGames.value[closestIndex]?.id ?? null
}
const updateArrows = () => {
  const el = trackRef.value
  if (!el) return
  showLeft.value = el.scrollLeft > 5
  showRight.value =
    el.scrollLeft + el.clientWidth < el.scrollWidth - 5
}
const scrollLeftFn = () => {
  trackRef.value?.scrollBy({
    left: -420,
    behavior: 'smooth'
  })
}
const scrollRightFn = () => {
  trackRef.value?.scrollBy({
    left: 420,
    behavior: 'smooth'
  })
}

// 获取最近的游戏列表
const recentGames = computed(() => {
  return [...gameStore.games]
    .sort((a, b) => (b.record.lastRunAt || '').localeCompare(a.record.lastRunAt || ''))
    .slice(0, 12)
})

// 初始化：默认选中第一个游戏
onMounted(async () => {
  await gameStore.initGames()
  if (!gameStore.featuredGame && recentGames.value.length > 0) {
    gameStore.setFeaturedGame(recentGames.value[0].id)
  }
  nextTick(updateArrows)
})

</script>

<style scoped>
.home-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: white;
  background-color: #050505;
}
.drag-area {
  position: absolute;
  top: 0;
  left: 0;
  right: 140px; /* 留出窗口控制按钮区域 */
  height: 70px;
  -webkit-app-region: drag;
  z-index: 50;
  /* background-color: red;  */
}

/* 背景及遮罩 */
.background-wrapper {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.bg-image {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center 20%;
  transition: transform 1s ease;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      to right,
      rgba(5, 8, 14, 0.72) 0%,
      rgba(5, 8, 14, 0.34) 40%,
      rgba(5, 8, 14, 0.08) 68%,
      transparent 100%
    ),
    linear-gradient(
      to bottom,
      rgba(4, 6, 10, 0.16) 0%,
      transparent 48%,
      rgba(4, 6, 10, 0.22) 100%
    );
}

.bg-fallback {
  width: 100%;
  height: 100%;
  background: #d7d5d4;
}

/* 主内容区 */
.main-content {
  position: relative;
  z-index: 10;
  padding: 80px 60px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  user-select: none;
}

.game-title {
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  max-width: 60%;
  line-height: 1.1;
  text-transform: uppercase;
  letter-spacing: -1px;
}

.game-metadata {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}

.meta-divider {
  opacity: 0.3;
}

.game-actions {
  margin-top: 40px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.launch-btn,
.detail-btn {
  padding: 14px 40px;
  font-size: 1.1rem;
  font-weight: bold;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.4s ease;
}

.launch-btn {
  background: white;
  color: black;
}

.launch-btn:hover {
  background: #4ade80; /* 启动时变绿或保持白色微调 */
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.4);
}

.detail-btn {
  justify-content: center;
  width: 50px;
  height: 50px;
  padding: 0;
  color: #111;
  background: #fff;
  opacity: 0.4;
  font-size: 1.35rem;
  font-weight: 600;
}

.detail-btn:hover {
  color: #111;
  opacity: 1;
  background: #e5e7eb;
  transform: scale(1.05);
}

/* 底部卡片列表 */
.game-carousel {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 10px 60px 34px;
  z-index: 20;
  opacity: 0.5;
  /* 扣除外层和轨道留白后，露出约 34px 的封面顶端。 */
  transform: translateY(calc(100% - 76px));
  transition:
    transform 0.72s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.55s ease;
  will-change: transform, opacity;
}

/* 鼠标进入底部露出的感应区后，完整展开游戏列表。 */
.game-carousel:hover,
.game-carousel:focus-within {
  opacity: 1;
  transform: translateY(0);
}

/* 按钮 */
.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.2);
  color: white;
  font-size: 28px;
  cursor: pointer;
  z-index: 30;
  transition: all 0.72s ease;
  backdrop-filter: blur(8px);
}

.nav-btn:hover {
  background: rgba(255,255,255,0.6);
  color: black;
}

/* 左右定位 */
.nav-btn.left {
  left: 30px;
}
.nav-btn.right {
  right: 30px;
}

.carousel-track {
  position: relative;
  display: flex;
  gap: 10px;
  overflow-x: auto;
  overflow-y: visible;
  /* 横向滚动容器会裁剪纵向溢出，上下均为动画和阴影预留空间。 */
  padding: 32px 10px 30px;
  scrollbar-width: none; /* 隐藏滚动条 */
}

.carousel-track::-webkit-scrollbar {
  display: none;
}

.carousel-item {
  flex: 0 0 132px; /* 固定宽度 */
  opacity: 0.72;
  cursor: pointer;
  transform-origin: center bottom;
  transition:
    opacity 0.35s ease,
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.35s ease;
}

/* 鼠标在列表内移动时，非当前卡片退到次要层级。 */
/* .carousel-track.has-hovered .carousel-item:not(.is-hovered) {
  opacity: 0.6; 
  filter: saturate(0.65); 
} */

/* 当前卡片左侧的项目整体左移，给放大区域对称让位。 */
.carousel-item.is-before-hovered {
  transform: translateX(-14px) scale(0.96);
}

/* 当前卡片右侧的项目整体右移，与左侧形成对称展开。 */
.carousel-item.is-after-hovered {
  transform: translateX(14px) scale(0.96);
}

/* 当前选中的卡片（非悬停的卡片） */
.carousel-item.is-active {
  opacity: 0.95;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.5);
  outline: 2px solid white;
}

/* 离鼠标最近的卡片 */
/* 最后声明，确保它优先于 active 和兄弟弱化样式。 */
.carousel-item.is-hovered {
  z-index: 2;
  opacity: 1;
  filter: none;
  transform: translateY(-10px) scale(1.08);
  box-shadow: 0 16px 28px rgba(0, 0, 0, 0.48);
}

/* --------- 背景动态效果 --------- */

/* 封面切换效果 */
.bg-fade-enter-active, .bg-fade-leave-active {
  transition: opacity 1s ease;
}
.bg-fade-enter-from, .bg-fade-leave-to {
  opacity: 0;
}
/* 标题上浮效果 */
.main-rise-enter-active {
  transition: all 0.75s ease-out;
}
.main-rise-enter-from {
  opacity: 0;
  transform: translateY(30px);
}
</style>

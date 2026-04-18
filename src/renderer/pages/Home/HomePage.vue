<template>
  <div class="home-container">
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
            <span class="meta-item">游玩时长: {{ game.record.lastRunDate || '尚未开始' }}</span>
            <span class="meta-divider">|</span>
            <span class="meta-item">{{ game.basicInfo.developer || '未知开发者' }}</span>
          </div>

          <button 
            class="launch-btn" 
            v-if="game"
            @click="gameActions.launchGame(game)"
          >
            <span class="icon">▶</span> START GAME
          </button>
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
      <div class="carousel-track" ref="trackRef" @scroll="updateArrows">
        <GameCard
          v-for="g in recentGames"
          :key="g.id"
          :game="g"
          :show-title="false" 
          class="carousel-item"
          :class="{ 'is-active': g.id === game?.id }"
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

const gameStore = useGameStore()
const gameActions = useGameActions()
const game = computed(() => gameStore.featuredGame)

// 游戏卡片左右滚动相关
const trackRef = ref<HTMLElement | null>(null)
const showLeft = ref(false)
const showRight = ref(false)
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
    .sort((a, b) => (b.record.lastRunDate || '').localeCompare(a.record.lastRunDate || ''))
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
  transition: transform 0.8s ease;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  /* 复合渐变：底部深色向上，左侧深色向右 */
  background: linear-gradient(to top, rgba(5, 5, 5, 1) 5%, transparent 60%),
              linear-gradient(to right, rgba(5, 5, 5, 0.8) 0%, transparent 50%);
}

.bg-fallback {
  width: 100%;
  height: 100%;
  background: #1a1a1a;
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

.launch-btn {
  margin-top: 40px;
  padding: 14px 40px;
  font-size: 1.1rem;
  font-weight: bold;
  background: white;
  color: black;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
}

.launch-btn:hover {
  background: #4ade80; /* 启动时变绿或保持白色微调 */
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.4);
}

/* 底部卡片列表 */
.game-carousel {
  position: absolute;
  bottom: 60px;
  left: 0;
  width: 100%;
  padding: 0 60px;
  z-index: 20;
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
  transition: all 0.6s ease;
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
  display: flex;
  gap: 20px;
  overflow-x: auto;
  overflow-y: visible;
  padding: 10px;
  scrollbar-width: none; /* 隐藏滚动条 */
}

.carousel-track::-webkit-scrollbar {
  display: none;
}

.carousel-item {
  flex: 0 0 120px; /* 固定宽度 */
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  cursor: pointer;
  opacity: 0.6;
}

.carousel-item:hover {
  opacity: 0.9;
  transform: scale(1.05);
  transform-origin: center bottom;
  /* margin: 0 10px; */
}

.carousel-item.is-active {
  opacity: 1;
  transform: scale(1.05);
  transform-origin: center bottom;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.5);
  outline: 2px solid white;
}

/* --------- 动态效果 --------- */

/* 封面切换效果 */
.bg-fade-enter-active, .bg-fade-leave-active {
  transition: opacity 0.8s ease;
}
.bg-fade-enter-from, .bg-fade-leave-to {
  opacity: 0;
}
/* 标题上浮效果 */
.main-rise-enter-active {
  transition: all 0.6s ease-out;
}
.main-rise-enter-from {
  opacity: 0;
  transform: translateY(30px);
}
</style>
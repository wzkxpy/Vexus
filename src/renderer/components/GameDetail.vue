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

    <!-- 主体内容 -->
    <div class="detail-body">

      <!-- 标题 + 封面 -->
      <div class="top-section">
        <div class="left">
          <h1 class="title">{{ game.originalTitle }}</h1>

          <button class="launch-btn" @click="launchGame(game)">
            ▶ 启动游戏
          </button>
          <button class="edit-btn" @click="openEdit('exePath')">编辑</button>
        </div>

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
      <!-- 游玩数据 -->
      <div class="section">
        <div class="info-grid">
          <div><span class="label">游玩状态：</span>{{ game.record.playStatus }}</div>
          <div><span class="label">总时长：</span>{{ game.record.totalPlaytime }} 小时</div>
        </div>
      </div>
      <div class="divider"></div>

      <!--      Tab      -->
      <div class="tabs">
        <button
          :class="{ active: activeTab === 'overview' }"
          @click="activeTab = 'overview'">概览</button>

        <button
          :class="{ active: activeTab === 'stats' }"
          @click="activeTab = 'stats'">统计</button>

        <button
          :class="{ active: activeTab === 'guide' }"
          @click="activeTab = 'guide'">攻略</button>
      </div>


      <div v-if="activeTab === 'overview'">
        <!-- 游戏简介 -->
        <div class="description">
          <h3>游戏简介</h3>
          <button class="edit-btn" @click="openEdit('description')">编辑</button>
          <p>{{ game.description || '暂无介绍内容。' }}</p>
        </div>

        <!-- 标签 -->
        <div class="section" v-if="game.tags?.length">
          <h3>标签</h3>
          <button class="edit-btn" @click="openEdit('tags')">编辑</button>
          <div class="tags">
            <span v-for="tag in game.tags" :key="tag" class="tag">
              {{ tag }}
            </span>
          </div>
        </div>

        <!-- 基础信息 -->
        <div class="section">
          <h3>基础信息</h3>
          <button class="edit-btn" @click="openEdit('basicInfo')">编辑</button>
          <div class="info-grid">
            <div v-if="game.basicInfo?.developer">
              <span class="label">开发商：</span>{{ game.basicInfo.developer }}
            </div>
            <div v-if="game.basicInfo?.publisher">
              <span class="label">发行商：</span>{{ game.basicInfo.publisher }}
            </div>
            <div v-if="game.basicInfo?.releaseDate">
              <span class="label">发售日期：</span>{{ game.basicInfo.releaseDate }}
            </div>
            <div v-if="game.basicInfo?.estimatedTime">
              <span class="label">游戏时长：</span>{{ game.basicInfo.estimatedTime }}
            </div>
          </div>
        </div>

        <!-- 评分 -->
        <div class="section" v-if="game.externalScore">
          <h3>评分</h3>
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

        <!-- Staff -->
        <div class="section" v-if="game.staff">
          <h3>制作人员</h3>
          <button class="edit-btn" @click="openEdit('staff')">编辑</button>
          <div class="info-grid">
            <div v-if="game.staff.planner"><span class="label">企划：</span>{{ game.staff.planner }}</div>
            <div v-if="game.staff.scenario"><span class="label">剧本：</span>{{ game.staff.scenario }}</div>
            <div v-if="game.staff.artist"><span class="label">原画：</span>{{ game.staff.artist }}</div>
            <div v-if="game.staff.music"><span class="label">音乐：</span>{{ game.staff.music }}</div>
          </div>
        </div>

        <!-- Cast -->
        <div class="section" v-if="game.cast?.length">
          <h3>角色</h3>
          <div class="cast-list">
            <div v-for="c in game.cast" :key="c.character">
              {{ c.character }} - {{ c.voiceActor }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'stats'">
        <GameStats/>
      </div>

    </div>
  </div>

  <EditModal
    v-if="editType"
    :type="editType"
    @close="closeEdit"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Game } from '@/shared/types'
import { useGameStore } from '@/renderer/stores/game.store'
import { useSessionStore } from '@/renderer/stores/session.store'
import EditModal from '@/renderer/components/EditModal.vue'
import GameStats from '@/renderer/components/GameStats.vue'

const activeTab = ref<'overview' | 'stats' | 'guide'>('overview')

const gameStore = useGameStore()
const sessionStore = useSessionStore()
const game = computed(() => gameStore.selectedGame)

const emit = defineEmits<{
  (e: 'back'): void
}>()

// 启动游戏的处理函数
const launchGame = async (game: Game) => {
  console.log('launch game:', game)
  if (!game.exePath) {
    alert('该游戏尚未配置启动程序')
    return
  }
  try {
    await window.launchAPI.launchGame(game.exePath)
  } catch (err: any) {
    alert(err.message || '启动失败')
  }
}
// 删除游戏的处理函数
const handleDelete = async (game: Game) => {
  const ok = confirm(`确定删除游戏「${game.originalTitle}」吗？`)
  if (!ok) return
  await gameStore.deleteGame(game.id)
  emit('back')
}

// 编辑模式
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

/* ===== 主卡片 ===== */
.detail-body {
  /* background: #ffffff; */
  border-radius: 18px;
  /* padding: 40px; */
  /* box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06); */
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
  background: #f3f4f6;
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
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 18px;
  color: #111827;
  letter-spacing: -0.5px;
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

.edit-btn {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  padding: 4px 6px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-btn:hover {
  background: #e5e7eb;
}

/* 封面 */
.right {
  width: 200px;
}

.cover-img {
  width: 100%;
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

/* 通用 section */
.section {
  margin-bottom: 40px;
}

.section h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #111827;
}

/* 描述 */
.description p {
  line-height: 1.8;
  font-size: 15px;
  color: #4b5563;
}

/* 信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
  font-size: 14px;
  color: #374151;
}

.label {
  font-weight: 600;
  color: #6b7280;
  margin-right: 6px;
}

/* 标签 */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag {
  background: #e0f2fe;
  color: #0369a1;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}

/* 评分 */
.score-grid {
  display: flex;
  gap: 30px;
  font-size: 15px;
  color: #1f2937;
}

/* Cast */
.cast-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  color: #374151;
}
</style>

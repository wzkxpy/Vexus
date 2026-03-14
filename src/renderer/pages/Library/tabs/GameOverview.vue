<template>
  <div v-if="game" class="game-overview">
          <!-- 游玩数据 -->
      <div class="section">
        <div class="info-grid">
          <div><span class="label">游玩状态：</span>{{ game.record.playStatus }}</div>
          <div><span class="label">总时长：</span>{{ game.record.totalPlaytime }} 小时</div>
        </div>
      </div>
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

  <EditModal
    v-if="editType"
    :type="editType"
    @close="closeEdit"
  />
</template>

<script setup lang="ts">
import { Game } from '@/shared/types';
import { useGameStore } from '@/renderer/stores/game.store'
import { computed, ref } from 'vue';
import EditModal from '../modals/EditModal.vue'

const gameStore = useGameStore()
const game = computed(() => gameStore.selectedGame)

// 编辑模式
const editType = ref<keyof Game | null>(null)
const openEdit = (type: keyof Game) => {
  editType.value = type
}
const closeEdit = () => {
  editType.value = null
}

</script>
<style scoped>
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
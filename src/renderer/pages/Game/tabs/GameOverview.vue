<template>
  <div v-if="game" class="game-overview">

    <!-- 角色 -->
    <div class="section characters-section" v-if="game.characters?.length">
      <h3>角色</h3>
      <button class="edit-btn" aria-label="调整角色顺序" title="调整角色顺序" @click="uiStore.activeModal = 'character-sort'">✎</button>
      <div class="character-grid">
        <div
          class="character-card"
          v-for="c in game.characters"
          :key="c.name"
        >
          <img
            :src="c.avatarPath || defaultCharacterAvatar"
            :alt="c.name"
            class="character-avatar"
            @error="handleAvatarError"
          />

          <div class="character-info">
            <div class="character-name">{{ c.name }}</div>
            <div class="character-va">{{ c.voiceActor }}</div>
          </div>

        </div>
      </div>
    </div>
    
    <!-- 基础信息 -->
    <div class="section basic-section">
      <h3>基础信息</h3>
      <button class="edit-btn" aria-label="编辑基础信息" title="编辑" @click="openEdit('basicInfo')">✎</button>
      <div class="info-grid">
        <div v-if="game.basicInfo?.developer">
          <span class="label">开发：</span>{{ game.basicInfo.developer }}
        </div>
        <div v-if="game.basicInfo?.publisher">
          <span class="label">发行：</span>{{ game.basicInfo.publisher }}
        </div>
        <div v-if="game.basicInfo?.releaseDate">
          <span class="label">发售日：</span>{{ game.basicInfo.releaseDate }}
        </div>
        <div v-if="game.basicInfo?.estimatedTime">
          <span class="label">游戏时长：</span>{{ game.basicInfo.estimatedTime }}
        </div>
      </div>
    </div>

    <!-- Staff -->
    <div class="section staff-section" v-if="game.staff">
      <h3>制作人员</h3>
      <button class="edit-btn" aria-label="编辑制作人员" title="编辑" @click="openEdit('staff')">✎</button>
      <div class="info-grid">
        <div v-if="game.staff.planner"><span class="label">企划：</span>{{ game.staff.planner }}</div>
        <div v-if="game.staff.scenario"><span class="label">剧本：</span>{{ game.staff.scenario }}</div>
        <div v-if="game.staff.artist"><span class="label">原画：</span>{{ game.staff.artist }}</div>
        <div v-if="game.staff.music"><span class="label">音乐：</span>{{ game.staff.music }}</div>
      </div>
    </div>

    <!-- 标签 -->
    <div class="section tags-section" v-if="game.tags?.length">
      <h3>Tag</h3>
      <button class="edit-btn" aria-label="编辑标签" title="编辑" @click="openEdit('tags')">✎</button>
      <div class="tags">
        <span v-for="tag in game.tags" :key="tag" class="tag">
          {{ tag }}
        </span>
      </div>
    </div>

    <!-- 游戏简介 -->
    <div class="section description">
      <button class="edit-btn" aria-label="编辑游戏简介" title="编辑" @click="openEdit('description')">✎</button>
      <p>{{ game.description || '暂无介绍内容。' }}</p>
    </div>
    
  </div>

  <EditModal
    v-if="uiStore.activeModal?.startsWith('edit-')"
    :type="uiStore.activeModal.replace('edit-', '') as keyof Game"
    @close="uiStore.activeModal = null"
  />

  <CharacterSortModal
    v-if="uiStore.activeModal === 'character-sort' && game?.characters"
    :game-id="game.id"
    :characters="game.characters"
    @close="uiStore.activeModal = null"
  />
</template>

<script setup lang="ts">
import type { Game } from '@/shared/types';
import { useGameStore } from '@/renderer/stores/game.store'
import { computed } from 'vue';
import EditModal from '../EditModal.vue'
import CharacterSortModal from '../CharacterSortModal.vue'
import { useRoute } from 'vue-router'
import { useUIStore } from '@/renderer/stores/ui.store';
import defaultCharacterAvatar from '@/renderer/assets/images/akarin.webp'

const route = useRoute()
const gameStore = useGameStore()
const game = computed(() => {
  const id = route.params.id as string
  return gameStore.getGameById(id)
})
const uiStore = useUIStore()

// 路径为空或本地头像文件丢失时，统一回退到应用内置头像。
const handleAvatarError = (event: Event) => {
  const image = event.currentTarget as HTMLImageElement
  if (image.dataset.fallbackApplied) return

  image.dataset.fallbackApplied = 'true'
  image.src = defaultCharacterAvatar
}

// 编辑模式
const openEdit = (type: keyof Game) => {
  uiStore.activeModal = 'edit-' + type
}
</script>

<style scoped>
/* ===== 概览网格 ===== */
.game-overview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding-bottom: 24px;
  gap: 16px;
}

.section {
  position: relative;
  min-width: 0;
  padding: 20px;
  border: 1px solid #e5e9f0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 7px 25px rgba(50, 61, 86, 0.04);
}

.characters-section,
.tags-section,
.description {
  grid-column: 1 / -1;
}

.section h3 {
  margin: 0 0 17px;
  color: #444e60;
  font-size: 15px;
  font-weight: 600;
}

/* 基础信息与制作人员卡片内部保持单列。 */
.basic-section .info-grid,
.staff-section .info-grid {
  grid-template-columns: 1fr;
}

/* ===== 编辑按钮 ===== */
.edit-btn {
  position: absolute;
  top: 16px;
  right: 17px;
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  color: #8490a2;
  background: #f2f3f6;
  font-size: 14px;
  cursor: pointer;
  transition: 0.2s ease;
}

.edit-btn:hover {
  color: #4f72c4;
  background: #e9effb;
}

/* ===== 角色 ===== */
.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px 20px;
}

.character-card {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 12px;
}

.character-avatar {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 10px;
  object-fit: cover;
}

.character-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.character-name {
  overflow: hidden;
  color: #40495a;
  font-size: 14px;
  font-weight: 550;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.character-va {
  overflow: hidden;
  margin-top: 3px;
  color: #929baa;
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 基础信息与制作人员 ===== */
.info-grid {
  display: grid;
  gap: 13px 20px;
  color: #485264;
  font-size: 15px;
}

.label {
  margin-right: 6px;
  color: #949cab;
  font-weight: 400;
}

/* ===== Tag ===== */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.tag {
  padding: 5px 10px;
  border-radius: 999px;
  color: #5975b6;
  background: #edf2fb;
  font-size: 13px;
  font-weight: 450;
}

/* ===== 游戏简介 ===== */
.description p {
  margin: 0;
  color: #626d7e;
  font-size: 15px;
  line-height: 1.85;
  white-space: pre-wrap;
}

/* ===== 窄窗口适配 ===== */
@media (max-width: 760px) {
  .game-overview {
    grid-template-columns: 1fr;
  }

  .characters-section,
  .tags-section,
  .description {
    grid-column: auto;
  }
}
</style>

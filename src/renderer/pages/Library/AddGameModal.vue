<template>
  <div class="overlay">
    <div class="modal">
      <!-- Header -->
      <header class="header">
        <div class="title">
          <h2>添加游戏</h2>
        </div>
        <CloseButton @click="close" />
      </header>

      <!-- Source Tabs -->
      <div class="sources">
        <button
          v-for="s in sources"
          :key="s.key"
          :class="['source', { active: source === s.key }]"
          @click="source = s.key"
        >
          {{ s.label }}
        </button>
      </div>

      <!-- Content -->
      <section class="content">
        <div class="search-box">
          <input
            v-model="query"
            type="text"
            :placeholder="placeholder"
            @keyup.enter="handleSearch"
          />

          <button
            class="search-btn"
            :disabled="!query.trim() || loading"
            @click="handleSearch"
          >
            {{ loading ? '加载中...' : '搜索' }}
          </button>
        </div>

        <!-- Result -->

        <div class="result-placeholder">
          <!-- loading -->
          <template v-if="loading">
            <div class="empty-state">正在获取数据...</div>
          </template>

          <template v-else-if="error">
            <div class="empty-state error">{{ error }}</div>
          </template>

          <!-- 名称搜索结果列表 -->
          <template v-else-if="results.length">
            <div class="list">
              <div
                v-for="item in results"
                :key="item.sourceId"
                class="list-item"
              >
                <img
                  v-if="item.coverUrl"
                  :src="item.coverUrl"
                  class="cover small"
                />
                <div class="list-info">
                  <div class="name" v-if="item.localizedTitle">
                    {{ item.localizedTitle }}
                  </div>
                  <div v-else class="name">
                    {{ item.originalTitle }}
                  </div>

                  <div class="meta" v-if="item.developer">
                     {{ item.developer }}
                  </div>

                  <div class="meta" v-if="item.releaseDate">
                      {{ item.releaseDate }}
                  </div>
                </div>

                <button
                  class="add-btn"
                  :disabled="savingId === item.sourceId"
                  @click="handleAddGame(item)"
                >
                  {{
                    addedIds.has(item.sourceId)
                      ? '已添加'
                      : savingId === item.sourceId
                      ? '添加中...'
                      : '添加'
                  }}
                </button>
              </div>
            </div>
          </template>

          <!-- ID 搜索单卡片 -->
          <template v-else-if="result">
            <div class="result-card">
              <img
                v-if="result.coverUrl"
                :src="result.coverUrl"
                class="cover"
              />

              <div class="result-message">
                <div class="name">{{ result.originalTitle }}</div>

                <div class="meta" v-if="result.localizedTitle">
                  {{ result.localizedTitle }}
                </div>

                <div class="meta" v-if="result.developer">
                    {{ result.developer }}
                </div>

                <div class="meta" v-if="result.releaseDate">
                    {{ result.releaseDate }}
                </div>
              </div>

              <button
                class="add-btn"
                :disabled="savingId === result.sourceId"
                @click="handleAddGame(result)"
              >
                {{
                  addedIds.has(result.sourceId)
                    ? '已添加'
                    : savingId === result.sourceId
                    ? '添加中...'
                    : '添加'
                }}
              </button>
            </div>
          </template>

          <!-- empty -->
          <template v-else>
            <div class="empty-state">搜索结果将在此显示</div>
          </template>
        </div>

      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import CloseButton from '@/renderer/components/CloseButton.vue'
import { computed, ref } from 'vue'
import { useGameStore } from '@/renderer/stores/game.store'
import { GameCandidate } from '@/shared/types'

const gameStore = useGameStore()

const emit = defineEmits<{ (e: 'close'): void }>()

type Source = 'bangumi' | 'vndb' | 'steam' | 'ymgal'
const sources = [
  { key: 'bangumi', label: 'Bangumi' },
  { key: 'vndb', label: 'VNDB' },
  { key: 'steam', label: 'Steam' },
  { key: 'ymgal', label: 'YmGal' }
] as const

const source = ref<Source>('bangumi') // 数据源 默认选中 Bangumi
const query = ref('') // 搜索输入框绑定的文本

const loading = ref(false) // 是否正在加载数据
const error = ref<string | null>(null) // 错误信息

const result = ref<GameCandidate | null>(null) // ID 搜索的结果（单个游戏）
const results = ref<GameCandidate[]>([]) // 名称搜索的结果（可能有多个游戏）

const savingId = ref<string | null>(null) // 正在添加的游戏的 sourceId，用于禁用对应的添加按钮
const addedIds = ref(new Set<string>()) //  已经添加的游戏的 sourceId 集合，用于显示已添加状态

const placeholder = computed(() => {
  switch (source.value) {
    case 'bangumi':
      return '输入游戏名或 Subject ID'
    case 'vndb':
      return '输入游戏名或 VNDB ID'
    case 'steam':
      return '输入游戏名或 Steam AppID'
    case 'ymgal':
      return '输入游戏名或 YMgal ID'
  }
})

// 点击或回车搜索
async function handleSearch() {
  const q = query.value.trim()
  if (!q) return
  if (source.value !== 'bangumi') return // 目前仅支持 Bangumi 搜索

  loading.value = true
  error.value = null
  result.value = null
  results.value = []

  try {
    if (/^\d+$/.test(q)) {  // ID 查询
      result.value = await window.providerAPI.fetchGame(source.value, q)
    } else {  // 名称搜索
      results.value = await window.providerAPI.searchGames(source.value, q)
    }
  } catch (e: any) {
    error.value = e.message || '获取失败'
  } finally {
    loading.value = false
  }
}

// 点击添加游戏
async function handleAddGame(item: GameCandidate) {
  if (addedIds.value.has(item.sourceId)) return // 已添加的游戏不再处理

  try {
    savingId.value = item.sourceId
    const newGame =
      await window.providerAPI.buildGameFromBangumi(
        JSON.parse(JSON.stringify(item.raw))
      )
    await gameStore.addGame(
      JSON.parse(JSON.stringify(newGame))
    )
    addedIds.value.add(item.sourceId)
  } catch (e: any) {
    alert(e.message || '添加失败')
  } finally {
    savingId.value = null
  }
}

function close() {
  emit('close')
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.25);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  width: 560px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,.15);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 18px;
  border-bottom: 1px solid #e5e7eb;
}

.title h2 {
  font-size: 16px;
}

.close {
  background: none;
  border: none;
  cursor: pointer;
}

.sources {
  display: flex;
  gap: 6px;
  padding: 10px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.source {
  padding: 6px 12px;
  border-radius: 999px;
  border: none;
  background: #f3f4f6;
  cursor: pointer;
}

.source.active {
  background: #71a2f6;
  color: white;
}

.content {
  padding: 16px;
}

.search-box {
  display: flex;
  gap: 8px;
}

.search-box input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.search-btn,
.add-btn {
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  background: #5a94f9;
  color: white;
  cursor: pointer;
}

.search-btn:disabled,
.add-btn:disabled {
  opacity: .45;
  cursor: not-allowed;
}

.result-placeholder {
  min-height: 120px;
  margin-top: 14px;
  max-height: 380px;
  border: 1px dashed #c1c2c6;
  border-radius: 8px;
  overflow-y: auto;
  padding: 14px;
  background-color: #f8f8f8;
}
.result-placeholder::-webkit-scrollbar {
  width: 4px;
}
.result-placeholder::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 6px;
}

.empty-state {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  color: #9ca3af;
}
.empty-state.error {
  color: #ef4444;
}
/* 单卡片 */
.result-card {
  display: flex;
  align-items: center;
  gap: 20px;
}

.cover {
  width: 110px;
  border-radius: 6px;
}
.cover.small {
  width: 60px;
  border-radius: 4px;
}

.result-message {
  flex: 1;
}

/* 列表 */
.list {
  display: flex;
  flex-direction: column;

}

.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 12px;
  border-bottom: 1px solid #e0e0e0;
}

.list-info {
  flex: 1;
  min-width: 0;
}

.name {
  font-weight: 600;
  color: #111827;
}

.meta {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: #9ca3af;
  margin-top: 6px;
}
</style>

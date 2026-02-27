<template>
  <div class="overlay" @click.self="close">
    <div class="modal">
      <!-- Header -->
      <header class="header">
        <div class="title">
          <span class="icon">➕</span>
          <h2>添加游戏</h2>
        </div>
        <button class="close" @click="close">✕</button>
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
          />
          <button
            class="search-btn"
            :disabled="!query.trim() || loading"
            @click="handleSearch"
          >
            {{ loading ? '加载中...' : '搜索' }}
          </button>
        </div>

        <!-- Result Placeholder -->
        <div class="result-placeholder">
          <template v-if="loading">
            <span>正在获取数据...</span>
          </template>

          <template v-else-if="error">
            <span style="color: #ef4444">{{ error }}</span>
          </template>

          <template v-else-if="result">
            <div class="result-card">
              <img
                v-if="result.media?.coverPath"
                :src="result.media.coverPath"
                class="cover"
              />

              <h3>{{ result.originalTitle }}</h3>

              <p v-if="result.localizedTitle">
                {{ result.localizedTitle }}
              </p>

              <p v-if="result.basicInfo?.releaseDate">
                发售日：{{ result.basicInfo.releaseDate }}
              </p>

              <p v-if="result.basicInfo?.developer">
                开发：{{ result.basicInfo.developer }}
              </p>

              <p v-if="result.basicInfo?.externalScore">
                评分：{{ result.basicInfo.externalScore.bgm ?? 'N/A' }}
              </p>
              <!-- ✅ 新增按钮区域 -->
              <div class="action">
                <button
                  class="add-btn"
                  :disabled="saving"
                  @click="handleAddGame"
                >
                  {{ added ? '已添加' : saving ? '添加中...' : '确认添加游戏' }}
                </button>
              </div>
            </div>
          </template>

          <template v-else>
            <span>搜索结果将在此显示</span>
          </template>
        </div>

      </section>

      <!-- Footer -->
      <footer class="footer">
        <button class="cancel" @click="close">取消</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '@/renderer/stores/game.store'

const gameStore = useGameStore()

const emit = defineEmits<{
  (e: 'close'): void
}>()

type Source = 'bgm' | 'vndb' | 'steam' | 'ymgal'

const sources: { key: Source; label: string }[] = [
  { key: 'bgm', label: 'Bangumi' },
  { key: 'vndb', label: 'VNDB' },
  { key: 'steam', label: 'Steam' },
  { key: 'ymgal', label: 'YmGal' },
]

const source = ref<Source>('bgm')
const query = ref('')

// 新增状态
const loading = ref(false)
const error = ref<string | null>(null)
const result = ref<any | null>(null)

const placeholder = computed(() => {
  switch (source.value) {
    case 'bgm':
      return '输入 Bangumi 条目 ID'
    case 'vndb':
      return '输入游戏名或 vndb ID'
    case 'steam':
      return '输入游戏名或 Steam AppID'
    case 'ymgal':
      return '输入游戏名或 YMgal ID'
  }
})

async function handleSearch() {
  if (!query.value.trim()) return
  if (source.value !== 'bgm') return
  
  loading.value = true  
  error.value = null
  result.value = null

  try {
    const data = await window.scraperAPI.fetchGameFromBangumi(
      query.value.trim()
    )
    result.value = data
  } catch (e: any) {
    error.value = e.message || '获取失败'
  } finally {
    loading.value = false
    console.log(JSON.stringify(result.value, null, 2));
  }
}
// 确认保存到数据库
const saving = ref(false)
const added = ref(false)

async function handleAddGame() {
  if (!result.value) return
  if (added.value) return
  try {
    saving.value = true
    // console.log(result.value)
    console.log(JSON.parse(JSON.stringify(result.value)))
    await gameStore.addGame(JSON.parse(JSON.stringify(result.value)))
    alert('添加成功')
    added.value = true
  } catch (e: any) {
    alert(e.message || '添加失败')
  } finally {
    saving.value = false
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
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  width: 520px;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid #e5e7eb;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title h2 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.icon {
  font-size: 18px;
}

.close {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
}

/* Source Tabs */
.sources {
  display: flex;
  gap: 6px;
  padding: 10px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.source {
  padding: 6px 12px;
  border-radius: 999px;
  background: #f3f4f6;
  border: none;
  color: #4b5563;
  cursor: pointer;
  font-size: 12px;
}

.source.active {
  background: #4c8bf5;
  color: #ffffff;
}

/* Content */
.content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.search-box {
  display: flex;
  gap: 8px;
}

.search-box input {
  flex: 1;
  background: #ffffff;
  border: 1px solid #d1d5db;
  color: #111827;
  padding: 8px 10px;
  border-radius: 6px;
}

.search-box input::placeholder {
  color: #9ca3af;
}

.search-btn {
  padding: 8px 14px;
  border-radius: 6px;
  border: none;
  background: #4c8bf5;
  color: white;
  cursor: pointer;
}

.search-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Result Placeholder */
.result-placeholder {
  margin-top: 4px;
  padding: 24px;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  font-size: 13px;
  color: #6b7280;
  text-align: center;
}

/* Footer */
.footer {
  padding: 12px 16px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #e5e7eb;
}

.cancel {
  background: #ffffff;
  border: 1px solid #d1d5db;
  color: #374151;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
}

.cancel:hover {
  background: #f9fafb;
}
.result-card {
  text-align: left;
}

.cover {
  width: 120px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.result-card {
  text-align: center;
}

.action {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.add-btn {
  padding: 8px 20px;
  font-size: 14px;
  cursor: pointer;
}
</style>

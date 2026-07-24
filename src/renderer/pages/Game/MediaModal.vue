<template>
  <transition name="fade">
    <div class="media-modal-mask" @click.self="close">
      <div class="media-modal">
        <!-- Header -->
        <div class="modal-header">
          <div>
            <h3>媒体资源设置</h3>
          </div>
          <CloseButton @click="close" />
        </div>

        <!-- Body -->
        <div class="modal-body">
          <!-- Cover -->
          <section class="media-section">
            <div class="section-top">
              <h3>封面图</h3>
            </div>

            <div class="preview-card cover-card">
              <img
                v-if="mediaData.coverPath"
                :src="mediaData.coverPath"
                class="preview-image"
              />
              <div v-else class="empty-state">
                暂无封面图
              </div>
            </div>

            <div class="action-row">
              <input
                ref="coverInputRef"
                type="file"
                accept="image/*"
                hidden
                @change="onSelectFile($event, 'cover')"
              />

              <button class="btn primary" @click="pickFile('cover')">
                上传图片
              </button>

              <button
                class="btn ghost"
                :disabled="!mediaData.coverPath"
                @click="removeImage('cover')"
              >
                移除
              </button>
            </div>

          </section>

          <!-- Banner -->
          <section class="media-section">
            <div class="section-top">
              <h3>背景图</h3>
            </div>

            <div class="preview-card banner-card">
              <img
                v-if="mediaData.bannerPath"
                :src="mediaData.bannerPath"
                class="preview-image"
              />
              <div v-else class="empty-state">
                暂无背景图
              </div>
            </div>

            <div class="action-row">
              <input
                ref="bannerInputRef"
                type="file"
                accept="image/*"
                hidden
                @change="onSelectFile($event, 'banner')"
              />

              <button class="btn primary" @click="pickFile('banner')">
                上传图片
              </button>

              <button
                class="btn ghost"
                :disabled="!mediaData.bannerPath"
                @click="removeImage('banner')"
              >
                移除
              </button>

            </div>

          </section>
        </div>

      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import CloseButton from '@/renderer/components/CloseButton.vue'
import { ref, computed, reactive, onMounted } from 'vue'
import { useGameStore } from '@/renderer/stores/game.store'
import { useGameActions } from '@/renderer/composables/useGameActions'
import { useRoute } from 'vue-router'

const route = useRoute()
const gameStore = useGameStore()
const gameActions = useGameActions()
const game = computed(() => {
  const id = route.params.id as string
  return gameStore.getGameById(id)
})
const emit = defineEmits(['close'])
const mediaData = reactive({
  coverPath: '',
  bannerPath: ''
})

const coverInputRef = ref<HTMLInputElement | null>(null)
const bannerInputRef = ref<HTMLInputElement | null>(null)

function close() {
  emit('close')
}

function pickFile(type: 'cover' | 'banner') {
  if (type === 'cover') coverInputRef.value?.click()
  else bannerInputRef.value?.click()
}

async function onSelectFile(
  e: Event,
  type: 'cover' | 'banner'
) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const url = URL.createObjectURL(file) // 临时URL,仅用于预览
  if (type === 'cover') {
    mediaData.coverPath = url
  } else {
    mediaData.bannerPath = url
  }
  const sourcePath = await window.fileAPI.getFilePath(file)

  gameActions.updateMedia(game.value!, type, sourcePath)
}

// 点击移除媒体资源
function removeImage(type: 'cover' | 'banner') {
  if (type === 'cover') {
    mediaData.coverPath = ''
  } else {
    mediaData.bannerPath = ''
  }
  gameActions.removeMedia(game.value!, type)
}

// 启动时预览当前游戏的媒体资源
onMounted(() => {
  mediaData.bannerPath = game.value?.media?.bannerPath || ''
  mediaData.coverPath = game.value?.media?.coverPath || ''
})
</script>

<style scoped>
.media-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.28);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.media-modal {
  width: 760px;
  max-width: 92vw;
  max-height: 92vh;
  overflow: auto;
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 18px 50px rgba(0,0,0,.14);
}

.modal-header {
  padding: 20px 28px 16px;
  border-bottom: 1px solid #eef1f4;
  display: flex;
  justify-content: space-between;
  align-items: start;
}
.modal-header h3 {
  margin: 0;
  color: #111827;
}
.modal-header p {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.modal-body {
  padding: 24px 28px;
  display: flex;
  justify-content: center;
  gap: 18px;
}

.media-section {
  background: #fafafa;
  border: 1px solid #eef1f4;
  border-radius: 16px;
  padding: 18px;
}

.section-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.section-top h3 {
  margin: 0;
  font-size: 16px;
  color: #111827;
}

.hint {
  font-size: 12px;
  color: #94a3b8;
}

.preview-card {
  border-radius: 14px;
  overflow: hidden;
  background: #f3f4f6;
  border: 1px dashed #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-card {
  width: 180px;
  height: 250px;
}

.banner-card {
  width: 420px;
  height: 250px;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.empty-state {
  color: #9ca3af;
  font-size: 14px;
}

.action-row {
  margin-top: 14px;
  display: flex;
  gap: 12px;
}

.text-input {
  margin-top: 14px;
  width: 100%;
  height: 42px;
  border-radius: 12px;
  border: 1px solid #dbe1e8;
  padding: 0 14px;
  font-size: 14px;
  outline: none;
}

.text-input:focus {
  border-color: #60a5fa;
}

.modal-footer {
  padding: 20px 28px;
  border-top: 1px solid #eef1f4;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  height: 42px;
  padding: 0 18px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
}

.btn.primary {
  background: #eff6ff;
  color: #2563eb;
}

.btn.primary:hover {
  background: #dbeafe;
}

.btn.ghost {
  background: #f3f4f6;
  color: #374151;
}

.btn.success {
  background: #2563eb;
  color: white;
}

.btn.success:hover {
  background: #1d4ed8;
}

.btn:disabled {
  opacity: .45;
  cursor: not-allowed;
}

.fade-enter-active,
.fade-leave-active {
  transition: .2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(.98);
}
</style>

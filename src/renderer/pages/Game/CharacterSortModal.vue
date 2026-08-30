<template>
  <div class="overlay" @mousedown.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="character-sort-title">
      <div class="modal-header">
        <div>
          <h3 id="character-sort-title">调整角色顺序</h3>
          <p>拖动角色，或使用右侧按钮调整位置。</p>
        </div>
        <button class="close-btn" aria-label="关闭" @click="emit('close')">×</button>
      </div>

      <div class="character-list">
        <div
          v-for="(character, index) in draftCharacters"
          :key="characterKey(character, index)"
          class="character-item"
          :class="{ dragging: draggedIndex === index, 'drag-over': dragOverIndex === index }"
          draggable="true"
          @dragstart="handleDragStart(index, $event)"
          @dragover.prevent="dragOverIndex = index"
          @drop.prevent="handleDrop(index)"
          @dragend="resetDrag"
        >
          <span class="drag-handle" title="拖动排序" aria-hidden="true">⋮⋮</span>
          <img
            :src="character.avatarPath || defaultCharacterAvatar"
            :alt="character.name"
            class="avatar"
            draggable="false"
            @error="handleAvatarError"
          />
          <div class="character-info">
            <div class="character-name">{{ character.name }}</div>
            <div class="voice-actor">{{ character.voiceActor }}</div>
          </div>
          <div class="move-actions">
            <button title="置顶" :disabled="index === 0" @click="moveCharacter(index, 0)">⇈</button>
            <button title="上移" :disabled="index === 0" @click="moveCharacter(index, index - 1)">↑</button>
            <button title="下移" :disabled="index === draftCharacters.length - 1" @click="moveCharacter(index, index + 1)">↓</button>
            <button title="置底" :disabled="index === draftCharacters.length - 1" @click="moveCharacter(index, draftCharacters.length - 1)">⇊</button>
          </div>
        </div>
      </div>

      <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

      <div class="modal-actions">
        <button class="cancel-btn" :disabled="saving" @click="emit('close')">取消</button>
        <button class="save-btn" :disabled="saving || !changed" @click="saveOrder">
          {{ saving ? '保存中…' : '保存顺序' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Character } from '@/shared/types'
import { useGameStore } from '@/renderer/stores/game.store'
import defaultCharacterAvatar from '@/renderer/assets/images/akarin.webp'

const props = defineProps<{
  gameId: string
  characters: Character[]
}>()
const emit = defineEmits<{ close: [] }>()
const gameStore = useGameStore()

const initialCharacters = props.characters.map(character => ({ ...character }))
const draftCharacters = ref(initialCharacters.map(character => ({ ...character })))
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const saving = ref(false)
const errorMessage = ref('')

const changed = computed(() =>
  draftCharacters.value.some((character, index) => character !== initialCharacters[index] && (
    character.name !== initialCharacters[index]?.name ||
    character.voiceActor !== initialCharacters[index]?.voiceActor ||
    character.avatarPath !== initialCharacters[index]?.avatarPath
  ))
)

const characterKey = (character: Character, index: number) =>
  `${character.avatarPath ?? ''}-${character.name}-${character.voiceActor}-${index}`

const moveCharacter = (from: number, to: number) => {
  if (from === to || to < 0 || to >= draftCharacters.value.length) return
  const [character] = draftCharacters.value.splice(from, 1)
  draftCharacters.value.splice(to, 0, character)
  errorMessage.value = ''
}

const handleDragStart = (index: number, event: DragEvent) => {
  draggedIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

const handleDrop = (index: number) => {
  if (draggedIndex.value !== null) moveCharacter(draggedIndex.value, index)
  resetDrag()
}

const resetDrag = () => {
  draggedIndex.value = null
  dragOverIndex.value = null
}

const handleAvatarError = (event: Event) => {
  const image = event.currentTarget as HTMLImageElement
  if (image.dataset.fallbackApplied) return
  image.dataset.fallbackApplied = 'true'
  image.src = defaultCharacterAvatar
}

const saveOrder = async () => {
  saving.value = true
  errorMessage.value = ''
  try {
    await gameStore.updateGame(props.gameId, {
      characters: draftCharacters.value.map(character => ({ ...character }))
    })
    emit('close')
  } catch (error) {
    console.error('Failed to save character order:', error)
    errorMessage.value = '保存失败，数据库中的原有顺序未改变，请重试。'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(27, 34, 48, 0.58);
}

.modal {
  display: flex;
  flex-direction: column;
  width: min(680px, 100%);
  max-height: min(760px, calc(100vh - 48px));
  padding: 22px;
  border: 1px solid #e1e5ed;
  border-radius: 15px;
  color: #354052;
  background: #fff;
  box-shadow: 0 24px 70px rgba(27, 37, 57, 0.25);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.modal-header h3 { margin: 0; font-size: 18px; }
.modal-header p { margin: 7px 0 0; color: #8a94a5; font-size: 13px; }

.close-btn {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 7px;
  color: #7b8698;
  background: #f2f4f7;
  font-size: 21px;
  cursor: pointer;
}

.character-list {
  overflow-y: auto;
  margin: 20px -4px 0 0;
  padding-right: 8px;
}

.character-item {
  display: flex;
  align-items: center;
  min-height: 58px;
  margin-bottom: 8px;
  padding: 8px 10px;
  gap: 11px;
  border: 1px solid #e7eaf0;
  border-radius: 10px;
  background: #fafbfc;
  transition: border-color 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
}

.character-item.dragging { opacity: 0.42; }
.character-item.drag-over { border-color: #7697e4; transform: translateY(2px); }
.drag-handle { color: #a5adba; cursor: grab; font-size: 17px; letter-spacing: -5px; }

.avatar {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
}

.character-info { flex: 1; min-width: 0; }
.character-name { overflow: hidden; font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.voice-actor { overflow: hidden; margin-top: 3px; color: #929baa; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }

.move-actions { display: flex; gap: 4px; }
.move-actions button {
  width: 29px;
  height: 29px;
  padding: 0;
  border: 1px solid #dfe4ed;
  border-radius: 6px;
  color: #60708a;
  background: #fff;
  cursor: pointer;
}
.move-actions button:hover:not(:disabled) { color: #456bc3; border-color: #bdcbed; background: #f2f6fd; }
.move-actions button:disabled { opacity: 0.35; cursor: default; }

.error-message { margin: 10px 0 0; color: #c84d5a; font-size: 13px; }
.modal-actions { display: flex; justify-content: flex-end; margin-top: 18px; gap: 9px; }
.modal-actions button { min-width: 82px; padding: 8px 15px; border-radius: 8px; font-size: 13px; cursor: pointer; }
.cancel-btn { color: #687386; border: 1px solid #dfe3ea; background: #fff; }
.save-btn { color: #fff; border: 1px solid #557bd3; background: #5d82d8; }
.modal-actions button:disabled { opacity: 0.5; cursor: default; }

@media (max-width: 560px) {
  .overlay { padding: 12px; }
  .modal { max-height: calc(100vh - 24px); padding: 16px; }
  .move-actions button:first-child,
  .move-actions button:last-child { display: none; }
}
</style>

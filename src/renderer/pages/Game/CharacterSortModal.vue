<template>
  <Teleport to="body">
  <div class="overlay" @mousedown.self="close">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="character-sort-title">
      <div class="modal-header">
        <div>
          <h3 id="character-sort-title">编辑角色</h3>
          <p>拖动角色，或使用右侧按钮调整位置。</p>
        </div>
        <button class="close-btn" aria-label="关闭" :disabled="busy" @click="close">
          <X :size="16" />
        </button>
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
          <span class="drag-handle" title="拖动排序" aria-hidden="true"><GripVertical :size="16" /></span>
          <img
            :src="character.avatarPath || character.avatarUrl || defaultCharacterAvatar"
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
            <button title="置顶" aria-label="置顶" :disabled="index === 0" @click="moveCharacter(index, 0)"><ChevronsUp :size="14" /></button>
            <button title="上移" aria-label="上移" :disabled="index === 0" @click="moveCharacter(index, index - 1)"><ArrowUp :size="14" /></button>
            <button title="下移" aria-label="下移" :disabled="index === draftCharacters.length - 1" @click="moveCharacter(index, index + 1)"><ArrowDown :size="14" /></button>
            <button title="置底" aria-label="置底" :disabled="index === draftCharacters.length - 1" @click="moveCharacter(index, draftCharacters.length - 1)"><ChevronsDown :size="14" /></button>
          </div>
        </div>
      </div>

      <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

      <div class="modal-actions">
        <div v-if="canUpdate" class="update-group">
          <div class="source-switch" role="group" aria-label="更新数据源">
            <button
              v-for="provider in availableSources"
              :key="provider"
              :class="{ active: updateSource === provider }"
              :disabled="busy"
              @click="updateSource = provider"
            >
              {{ provider === 'bangumi' ? 'Bangumi' : 'VNDB' }}
            </button>
          </div>
          <button class="update-btn" :disabled="busy" @click="updateFromProvider">
            {{ updating ? '正在获取…' : '更新' }}
          </button>
        </div>
        <div class="action-buttons">
          <button class="cancel-btn" :disabled="busy" @click="close">取消</button>
          <button class="save-btn" :disabled="busy || !changed" @click="saveCharacters">
            {{ saving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowDown, ArrowUp, ChevronsDown, ChevronsUp, GripVertical, X } from '@lucide/vue'
import type { CharacterDraft, ProviderSource } from '@/shared/types'
import { useGameStore } from '@/renderer/stores/game.store'
import defaultCharacterAvatar from '@/renderer/assets/images/akarin.webp'

const props = defineProps<{
  gameId: string
  characters: CharacterDraft[]
}>()
const emit = defineEmits<{ close: [] }>()
const gameStore = useGameStore()
const game = computed(() => gameStore.getGameById(props.gameId))

const initialCharacters = props.characters.map(character => ({ ...character }))
const draftCharacters = ref(initialCharacters.map(character => ({ ...character })))
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const updating = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const busy = computed(() => updating.value || saving.value)
const availableSources = computed<ProviderSource[]>(() => {
  const current = game.value
  if (!current) return []
  const sources: ProviderSource[] = []
  if (current.externalIds.bgmId) sources.push('bangumi')
  if (current.externalIds.vndbId) sources.push('vndb')
  return sources
})
const updateSource = ref<ProviderSource>(game.value?.externalIds.bgmId ? 'bangumi' : 'vndb')
const canUpdate = computed(() => availableSources.value.length > 0)

const characterSnapshot = (characters: CharacterDraft[]) =>
  JSON.stringify(characters.map(character => ({
    name: character.name,
    voiceActor: character.voiceActor,
    avatarPath: character.avatarPath ?? null,
    avatarUrl: character.avatarUrl ?? null
  })))
const changed = computed(() =>
  characterSnapshot(draftCharacters.value) !== characterSnapshot(initialCharacters)
)

const characterKey = (character: CharacterDraft, index: number) =>
  `${character.avatarPath ?? ''}-${character.avatarUrl ?? ''}-${character.name}-${character.voiceActor}-${index}`

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

function close() {
  if (!busy.value) emit('close')
}

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return '获取失败，请重试。'
  return error.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')
}

async function updateFromProvider() {
  if (busy.value || !canUpdate.value) return
  updating.value = true
  errorMessage.value = ''
  try {
    const result = await window.providerAPI.fetchGameSection(
      props.gameId,
      'characters',
      updateSource.value
    )
    if (result.section !== 'characters') throw new Error('信息源返回了错误的角色数据')
    draftCharacters.value = result.value.map(character => ({ ...character }))
    resetDrag()
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    updating.value = false
  }
}

const saveCharacters = async () => {
  if (busy.value || !changed.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    await gameStore.updateCharacters(props.gameId, draftCharacters.value.map(character => ({ ...character })))
    emit('close')
  } catch (error) {
    console.error('Failed to save characters:', error)
    errorMessage.value = '保存失败，原有角色未改变，请重试。'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
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
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 7px;
  color: #7b8698;
  background: #f2f4f7;
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
.drag-handle { display: flex; align-items: center; color: #a5adba; cursor: grab; }

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
  display: flex;
  align-items: center;
  justify-content: center;
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
.modal-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; margin-top: 18px; gap: 9px; }
.update-group { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.action-buttons { display: flex; gap: 9px; margin-left: auto; }
.modal-actions button { min-width: 82px; padding: 8px 15px; border-radius: 8px; font-size: 13px; cursor: pointer; }
.source-switch { display: inline-flex; padding: 2px; border-radius: 8px; background: #eef1f6; }
.source-switch button { min-width: 0; padding: 5px 9px; border: 0; border-radius: 6px; color: #6b7688; background: transparent; font-size: 12px; }
.source-switch button.active { color: #456bc3; background: #ffffff; box-shadow: 0 1px 3px rgba(61, 88, 146, 0.14); }
.source-switch button:disabled { opacity: 0.5; cursor: default; }
.update-btn { color: #4f72c4; border: 1px solid #d7e1f5; background: #eef3fc; }
.update-btn:hover:not(:disabled) { background: #e2ebfb; }
.cancel-btn { color: #687386; border: 1px solid #dfe3ea; background: #fff; }
.save-btn { color: #fff; border: 1px solid #557bd3; background: #5d82d8; }
.modal-actions button:disabled, .close-btn:disabled { opacity: 0.5; cursor: default; }

@media (max-width: 560px) {
  .overlay { padding: 12px; }
  .modal { max-height: calc(100vh - 24px); padding: 16px; }
  .move-actions button:first-child,
  .move-actions button:last-child { display: none; }
}
</style>

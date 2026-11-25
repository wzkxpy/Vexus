<template>
  <Teleport to="body">
  <div class="overlay" @click.self="close">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="external-ids-title">
      <header class="modal-header">
        <h3 id="external-ids-title">数据源 ID</h3>
        <button class="close-btn" aria-label="关闭" :disabled="saving" @click="close">
          <X :size="16" />
        </button>
      </header>

      <div class="modal-body">
        <div class="field-grid">
          <label v-for="field in fields" :key="field.key" class="field">
            <span class="field-label">{{ field.label }}</span>
            <input
              v-model="form[field.key]"
              type="text"
              placeholder="未设置"
              autocomplete="off"
              spellcheck="false"
              :disabled="saving"
              @input="errorMessage = ''"
            />
          </label>
        </div>
        <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
      </div>

      <footer class="modal-footer">
        <button class="btn ghost" :disabled="saving" @click="close">取消</button>
        <button class="btn primary" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </footer>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { X } from '@lucide/vue'
import type { Game } from '@/shared/types'
import { normalizeVndbId } from '@/shared/utils/vndb'
import { useGameStore } from '@/renderer/stores/game.store'

type ExternalIdKey = keyof Game['externalIds']

const props = defineProps<{ game: Game }>()
const emit = defineEmits<{ close: [] }>()
const gameStore = useGameStore()

const fields: { key: ExternalIdKey; label: string }[] = [
  { key: 'bgmId', label: 'Bangumi' },
  { key: 'vndbId', label: 'VNDB' },
  { key: 'erogameId', label: '批评空间' },
  { key: 'steamId', label: 'Steam' }
]

const form = reactive<Record<ExternalIdKey, string>>({
  bgmId: props.game.externalIds.bgmId ?? '',
  vndbId: props.game.externalIds.vndbId ?? '',
  erogameId: props.game.externalIds.erogameId ?? '',
  steamId: props.game.externalIds.steamId ?? ''
})
const saving = ref(false)
const errorMessage = ref('')

const normalize = (value: string) => value.trim() || undefined

function normalizeVndbIdInput(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? normalizeVndbId(trimmed) : undefined
}

function close() {
  if (!saving.value) emit('close')
}

async function save() {
  if (saving.value) return
  errorMessage.value = ''

  const bgmId = normalize(form.bgmId)
  if (bgmId && !/^\d+$/.test(bgmId)) {
    errorMessage.value = 'Bangumi ID 应为纯数字。'
    return
  }
  if (bgmId && gameStore.games.some(game => game.id !== props.game.id && game.externalIds.bgmId === bgmId)) {
    errorMessage.value = '该 Bangumi ID 已被其他游戏使用。'
    return
  }

  let vndbId: string | undefined
  try {
    vndbId = normalizeVndbIdInput(form.vndbId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'VNDB ID 格式不正确。'
    return
  }

  const erogameId = normalize(form.erogameId)
  if (erogameId && !/^\d+$/.test(erogameId)) {
    errorMessage.value = '批评空间 ID 应为纯数字。'
    return
  }

  saving.value = true
  try {
    await gameStore.updateGame(props.game.id, {
      externalIds: {
        bgmId,
        vndbId,
        erogameId,
        steamId: normalize(form.steamId)
      }
    })
    emit('close')
  } catch (error) {
    console.error('Failed to update external IDs:', error)
    errorMessage.value = '保存失败，请重试。'
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
  background: rgba(23, 32, 48, 0.5);
}

.modal {
  width: min(520px, 100%);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  border: 1px solid #e1e5ed;
  border-radius: 16px;
  background: #ffffff;
  color: #354052;
  box-shadow: 0 24px 70px rgba(27, 37, 57, 0.22);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #eef1f4;
}

.modal-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 17px;
  font-weight: 600;
}

.close-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  color: #4b5563;
  background: #f3f4f6;
  cursor: pointer;
}

.close-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.modal-body {
  padding: 22px 24px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.field-label {
  color: #5b6678;
  font-size: 13px;
  font-weight: 550;
}

input {
  box-sizing: border-box;
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #dde3ec;
  border-radius: 9px;
  outline: none;
  background: #f8fafc;
  color: #1f2937;
  font: inherit;
  font-size: 14px;
}

input:focus {
  border-color: #7ba2f0;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(91, 140, 255, 0.14);
}

input:disabled {
  opacity: 0.65;
}

.error-message {
  margin: 14px 0 0;
  color: #c84d5a;
  font-size: 13px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px 20px;
  border-top: 1px solid #eef1f4;
  background: #fbfcfe;
}

.btn {
  min-width: 84px;
  padding: 9px 18px;
  border: 0;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 550;
  cursor: pointer;
}

.btn.ghost {
  color: #5b6678;
  background: #eef1f6;
}

.btn.primary {
  color: #ffffff;
  background: #5a94f9;
}

.btn:disabled,
.close-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

@media (max-width: 560px) {
  .overlay {
    padding: 12px;
  }

  .field-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

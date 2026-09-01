<template>
  <div class="import-overlay" @click.self="emit('close')">
    <div class="import-modal">
      <div class="header">
        <div>
          <b>导入游玩时长</b>
          <p>支持 vnite 和 PotatoVN 导出的 JSON，导入后将覆盖当前游戏的全部游玩记录。</p>
        </div>
        <button class="icon-btn" :disabled="importing" @click="emit('close')">✕</button>
      </div>

      <textarea
        v-model="text"
        :disabled="importing"
        placeholder='粘贴 vnite 或 PotatoVN 的时长 JSON'
        @input="error = ''"
      />

      <p v-if="error" class="error">{{ error }}</p>

      <div class="footer">
        <button :disabled="importing" @click="emit('close')">取消</button>
        <button
          class="danger"
          :disabled="!text.trim() || importing"
          @click="importSessions"
        >
          {{ importing ? '导入中…' : '覆盖导入' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSessionStore } from '@/renderer/stores/session.store'
import { useGameStore } from '@/renderer/stores/game.store'

const props = defineProps<{ gameId: string }>()
const emit = defineEmits<{
  close: []
  imported: []
}>()

const sessionStore = useSessionStore()
const gameStore = useGameStore()
const text = ref('')
const importing = ref(false)
const error = ref('')

const importSessions = async () => {
  if (!text.value.trim()) return

  importing.value = true
  error.value = ''
  try {
    await sessionStore.importSessions(props.gameId, text.value)
    await gameStore.refreshGame(props.gameId)
    emit('imported')
  } catch (reason) {
    error.value = errorMessage(reason)
  } finally {
    importing.value = false
  }
}

const errorMessage = (reason: unknown) => {
  return reason instanceof Error ? reason.message : '操作失败，请重试'
}
</script>

<style scoped>
.import-overlay {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, .62);
}

.import-modal {
  width: min(680px, 100%);
  max-height: 88vh;
  overflow-y: auto;
  padding: 24px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(0, 0, 0, .3);
}

.header,
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.header {
  align-items: flex-start;
  margin-bottom: 16px;
}

.header b { font-size: 18px; }
.header p { margin: 6px 0 0; color: #64748b; font-size: 13px; }

textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 220px;
  resize: vertical;
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font: 13px/1.55 ui-monospace, SFMono-Regular, Consolas, monospace;
}

textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, .14);
}

.error { color: #b91c1c; font-size: 13px; }
.footer { justify-content: flex-end; margin-top: 20px; }

button {
  border: none;
  border-radius: 7px;
  padding: 7px 13px;
  cursor: pointer;
  background: #e5e7eb;
}

button:hover:not(:disabled) { background: #d1d5db; }
button:disabled { cursor: not-allowed; opacity: .5; }
.icon-btn { width: 32px; height: 32px; padding: 0; }
.danger { color: #fff; background: #dc2626; }
.danger:hover:not(:disabled) { background: #b91c1c; }

@media (max-width: 640px) {
  .import-overlay { padding: 12px; }
  .import-modal { padding: 18px; }
}
</style>

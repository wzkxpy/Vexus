<!-- SessionModal.vue -->
<template>
  <div class="overlay">
    <div class="modal">
      <div class="header">
        <b>游玩记录</b>
        <button class="close-btn" :disabled="savingExtra" @click="requestClose">✕</button>
      </div>

      <div class="session-list">

        <!-- 表头 -->
        <div class="session-item header-row">
          <span>日期</span>
          <span>开始时间</span>
          <span>结束时间</span>
          <span>时长</span>
          <span>操作</span>
        </div>

        <!-- 列表 -->
        <div v-for="s in sessions" :key="s.id" class="session-item">

          <!-- 日期 -->
          <input v-if="editingId === s.id" type="date" v-model="edit.playDate" max="2100-12-31" />
          <span v-else class="value">{{ s.playDate }}</span>

          <!-- start time -->
          <input v-if="editingId === s.id" type="time" v-model="edit.startTime" :disabled="mode === 'duration'" />
          <span v-else class="value">{{ s.startedAt ? formatLocalTime(new Date(s.startedAt)) : '-' }}</span>

          <!-- end time -->
          <input v-if="editingId === s.id" type="time" v-model="edit.endTime" :disabled="mode === 'duration'" />
          <span v-else class="value">{{ s.endedAt ? formatLocalTime(new Date(s.endedAt)) : '-' }}</span>

          <!-- duration -->
          <input v-if="editingId === s.id" type="number" placeholder="分钟" v-model.number="edit.duration_m"
            :disabled="mode === 'time'" @keydown="blockInvalidKeys" @input="fixDuration" min="0" max="1440" />
          <span v-else class="duration">{{ formatDuration(s.duration) }}</span>

          <!-- actions -->
          <div class="actions">

            <button v-if="editingId !== s.id" @click="startEdit(s)">
              编辑
            </button>

            <button v-if="editingId === s.id" @click="toggleMode">
              {{ mode === 'time' ? '按时间' : '按时长' }}
            </button>

            <button v-if="editingId === s.id" @click="cancel"> 取消
            </button>

            <button v-if="editingId === s.id" @click="save"> 保存
            </button>

            <button v-if="editingId !== s.id" class="danger" @click="removeSession(s)"> 删除
            </button>

          </div>

        </div>

      </div>

      <div class="footer-actions">
        <button class="add-btn" @click="createSession">
          + 新记录
        </button>
        <button class="import-btn" @click="showImportModal = true">
          导入时长
        </button>

        <div class="extra-playtime-section">
          <div class="extra-playtime-editor">
            <label for="extra-playtime">未记录时长</label>
            <input
              id="extra-playtime"
              v-model="extraMinutes"
              type="text"
              inputmode="numeric"
              :disabled="savingExtra"
              @input="sanitizeExtraMinutes"
              @keydown="blockExtraInvalidKeys"
              @keydown.enter.prevent="saveExtraPlaytime"
              @keydown.escape.prevent="cancelExtraPlaytime"
            />
            <span>min</span>
            <div class="extra-edit-actions" :class="{ visible: extraDirty }">
              <button
                class="extra-confirm"
                title="保存"
                :disabled="savingExtra || !extraDirty"
                @click="saveExtraPlaytime"
              >✓</button>
              <button
                title="撤销"
                :disabled="savingExtra || !extraDirty"
                @click="cancelExtraPlaytime"
              >×</button>
            </div>
          </div>
          <span v-if="extraError" class="extra-error">{{ extraError }}</span>
        </div>
      </div>

    </div>
    <SessionImportModal
      v-if="showImportModal"
      :game-id="game!.id"
      @close="showImportModal = false"
      @imported="handleImported"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useSessionStore } from '@/renderer/stores/session.store'
import { useGameStore } from '@/renderer/stores/game.store'
import type { Session, SessionSource } from '@/shared/types'
import { useRoute } from 'vue-router'
import { formatLocalDate, formatLocalTime } from '@/shared/utils'
import SessionImportModal from './SessionImportModal.vue'

const emit = defineEmits(['close'])

const sessionStore = useSessionStore()
const gameStore = useGameStore()
const route = useRoute()
const game = computed(() => {
  const id = route.params.id as string
  return gameStore.getGameById(id)
})
const showImportModal = ref(false)
const savedExtraSeconds = ref(game.value?.record.extraPlaytime ?? 0)
const extraMinutes = ref(formatExtraMinutes(savedExtraSeconds.value))
const savingExtra = ref(false)
const extraError = ref('')

const normalizedExtraSeconds = computed(() => {
  if (extraMinutes.value === '') return 0
  const minutes = Number(extraMinutes.value)
  if (!Number.isFinite(minutes) || minutes < 0) return null
  return Math.round(minutes * 60)
})

const extraDirty = computed(() =>
  extraMinutes.value !== formatExtraMinutes(savedExtraSeconds.value)
)

watch(
  () => game.value?.record.extraPlaytime,
  seconds => {
    if (seconds === undefined || extraDirty.value) return
    savedExtraSeconds.value = seconds
    extraMinutes.value = formatExtraMinutes(seconds)
  }
)

const saveExtraPlaytime = async () => {
  if (!game.value || !extraDirty.value || savingExtra.value) return
  const seconds = normalizedExtraSeconds.value
  if (seconds === null) {
    extraError.value = '请输入不小于 0 的有效数字'
    return
  }

  savingExtra.value = true
  extraError.value = ''
  try {
    await gameStore.updateGame(game.value.id, {
      record: {
        ...game.value.record,
        extraPlaytime: seconds
      }
    })
    savedExtraSeconds.value = seconds
    extraMinutes.value = formatExtraMinutes(seconds)
  } catch (reason) {
    extraError.value = reason instanceof Error ? reason.message : '保存失败，请重试'
  } finally {
    savingExtra.value = false
  }
}

const cancelExtraPlaytime = () => {
  extraMinutes.value = formatExtraMinutes(savedExtraSeconds.value)
  extraError.value = ''
}

const requestClose = () => {
  if (savingExtra.value) return
  emit('close')
}

const sanitizeExtraMinutes = () => {
  extraMinutes.value = extraMinutes.value.replace(/\D/g, '')
  extraError.value = ''
}

const blockExtraInvalidKeys = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey) return
  const allowed = [
    'Backspace', 'Delete', 'Tab',
    'ArrowLeft', 'ArrowRight', 'Home', 'End',
    'Enter', 'Escape'
  ]
  if (!/^\d$/.test(event.key) && !allowed.includes(event.key)) {
    event.preventDefault()
  }
}

function formatExtraMinutes(seconds: number) {
  return String(Math.round(seconds / 60))
}

const handleImported = () => {
  showImportModal.value = false
}

/* draft session (未保存) */
const draftSession = ref<Session | null>(null)

/* session 列表 */
const sessions = computed(() => {
  const list = sessionStore.getGameSessions(game.value!.id)
  if (draftSession.value) {
    return [...list, draftSession.value]
  }
  return list
})

/* 编辑状态 */
const editingId = ref<string | null>(null)

const mode = ref<'time' | 'duration'>('time')

const edit = reactive({
  id: '',
  playDate: '',
  duration_m: 0,
  startTime: '',
  endTime: '',
  source: 'manual' as SessionSource
})

/* 工具 */
const today = () => formatLocalDate(new Date())

const formatDuration = (sec: number) => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h${m}m`
  if (m > 0) return `${m}m`
  return `${sec}s`
}

const blockInvalidKeys = (e: KeyboardEvent) => {
  const invalid = ['e', 'E', '+', '-', '.']
  if (invalid.includes(e.key)) {
    e.preventDefault()
  }
}

const fixDuration = () => {
  if (edit.duration_m < 0) { edit.duration_m = 0 }
  else if (edit.duration_m > 1440) { edit.duration_m = 1440 }
}

/* 新建 */
const createSession = () => {
  if (editingId.value) return

  const id = crypto.randomUUID()

  const session: Session = {
    id,
    gameId: game.value!.id,
    playDate: today(),
    duration: 0,
    startedAt: null,
    endedAt: null,
    routeId: null,
    source: 'manual'
  }
  draftSession.value = session

  editingId.value = id

  edit.id = id
  edit.playDate = session.playDate
  edit.duration_m = 0
  edit.startTime = ''
  edit.endTime = ''
  edit.source = 'manual'

  mode.value = 'time'
}

/* 编辑 */
const startEdit = (s: Session) => {
  if (editingId.value) return

  editingId.value = s.id

  edit.id = s.id
  edit.playDate = s.playDate
  edit.duration_m = Math.round(s.duration / 60)
  edit.startTime = s.startedAt ? formatLocalTime(new Date(s.startedAt)) : ''
  edit.endTime = s.endedAt ? formatLocalTime(new Date(s.endedAt)) : ''
  edit.source = s.source

  mode.value =
    s.startedAt && s.endedAt
      ? 'time'
      : 'duration'
}

/* 取消 */
const cancel = () => {
  draftSession.value = null
  editingId.value = null
}

/* 切换模式 */
const toggleMode = () => {
  mode.value =
    mode.value === 'time'
      ? 'duration'
      : 'time'
}

/* 保存 */
const save = async () => {
  if (!edit.playDate) return

  let duration_s = edit.duration_m * 60
  let startedAt: string | null = null
  let endedAt: string | null = null

  if (mode.value === 'time') {
    if (!edit.startTime || !edit.endTime) return

    const start = new Date(`${edit.playDate}T${edit.startTime}:00`)
    const end = new Date(`${edit.playDate}T${edit.endTime}:00`)
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return
    if (end.getTime() < start.getTime()) {
      end.setDate(end.getDate() + 1)
    }

    startedAt = start.toISOString()
    endedAt = end.toISOString()
    duration_s = Math.round((end.getTime() - start.getTime()) / 1000)
  }

  const session: Session = {
    id: edit.id,
    gameId: game.value!.id,
    playDate: edit.playDate,
    duration: duration_s,
    startedAt,
    endedAt,
    routeId: null,
    source: edit.source
  }

  if (draftSession.value) {  // 新增时
    if (mode.value === 'duration') {
      // 查找是否已有同一天的 session
      const existing = sessions.value.find(s =>
        s.id !== edit.id
        && !s.endedAt
        && s.playDate === edit.playDate
        && s.source === 'manual'
      )
      if (existing) {
        session.id = existing.id
        session.duration += existing.duration
        await sessionStore.updateSession(session)
      } else {
        await sessionStore.addSession(session)
      }
    }
    else  // time mode
      await sessionStore.addSession(session)
  }
  else  // 修改时
    await sessionStore.updateSession(session)

  await gameStore.refreshGame(game.value!.id)  // 数据库触发器已重算总时长，同步刷新前端缓存
  draftSession.value = null
  editingId.value = null
}

/* 删除 */
const removeSession = async (s: Session) => {
  const ok = confirm('确定删除吗？')
  if (!ok) return
  await sessionStore.deleteSession(s.id, s.gameId)
  await gameStore.refreshGame(game.value!.id)  // 数据库触发器已重算总时长，同步刷新前端缓存
}
</script>


<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .55);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.modal {
  width: 720px;
  max-height: 85vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 14px;
  padding: 24px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, .25);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-size: 18px;
}

.close-btn {
  border: none;
  background: #f3f4f6;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  transition: .2s;
}

.close-btn:hover {
  background: #e5e7eb;
}

.session-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-right: 4px;
}

.session-list::-webkit-scrollbar {
  width: 6px;
}

.session-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #cbd2df;
}

/* 表头 */
.header-row {
  position: sticky;
  top: 0;
  z-index: 1;
  font-weight: 560;
  font-size: 14px;
  color: #555555;
}

.session-item {
  display: grid;
  grid-template-columns: 120px 100px 100px 100px minmax(0, 1fr);
  gap: 10px;
  align-items: center;

  padding: 12px;
  border-radius: 10px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;

  transition: .15s;
}

.session-item:hover {
  background: #f3f4f6;
}

/* 值显示 */
.value {
  font-size: 14px;
  color: #374151;
}

/* duration 标签 */
.duration {
  display: inline-block;
  background: #e0ecff;
  color: #1d4ed8;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

/* 输入框 */
input {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 14px;
  transition: .15s;
}

input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, .15);
}

input:disabled {
  background: #f3f4f6;
}

/* 按钮区 */
.actions {
  display: flex;
  gap: 6px;
}
.actions button {
  white-space: nowrap;
}

/* 默认按钮 */
button {
  border: none;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 13px;
  cursor: pointer;
  background: #e5e7eb;
  transition: .15s;
}
button:hover {
  background: #d1d5db;
}

/* 添加按钮 */
.add-btn {
  width: 120px;
  background: #2563eb;
  color: white;
  border: none;
  padding: 7px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 8px;
}
.add-btn:hover {
  background: #1d4ed8;
}

.footer-actions {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-shrink: 0;
  margin-top: 16px;
}

.footer-actions .add-btn {
  margin-bottom: 0;
}

.import-btn {
  color: #1d4ed8;
  background: #dbeafe;
}

.import-btn:hover {
  background: #bfdbfe;
}

.extra-playtime-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  margin-left: auto;
}

.extra-playtime-editor {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  color: #4b5563;
  font-size: 13px;
  white-space: nowrap;
}

.extra-playtime-editor input {
  width: 96px;
  box-sizing: border-box;
}

.extra-edit-actions {
  width: 60px;
  display: flex;
  gap: 4px;
  visibility: hidden;
}

.extra-edit-actions.visible {
  visibility: visible;
}

.extra-edit-actions button {
  width: 28px;
  height: 28px;
  padding: 0;
}

.extra-edit-actions .extra-confirm {
  color: #ffffff;
  background: #22c55e;
}

.extra-edit-actions .extra-confirm:hover {
  background: #16a34a;
}

.extra-error {
  color: #b91c1c;
  font-size: 12px;
}

/* 保存按钮 */
.actions button:nth-child(3) {
  background: #22c55e;
  color: white;
}
.actions button:nth-child(3):hover {
  background: #16a34a;
}

/* 删除按钮 */
.danger {
  background: #fee2e2;
  color: #b91c1c;
}
.danger:hover {
  background: #fecaca;
}
</style>

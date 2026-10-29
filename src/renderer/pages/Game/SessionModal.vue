<!-- SessionModal.vue -->
<template>
  <div class="overlay">
    <div class="modal">
      <div class="header">
        <b>游玩记录</b>
        <button class="close-btn" aria-label="关闭" :disabled="savingExtra" @click="requestClose">
          <X :size="16" />
        </button>
      </div>

      <div class="session-list">

        <!-- 表头 -->
        <div class="session-item header-row">
          <span>日期</span>
          <span>开始时间</span>
          <span>结束时间</span>
          <span>时长</span>
          <span>线路</span>
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

          <!-- route -->
          <select v-if="editingId === s.id" v-model="edit.routeId" class="route-select" aria-label="线路">
            <option :value="null">未指定</option>
            <option v-for="item in gameRoutes" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
          <span v-else class="value route-value" :class="{ 'route-pending': !s.routeId && s.routeTag }">{{ sessionRouteLabel(s) }}</span>

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

      <div v-if="pendingGroups.length" class="pending-tags" :aria-busy="Boolean(bindingTag)">
        <div class="pending-title">待绑定线路</div>
        <div v-for="group in pendingGroups" :key="group.tag" class="pending-row">
          <span class="pending-tag" :title="group.tag">{{ group.tag }}</span>
          <span class="pending-meta">{{ group.count }} 条 · {{ formatDuration(group.duration) }}</span>
          <select
            class="pending-select"
            :disabled="Boolean(bindingTag)"
            aria-label="为标签选择线路"
            @change="bindTag(group.tag, $event)"
          >
            <option value="" selected disabled>选择线路…</option>
            <option v-for="item in gameRoutes" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </div>
        <p v-if="bindingError" class="pending-error" role="alert">{{ bindingError }}</p>
      </div>

      <p v-if="exportError" class="export-error" role="alert">{{ exportError }}</p>

      <div class="footer-actions">
        <button class="add-btn" @click="createSession">
          <Plus :size="14" />
          新记录
        </button>
        <button class="import-btn" @click="showImportModal = true">
          导入时长
        </button>
        <button
          class="export-btn"
          :disabled="exporting || !canExport"
          title="复制游玩记录 JSON 到剪贴板"
          @click="copyExport"
        >
          {{ copied ? '已复制' : exporting ? '导出中…' : '导出' }}
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
                aria-label="保存"
                :disabled="savingExtra || !extraDirty"
                @click="saveExtraPlaytime"
              ><Check :size="14" /></button>
              <button
                title="撤销"
                aria-label="撤销"
                :disabled="savingExtra || !extraDirty"
                @click="cancelExtraPlaytime"
              ><X :size="14" /></button>
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
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useSessionStore } from '@/renderer/stores/session.store'
import { useGameStore } from '@/renderer/stores/game.store'
import { useRouteStore } from '@/renderer/stores/route.store'
import { buildSessionExport } from '@/shared/sessionExport'
import type { Session, SessionSource } from '@/shared/types'
import { useRoute } from 'vue-router'
import { formatLocalDate, formatLocalTime } from '@/shared/utils'
import { Check, Plus, X } from '@lucide/vue'
import SessionImportModal from './SessionImportModal.vue'

const emit = defineEmits(['close'])

const sessionStore = useSessionStore()
const gameStore = useGameStore()
const routeStore = useRouteStore()
const route = useRoute()
const game = computed(() => {
  const id = route.params.id as string
  return gameStore.getGameById(id)
})
const gameRoutes = computed(() => routeStore.getGameRoutes(game.value!.id))
const routeName = (routeId: string | null) => {
  if (!routeId) return '未指定'
  return gameRoutes.value.find(item => item.id === routeId)?.name ?? '未指定'
}
const sessionRouteLabel = (session: Session) => {
  if (session.routeId) return routeName(session.routeId)
  return session.routeTag ? `待绑定：${session.routeTag}` : '未指定'
}
// 新记录默认归入当前游玩中的线路，与自动记录规则一致。
const defaultRouteId = () =>
  gameRoutes.value.find(item => item.status === 'Playing')?.id ?? null
watch(
  () => game.value?.id,
  id => { if (id) void routeStore.loadGameRoutes(id) },
  { immediate: true }
)
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

const exportSessions = computed(() => sessionStore.getGameSessions(game.value!.id))
const canExport = computed(() => exportSessions.value.some(session => session.duration > 0))
const pendingGroups = computed(() => {
  const groups = new Map<string, { tag: string; count: number; duration: number }>()
  for (const session of exportSessions.value) {
    const tag = session.routeTag
    if (session.routeId || !tag) continue
    const group = groups.get(tag)
    if (group) {
      group.count += 1
      group.duration += session.duration
    } else {
      groups.set(tag, { tag, count: 1, duration: session.duration })
    }
  }
  return [...groups.values()]
})
const bindingTag = ref<string | null>(null)
const bindingError = ref('')
const bindTag = async (tag: string, event: Event) => {
  const select = event.target as HTMLSelectElement
  const routeId = select.value
  if (!routeId || bindingTag.value) return
  bindingTag.value = tag
  bindingError.value = ''
  try {
    await sessionStore.assignTagToRoute(game.value!.id, tag, routeId)
  } catch (error) {
    console.error('Failed to bind route tag:', error)
    bindingError.value = '绑定失败，请重试'
    select.value = ''
  } finally {
    bindingTag.value = null
  }
}
const exporting = ref(false)
const copied = ref(false)
const exportError = ref('')
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const copyExport = async () => {
  if (exporting.value || !canExport.value) return
  exporting.value = true
  exportError.value = ''
  copied.value = false
  try {
    // 已绑定记录的标签由当前线路名派生，导出前确保线路列表已加载。
    const gameId = game.value!.id
    if (routeStore.routesByGame[gameId] === undefined) {
      await routeStore.loadGameRoutes(gameId)
    }
    await window.clipboardAPI.writeText(buildSessionExport(exportSessions.value, gameRoutes.value))
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = false }, 1500)
  } catch (error) {
    console.error('Failed to export sessions:', error)
    exportError.value = '复制到剪贴板失败，请重试'
  } finally {
    exporting.value = false
  }
}

onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
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
  routeId: null as string | null,
  routeTag: null as string | null,
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
    routeId: defaultRouteId(),
    routeTag: null,
    source: 'manual'
  }
  draftSession.value = session

  editingId.value = id

  edit.id = id
  edit.playDate = session.playDate
  edit.duration_m = 0
  edit.startTime = ''
  edit.endTime = ''
  edit.routeId = session.routeId
  edit.routeTag = null
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
  edit.routeId = s.routeId
  edit.routeTag = s.routeTag
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
    routeId: edit.routeId,
    routeTag: edit.routeId ? null : edit.routeTag,
    source: edit.source
  }

  if (draftSession.value) {
    await sessionStore.addSession(session)
  } else {
    await sessionStore.updateSession(session)
  }

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
  width: min(860px, calc(100vw - 32px));
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
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #f3f4f6;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: #4b5563;
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
  overflow: auto;
  padding-right: 4px;
}

.pending-tags {
  margin-top: 14px;
  padding: 12px;
  border: 1px solid #efe3ca;
  border-radius: 10px;
  background: #fdf9f0;
}

.pending-title {
  margin-bottom: 8px;
  color: #8a6d3b;
  font-size: 12px;
  font-weight: 600;
}

.pending-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pending-row + .pending-row {
  margin-top: 8px;
}

.pending-tag {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #6d5325;
  font-size: 13px;
  font-weight: 550;
}

.pending-meta {
  flex-shrink: 0;
  color: #998a6c;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.pending-select {
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid #dfcfae;
  border-radius: 6px;
  background: #fff;
  color: #6d5325;
  font-size: 12px;
}

.pending-error {
  margin: 8px 0 0;
  color: #b91c1c;
  font-size: 12px;
}

.route-pending {
  color: #9a7d4c;
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
  grid-template-columns: 104px 92px 92px 92px minmax(104px, 1fr) minmax(170px, auto);
  min-width: 780px;
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

.session-item input,
.session-item select {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.route-select {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 14px;
  background: #fff;
  transition: .15s;
}

.route-select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, .15);
}

.route-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  flex-wrap: wrap;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
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
  align-items: center;
  flex-wrap: wrap;
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

.export-btn {
  color: #3f5f9e;
  background: #e8edf7;
}

.export-btn:hover:not(:disabled) {
  background: #dbe3f2;
}

.export-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.export-error {
  margin: 12px 0 0;
  color: #b91c1c;
  font-size: 12px;
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
  display: flex;
  align-items: center;
  justify-content: center;
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

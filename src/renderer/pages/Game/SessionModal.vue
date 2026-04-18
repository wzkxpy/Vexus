<!-- SessionModal.vue -->
<template>
  <div class="overlay">
    <div class="modal">
      <div class="header">
        <b>游玩记录</b>
        <button class="close-btn" @click="$emit('close')">✕</button>
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
          <span v-else class="value">{{ s.startTime ? formatLocalTime(new Date(s.startTime)) : '-' }}</span>

          <!-- end time -->
          <input v-if="editingId === s.id" type="time" v-model="edit.endTime" :disabled="mode === 'duration'" />
          <span v-else class="value">{{ s.endTime ? formatLocalTime(new Date(s.endTime)) : '-' }}</span>

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

            <button v-if="editingId === s.id" @click="save"> 保存
            </button>

            <button v-if="editingId === s.id" @click="cancel"> 取消
            </button>

            <button v-if="editingId !== s.id" class="danger" @click="removeSession(s)"> 删除
            </button>

          </div>

        </div>

        <!-- 新建 -->
        <button class="add-btn" @click="createSession">
          + 新记录
        </button>

      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useSessionStore } from '@/renderer/stores/session.store'
import { useGameStore } from '@/renderer/stores/game.store'
import type { Session } from '@/shared/types'
import { useRoute } from 'vue-router'
import { formatLocalDate, formatLocalTime } from '@/shared/utils'

defineEmits(['close'])

const sessionStore = useSessionStore()
const gameStore = useGameStore()
const route = useRoute()
const game = computed(() => {
  const id = route.params.id as string
  return gameStore.getGameById(id)
})

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
  endTime: ''
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
    startTime: null,
    endTime: null,
    routeId: null,
    autoRecord: false
  }
  draftSession.value = session

  editingId.value = id

  edit.id = id
  edit.playDate = session.playDate
  edit.duration_m = 0
  edit.startTime = ''
  edit.endTime = ''

  mode.value = 'time'
}

/* 编辑 */
const startEdit = (s: Session) => {
  if (editingId.value) return

  editingId.value = s.id

  edit.id = s.id
  edit.playDate = s.playDate
  edit.duration_m = Math.round(s.duration / 60)
  edit.startTime = s.startTime ? formatLocalTime(new Date(s.startTime)) : ''
  edit.endTime = s.endTime ? formatLocalTime(new Date(s.endTime)) : ''

  mode.value =
    s.startTime && s.endTime
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
  let startTime: string | null = null
  let endTime: string | null = null

  if (mode.value === 'time') {
    if (!edit.startTime || !edit.endTime) return

    startTime = edit.startTime + ':00'
    endTime = edit.endTime + ':00'
    const start = new Date(`${edit.playDate}T${startTime}`)
    const end = new Date(`${edit.playDate}T${endTime}`)
    if (end.getTime() < start.getTime()) {
      end.setDate(end.getDate() + 1)
    }

    startTime = start.toISOString()
    endTime = end.toISOString()
    duration_s = Math.round((end.getTime() - start.getTime()) / 1000)
  }

  const session: Session = {
    id: edit.id,
    gameId: game.value!.id,
    playDate: edit.playDate,
    duration: duration_s,
    startTime,
    endTime,
    routeId: null,
    autoRecord: false
  }

  if (draftSession.value) {  // 新增时
    if (mode.value === 'duration') {
      // 查找是否已有同一天的 session
      const existing = sessions.value.find(s =>
        s.id !== edit.id && !s.endTime && s.playDate === edit.playDate
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

  gameStore.refreshGame(game.value!.id)  // 刷新游戏数据以更新总游玩时长等信息
  draftSession.value = null
  editingId.value = null
}

/* 删除 */
const removeSession = async (s: Session) => {
  const ok = confirm('确定删除吗？')
  if (!ok) return
  await sessionStore.deleteSession(s.id, s.gameId)
  gameStore.refreshGame(game.value!.id)  // 刷新游戏数据以更新总游玩时长等信息
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
  background: #ffffff;
  border-radius: 14px;
  padding: 24px;
  overflow-y: auto;
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
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 表头 */
.header-row {
  font-weight: 560;
  font-size: 14px;
  color: #555555;
}

.session-item {
  display: grid;
  grid-template-columns: 120px 100px 100px 120px auto;
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

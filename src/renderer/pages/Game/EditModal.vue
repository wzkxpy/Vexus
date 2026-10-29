<!-- src/renderer/pages/Game/EditModal.vue -->
<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <header class="modal-header">
        <h3>{{ title }}</h3>
        <CloseButton @click="$emit('close')" />
      </header>

      <div class="modal-body">
        <template v-if="type === 'exePath'">
          <label class="field">
            <span class="field-label">可执行文件路径</span>
            <input v-model="form.exePath" placeholder="请输入游戏可执行文件路径" />
          </label>
        </template>

        <template v-else-if="type === 'description'">
          <label class="field">
            <span class="field-label">简介内容</span>
            <textarea
              v-model="form.description"
              class="large"
              placeholder="请输入游戏简介"
            />
          </label>
        </template>

        <template v-else-if="type === 'externalScore'">
          <div class="field-grid">
            <label class="field">
              <span class="field-label">批评空间</span>
              <input v-model="form.externalScore!.erogame" placeholder="0 – 100" />
            </label>
            <label class="field">
              <span class="field-label">Bangumi</span>
              <input v-model="form.externalScore!.bgm" placeholder="0 – 10" />
            </label>
            <label class="field">
              <span class="field-label">VNDB</span>
              <input v-model="form.externalScore!.vndb" placeholder="0 – 10" />
            </label>
          </div>
        </template>

        <template v-else-if="type === 'basicInfo'">
          <div class="field-grid">
            <label class="field">
              <span class="field-label">开发商</span>
              <input v-model="form.basicInfo!.developer" placeholder="请输入开发商" />
            </label>
            <label class="field">
              <span class="field-label">发行商</span>
              <input v-model="form.basicInfo!.publisher" placeholder="请输入发行商" />
            </label>
            <label class="field">
              <span class="field-label">发售日期</span>
              <input v-model="form.basicInfo!.releaseDate" placeholder="yyyy-mm-dd" />
            </label>
            <label class="field">
              <span class="field-label">游戏时长</span>
              <input v-model="form.basicInfo!.estimatedTime" placeholder="-h-m" />
            </label>
          </div>
        </template>

        <template v-else-if="type === 'tags'">
          <label class="field">
            <span class="field-label">标签</span>
            <textarea
              v-model="tagsInput"
              placeholder="多个标签用逗号分隔"
            />
          </label>
        </template>

        <template v-else-if="type === 'staff'">
          <div class="field-grid">
            <label class="field">
              <span class="field-label">企划</span>
              <input v-model="form.staff!.planner" placeholder="请输入企划" />
            </label>
            <label class="field">
              <span class="field-label">剧本</span>
              <input v-model="form.staff!.scenario" placeholder="请输入剧本" />
            </label>
            <label class="field">
              <span class="field-label">原画</span>
              <input v-model="form.staff!.artist" placeholder="请输入原画" />
            </label>
            <label class="field">
              <span class="field-label">音乐</span>
              <input v-model="form.staff!.music" placeholder="请输入音乐" />
            </label>
          </div>
        </template>
      </div>

      <footer class="modal-footer">
        <button class="btn ghost" @click="$emit('close')">取消</button>
        <button class="btn primary" @click="handleSave()">保存</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import type { Game } from '@/shared/types'
import { useGameStore } from '@/renderer/stores/game.store'
import { useRoute } from 'vue-router'
import CloseButton from '@/renderer/components/CloseButton.vue'

const route = useRoute()
const gameStore = useGameStore()
const game = computed(() => {
  const id = route.params.id as string
  return gameStore.getGameById(id)
})

const props = defineProps<{ type: keyof Game }>()
const emit = defineEmits(['close'])

const form = reactive<Record<string, any>>({})
// const form = reactive<Partial<Game>>({})

// 初始化 form 数据
if (game.value) {
  const value = game.value[props.type]
  if (typeof value === 'object' && value !== null) {
    form[props.type] = Array.isArray(value)
      ? [...value]
      : { ...value }
  } else {
    form[props.type] = value
  }
}

const tagsInput = computed({
  get: () =>
    (form.tags as string[] | undefined)?.join(', ') ?? '',
  set: (val: string) => {
    form.tags = val.split(',').map(t => t.trim())
  }
})

const title = computed(() => {
  const map: Record<string, string> = {
    exePath: '游戏路径',
    description: '游戏简介',
    basicInfo: '基础信息',
    externalScore: '外部评分',
    tags: '标签',
    staff: '制作人员'
  }
  return map[props.type] || ''
})

const handleSave = async () => {
  // console.log(props.type, form)
  await gameStore.updateGame(game.value!.id, form as Partial<Game>)
  emit('close')
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
  background: rgba(23, 32, 48, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  display: flex;
  flex-direction: column;
  width: min(520px, 100%);
  max-height: min(720px, calc(100vh - 48px));
  border: 1px solid #e1e5ed;
  border-radius: 16px;
  background: #ffffff;
  color: #354052;
  box-shadow: 0 24px 70px rgba(27, 37, 57, 0.22);
  overflow: hidden;
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
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
}

.modal-body {
  flex: 1;
  min-height: 0;
  padding: 22px 24px;
  overflow-y: auto;
}

.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #cbd2df;
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
  font-size: 13px;
  font-weight: 550;
  color: #5b6678;
}

input,
textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #dde3ec;
  border-radius: 9px;
  background: #f8fafc;
  color: #1f2937;
  font: inherit;
  font-size: 14px;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

input::placeholder,
textarea::placeholder {
  color: #a3adbd;
}

input:hover,
textarea:hover {
  border-color: #c8d2e1;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: #7ba2f0;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(91, 140, 255, 0.14);
}

textarea {
  min-height: 120px;
  resize: vertical;
  line-height: 1.6;
}

textarea.large {
  min-height: 200px;
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
  border: none;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 550;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
}

.btn:active {
  transform: translateY(1px);
}

.btn.ghost {
  color: #5b6678;
  background: #eef1f6;
}

.btn.ghost:hover {
  background: #e3e8f0;
}

.btn.primary {
  color: #ffffff;
  background: #5a94f9;
  box-shadow: 0 4px 12px rgba(90, 148, 249, 0.28);
}

.btn.primary:hover {
  background: #4785f2;
}

@media (max-width: 560px) {
  .field-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

<!-- src/renderer/components/EditModal.vue -->
<template>
  <div class="overlay">
    <div class="modal">
      <h3>{{ title }}</h3>

      <div class="form">
        <template v-if="type === 'exePath'">
          <input v-model="form.exePath" placeholder="游戏可执行文件路径" />
        </template>

        <template v-if="type === 'description'">
          <textarea v-model="form.description" />
        </template>

        <template v-if="type === 'externalScore'">
          <input v-model="form.externalScore!.erogame" placeholder="批评空间" />
          <input v-model="form.externalScore!.bgm" placeholder="Bangumi" />
          <input v-model="form.externalScore!.vndb" placeholder="VNDB" />
        </template>

        <template v-if="type === 'basicInfo'">
          <input v-model="form.basicInfo!.developer" placeholder="开发商" />
          <input v-model="form.basicInfo!.publisher" placeholder="发行商" />
          <input v-model="form.basicInfo!.releaseDate" placeholder="发售日期" />
          <input v-model="form.basicInfo!.estimatedTime" placeholder="游戏时长" />
        </template>

        <template v-if="type === 'tags'">
          <textarea v-model="tagsInput" placeholder="用逗号分隔" />
        </template>

        <template v-if="type === 'staff'">
          <input v-model="form.staff!.planner" placeholder="企划" />
          <input v-model="form.staff!.scenario" placeholder="剧本" />
          <input v-model="form.staff!.artist" placeholder="原画" />
          <input v-model="form.staff!.music" placeholder="音乐" />
        </template>
      </div>

      <div class="actions">
        <button @click="$emit('close')">取消</button>
        <button class="primary" @click="handleSave()">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import type { Game } from '@/shared/types'
import { useGameStore } from '@/renderer/stores/game.store'

const gameStore = useGameStore()
const game = computed(() => gameStore.selectedGame)

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
    tags: '标签',
    staff: '制作人员'
  }
  return map[props.type] || ''
})

const handleSave = async () => {
  // console.log(props.type, form)
  await gameStore.updateSelectedGame(form as Partial<Game>)
  emit('close')
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal {
  width: 460px;
  background: #1f2937;
  padding: 20px;
  border-radius: 12px;
  color: white;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0;
}

input,
textarea {
  padding: 8px;
  border-radius: 6px;
  border: none;
  background: #374151;
  color: white;
}

textarea {
  min-height: 100px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.primary {
  background: #22c55e;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  color: white;
}
</style>
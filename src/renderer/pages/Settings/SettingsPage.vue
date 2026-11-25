<template>
  <main class="settings-page">
    <!-- 无边框窗口的顶部拖拽区域 -->
    <div class="drag-region" />
    <header class="page-header">
      <div>
        <h1>设置</h1>
      </div>
    </header>

    <div v-if="loading" class="loading-card"><span class="spinner" />正在载入设置…</div>
    <div v-else class="settings-layout">
      <!-- 分组独立显示，仅通过导航按钮切换。 -->
      <nav class="settings-nav" aria-label="设置分组">
        <button v-for="section in sections" :key="section.id" :class="{ active: activeSection === section.id }" :aria-current="activeSection === section.id ? 'page' : undefined"
          @click="activeSection = section.id">
          <component :is="section.icon" :size="17" :stroke-width="1.7" />{{ section.label }}
          <ChevronRight :size="14" class="nav-chevron" />
        </button>
      </nav>

      <!-- 切换时重建滚动容器，使新分组从顶部开始；表单值保留在 form 中。 -->
      <div :key="activeSection" class="settings-content">
        <!-- 常规设置 -->
        <section v-if="activeSection === 'general'" id="general" class="setting-section">
          <div class="section-heading"><SlidersHorizontal :size="18" :stroke-width="1.7" /><h2>常规</h2></div>
          <div class="setting-card">
            <SettingRow title="开机自启">
              <label class="switch"><input aria-label="开机自启" v-model="form.autoLaunch" type="checkbox"
                  @change="save('autoLaunch')"><span /></label>
            </SettingRow>
            <SettingRow title="界面主题">
              <div class="segmented">
                <button v-for="item in themeOptions" :key="item.value" :class="{ active: form.theme === item.value }" :aria-pressed="form.theme === item.value"
                  @click="setValue('theme', item.value)"><component :is="item.icon" :size="14" />{{ item.label }}</button>
              </div>
            </SettingRow>
          </div>
        </section>

        <!-- 游戏标题显示偏好 -->
        <section v-if="activeSection === 'display'" id="display" class="setting-section">
          <div class="section-heading"><PanelsTopLeft :size="18" :stroke-width="1.7" /><h2>游戏显示</h2></div>
          <div class="setting-card">
            <SettingRow title="优先显示标题">
              <div class="segmented"><button :class="{ active: form.gameTitle === 'Local' }" :aria-pressed="form.gameTitle === 'Local'"
                  @click="setValue('gameTitle', 'Local')">译名</button><button
                  :class="{ active: form.gameTitle === 'Orig' }" :aria-pressed="form.gameTitle === 'Orig'" @click="setValue('gameTitle', 'Orig')">原名</button>
              </div>
            </SettingRow>
            <SettingRow title="区分主副标题">
              <label class="switch"><input aria-label="区分主副标题" v-model="form.subTitle" type="checkbox"
                  @change="save('subTitle')"><span /></label>
            </SettingRow>
          </div>
        </section>

        <!-- Bangumi 凭据及请求代理 -->
        <section v-if="activeSection === 'network'" id="network" class="setting-section">
          <div class="section-heading"><Globe2 :size="18" :stroke-width="1.7" /><h2>数据与网络</h2></div>
          <div class="setting-card">
            <SettingRow title="Bangumi Access Token" stacked>
              <div class="token-field"><input aria-label="Bangumi Access Token" autocomplete="off" spellcheck="false" v-model="form.bangumiToken" :type="showToken ? 'text' : 'password'"
                  @blur="save('bangumiToken')" @keydown.enter="blurInput"><button
                  :aria-label="showToken ? '隐藏 Token' : '显示 Token'" :aria-pressed="showToken" @click="showToken = !showToken"><EyeOff v-if="showToken" :size="16" /><Eye v-else :size="16" /></button></div>
            </SettingRow>
            <SettingRow title="声优马甲映射">
              <button class="file-btn" type="button" :disabled="openingFile" @click="openVoiceActorAliasesFile">
                {{ openingFile ? '打开中…' : '打开文件' }}
              </button>
            </SettingRow>
            <SettingRow title="使用代理">
              <label class="switch"><input aria-label="使用代理" v-model="form.proxy.enabled" type="checkbox"
                  @change="saveProxy"><span /></label>
            </SettingRow>
            <div class="proxy-grid" :class="{ disabled: !form.proxy.enabled }">
              <label><span>协议</span><select v-model="form.proxy.protocol" :disabled="!form.proxy.enabled"
                  @change="saveProxy">
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="socks5">SOCKS5</option>
                </select></label>
              <label><span>主机地址</span><input v-model.trim="form.proxy.host" :disabled="!form.proxy.enabled"
                  @blur="saveProxy"></label>
              <label><span>端口</span><input v-model.number="form.proxy.port" :disabled="!form.proxy.enabled"
                  type="number" min="1" max="65535" @blur="saveProxy"></label>
            </div>
          </div>
          <p v-if="aliasError" class="alias-error" role="alert">{{ aliasError }}</p>
        </section>

        <!-- 第三方辅助工具配置 -->
        <section v-if="activeSection === 'tools'" id="tools" class="setting-section">
          <div class="section-heading"><Wrench :size="18" :stroke-width="1.7" /><h2>外部工具</h2></div>
          <div class="setting-card">
            <SettingRow title="Magpie 程序路径" stacked><input
                aria-label="Magpie 程序路径" v-model.trim="form.magpiePath" class="full-input"
                @blur="save('magpiePath')" @keydown.enter="blurInput"></SettingRow>
            <SettingRow title="Magpie 快捷键"><input aria-label="Magpie 快捷键" v-model.trim="form.magpieHotkey"
                class="hotkey-input" @blur="save('magpieHotkey')"
                @keydown.enter="blurInput"></SettingRow>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { defineComponent, h, onMounted, reactive, ref, toRaw } from 'vue'
import { ChevronRight, Eye, EyeOff, Globe2, Monitor, Moon, PanelsTopLeft, SlidersHorizontal, Sun, Wrench } from '@lucide/vue'
import type { Settings } from '@/shared/types'
import { useSettingsStore } from '@/renderer/stores/settings.store'

// 页面内复用的“标题 + 控件”设置行。
const SettingRow = defineComponent({
  props: { title: String, stacked: Boolean },
  setup: (props, { slots }) => () => h('div', { class: ['setting-row', { stacked: props.stacked }] }, [h('span', { class: 'setting-title' }, props.title), h('div', { class: 'setting-control' }, slots.default?.())])
})
// 导航与分组使用同一组图标，便于辨识。
const sections = [
  { id: 'general', label: '常规', icon: SlidersHorizontal },
  { id: 'display', label: '游戏显示', icon: PanelsTopLeft },
  { id: 'network', label: '数据与网络', icon: Globe2 },
  { id: 'tools', label: '外部工具', icon: Wrench }
]
const themeOptions = [
  { label: '浅色', value: 'light', icon: Sun },
  { label: '深色', value: 'dark', icon: Moon },
  { label: '跟随系统', value: 'system', icon: Monitor }
] as const

const settingsStore = useSettingsStore()

// 与主进程 Settings 保持相同结构；默认值仅用于加载期间兜底。
const form = reactive<Settings>({ autoLaunch: false, theme: 'system', gameTitle: 'Local', subTitle: true, bangumiToken: '', magpiePath: '', magpieHotkey: '', proxy: { enabled: false, protocol: 'http', host: '', port: 7890 }, gameSortType: 'addedAt', gameSortOrder: 'asc', librarySeriesMode: false })
const loading = ref(true), showToken = ref(false), activeSection = ref('general')
const aliasError = ref(''), openingFile = ref(false)
// 主进程确保文件存在后交给系统默认程序打开；映射只影响之后新增或更新的角色数据。
async function openVoiceActorAliasesFile() {
  if (openingFile.value) return
  openingFile.value = true
  aliasError.value = ''
  try {
    await window.settingsAPI.openVoiceActorAliasesFile()
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    aliasError.value = message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '') || '打开声优马甲映射文件失败'
  } finally {
    openingFile.value = false
  }
}
// 页面打开时一次性读取设置；常规保存不显示额外提示。
onMounted(async () => {
  try {
    Object.assign(form, structuredClone(toRaw(await settingsStore.load())))
  } catch {
    console.error('设置读取失败')
  } finally {
    loading.value = false
  }
})
// 嵌套设置会被 Vue 包装为响应式 Proxy，先取原始值再克隆才能传过 IPC。
async function save(key: keyof Settings) {
  try {
    const value = structuredClone(toRaw(form[key]))
    await settingsStore.save(key, value)
  } catch {
    if (settingsStore.settings) Object.assign(form, { [key]: structuredClone(toRaw(settingsStore.settings[key])) })
    // 不记录设置值，避免 Token 等敏感信息进入日志。
    console.error('设置保存失败：', key)
  }
}
function setValue<K extends keyof Settings>(key: K, value: Settings[K]) { form[key] = value; save(key) }
// Proxy 是嵌套对象，任一字段变化后保存整个对象。
function saveProxy() { save('proxy') }
function blurInput(event: KeyboardEvent) { (event.target as HTMLInputElement).blur() }
</script>

<style scoped>
.settings-page {
  --accent: #3156b4;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 64px clamp(24px, 5vw, 80px) 0;
  overflow: hidden;
  background: #f7f8fb;
  color: #202c40;
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  font-size: 15px;
  -webkit-font-smoothing: antialiased;
}
.drag-region { position: absolute; inset: 0 138px auto 0; height: 52px; -webkit-app-region: drag; }
button, input, select { font: inherit; }
button { cursor: pointer; }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid #a7bcf1; outline-offset: 3px; }
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto 30px;
  padding-bottom: 26px;
  border-bottom: 1px solid #cdd5e2;
}
.page-header h1 { margin: 0; font-size: 28px; font-weight: 650; letter-spacing: -.04em; }
.settings-layout { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 44px; flex: 1; min-height: 0; width: 100%; max-width: 1120px; margin: 0 auto; }
.settings-nav { display: flex; flex-direction: column; gap: 5px; }
.settings-nav button { display: flex; align-items: center; gap: 11px; width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid transparent; border-radius: 10px; color: #45546b; background: transparent; text-align: left; transition: background .18s, color .18s; }
.settings-nav button:hover { background: #edf0f7; color: #4d5e7c; }
.settings-nav button.active { color: var(--accent); background: #eaf0fc; border-color: #b8c8eb; font-weight: 600; }
.nav-chevron { margin-left: auto; opacity: 0; }
.settings-nav button.active .nav-chevron { opacity: .7; }
/* 滚动仅作用于当前分组，不参与导航状态更新。 */
.settings-content { min-width: 0; min-height: 0; overflow: auto; padding: 0 10px 92px 0; scrollbar-width: thin; scrollbar-color: #d5dbe6 transparent; }
.setting-section { margin-bottom: 28px; }
.section-heading { display: flex; align-items: center; gap: 9px; margin: 2px 0 13px; color: #45608b; }
.section-heading h2 { margin: 0; font-size: 18px; font-weight: 600; color: #24344d; }
.setting-card { overflow: hidden; border: 1px solid #cdd5e2; border-radius: 15px; background: white; box-shadow: 0 3px 12px #32456603; }
.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; min-height: 76px; padding: 18px 22px; border-bottom: 1px solid #e0e5ed; }
.setting-row:last-child { border-bottom: 0; }
.setting-row.stacked { display: block; }
/* 行内容由本地子组件渲染，穿透作用域以保证表单宽度约束生效。 */
:deep(.setting-title) { font-size: 15px; line-height: 1.6; font-weight: 500; color: #26354b; }
:deep(.setting-control) { min-width: 0; flex-shrink: 0; max-width: 100%; }
:deep(.stacked .setting-control) { margin-top: 12px; width: 100%; }
.switch { position: relative; display: block; width: 38px; height: 22px; }
.switch input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; }
.switch span { position: absolute; inset: 0; border-radius: 20px; background: #8290a5; cursor: pointer; transition: background .2s; }
.switch span::before { content: ''; position: absolute; width: 16px; height: 16px; left: 3px; top: 3px; border-radius: 50%; background: white; box-shadow: 0 1px 4px #26354c20; transition: transform .2s; }
.switch input:checked + span { background: var(--accent); }
.switch input:checked + span::before { transform: translateX(16px); }
.switch input:focus-visible + span { outline: 3px solid #a7bcf1; outline-offset: 3px; }
.segmented { display: flex; gap: 3px; padding: 4px; border-radius: 9px; background: #e9edf4; }
.segmented button { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 11px; border: 0; border-radius: 6px; background: transparent; color: #46556c; font-size: 14px; white-space: nowrap; }
.segmented button:hover { color: #526b9d; }
.segmented button.active { background: var(--accent); color: white; box-shadow: 0 1px 5px #273e6310; font-weight: 600; }
.settings-page input:not([type=checkbox]), .settings-page select { min-width: 0; height: 42px; padding: 0 12px; border: 1px solid #9caac0; border-radius: 8px; background: #fafbfe; color: #24344d; font-size: 15px; transition: border-color .18s, box-shadow .18s; }
.settings-page input:not([type=checkbox]):focus, .settings-page select:focus { border-color: #4165bc; background: white; outline: none; box-shadow: 0 0 0 3px #edf2fd; }
.settings-page input:disabled, .settings-page select:disabled { cursor: not-allowed; }
.token-field { position: relative; width: 100%; }
.token-field input { width: 100%; padding-right: 44px !important; }
.token-field button { position: absolute; right: 5px; top: 6px; display: grid; place-items: center; width: 30px; height: 30px; border: 0; border-radius: 6px; background: transparent; color: #50627e; }
.token-field button:hover { background: #edf1fa; color: var(--accent); }
.proxy-grid { display: grid; grid-template-columns: 110px minmax(0, 1fr) 100px; gap: 12px; margin: 0 22px 20px; padding: 16px; border: 1px solid #d2dbea; border-radius: 10px; background: #f8faff; }
.proxy-grid label { display: flex; flex-direction: column; gap: 8px; min-width: 0; color: #45546b; font-size: 14px; font-weight: 500; }
.proxy-grid input, .proxy-grid select { width: 100%; background: white !important; }
.proxy-grid.disabled input, .proxy-grid.disabled select { background: #edf0f5 !important; color: #536078; border-color: #aeb9ca; }
.file-btn { min-height: 38px; padding: 0 14px; border: 1px solid #d7e1f5; border-radius: 8px; color: #4f72c4; background: #eef3fc; font-size: 14px; }
.file-btn:hover:not(:disabled) { background: #e2ebfb; }
.file-btn:disabled { opacity: .5; cursor: default; }
.alias-error { margin: 10px 2px 0; color: #c84d5a; font-size: 13px; }
.full-input { width: 100%; }
.hotkey-input { width: 220px; }
.loading-card { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 180px; color: #4c5d77; }
.loading-card .spinner { width: 16px; height: 16px; border: 2px solid #dbe2f0; border-top-color: #6289e5; border-radius: 50%; }
.spinner { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 900px) {
  .settings-layout { grid-template-columns: 150px minmax(0, 1fr); gap: 24px; }
  .setting-row { padding: 17px; gap: 12px; }
  .proxy-grid { grid-template-columns: 90px minmax(0, 1fr); margin-left: 17px; margin-right: 17px; }
  .proxy-grid label:last-child { grid-column: 1 / -1; }
  #general .setting-row:last-child { align-items: flex-start; flex-direction: column; }
}
@media (max-width: 620px) {
  .settings-page { padding: 64px 18px 84px; }
  .page-header { margin-bottom: 18px; padding-bottom: 19px; }
  .page-header h1 { font-size: 24px; }
  .settings-layout { display: flex; flex-direction: column; gap: 20px; }
  .settings-nav { flex-direction: row; flex-shrink: 0; gap: 4px; overflow-x: auto; }
  .nav-chevron { display: none; }
  .settings-nav button { justify-content: center; gap: 6px; width: auto; flex: 1 0 auto; min-height: 38px; padding: 8px; font-size: 14px; }
  .settings-nav button svg { width: 17px; flex-shrink: 0; }
  .settings-content { flex: 1; padding-right: 2px; padding-bottom: 24px; }
  /* 窄窗口为应用导航保留底部空间，避免悬浮按钮遮挡表单。 */
  :global(.app:has(.settings-page) .navigator) {
    flex-direction: row;
    left: 50%;
    bottom: 12px;
    transform: translateX(-50%);
  }
  .setting-row { min-height: 69px; }
  .proxy-grid { grid-template-columns: 1fr; }
  .hotkey-input { width: 160px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
</style>

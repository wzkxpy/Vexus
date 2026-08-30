<template>
  <main class="settings-page">
    <!-- 无边框窗口的顶部拖拽区域 -->
    <div class="drag-region" />
    <header class="page-header">
      <div>
        <p class="eyebrow">PREFERENCES</p>
        <h1>设置</h1>
      </div>
      <div class="save-state" :class="saveState"><span class="state-dot" />{{ saveStateText }}</div>
    </header>

    <div v-if="loading" class="loading-card"><span class="spinner" />正在载入设置…</div>
    <div v-else class="settings-layout">
      <!-- 设置分组导航：点击后滚动到对应区域 -->
      <nav class="settings-nav">
        <button v-for="section in sections" :key="section.id" :class="{ active: activeSection === section.id }"
          @click="scrollToSection(section.id)">
          <span class="nav-icon">{{ section.icon }}</span>{{ section.label }}
        </button>
      </nav>

      <div ref="contentRef" class="settings-content" @scroll="updateActiveSection">
        <!-- 常规设置 -->
        <section id="general" class="setting-section">
          <SectionTitle icon="⌁" title="常规" />
          <div class="setting-card">
            <SettingRow title="开机自启">
              <label class="switch"><input v-model="form.autoLaunch" type="checkbox"
                  @change="save('autoLaunch')"><span /></label>
            </SettingRow>
            <SettingRow title="界面主题">
              <div class="segmented">
                <button v-for="item in themeOptions" :key="item.value" :class="{ active: form.theme === item.value }"
                  @click="setValue('theme', item.value)">{{ item.label }}</button>
              </div>
            </SettingRow>
          </div>
        </section>

        <!-- 游戏标题显示偏好 -->
        <section id="display" class="setting-section">
          <SectionTitle icon="▣" title="游戏显示" />
          <div class="setting-card">
            <SettingRow title="优先显示标题">
              <div class="segmented"><button :class="{ active: form.gameTitle === 'Local' }"
                  @click="setValue('gameTitle', 'Local')">译名</button><button
                  :class="{ active: form.gameTitle === 'Orig' }" @click="setValue('gameTitle', 'Orig')">原名</button>
              </div>
            </SettingRow>
            <SettingRow title="区分主副标题">
              <label class="switch"><input v-model="form.subTitle" type="checkbox"
                  @change="save('subTitle')"><span /></label>
            </SettingRow>
          </div>
        </section>

        <!-- Bangumi 凭据及请求代理 -->
        <section id="network" class="setting-section">
          <SectionTitle icon="◎" title="数据与网络" />
          <div class="setting-card">
            <SettingRow title="Bangumi Access Token">
              <div class="token-field"><input v-model="form.bangumiToken" :type="showToken ? 'text' : 'password'"
                  placeholder="输入 Access Token" @blur="save('bangumiToken')" @keydown.enter="blurInput"><button
                  @click="showToken = !showToken">{{ showToken ? '隐藏' : '显示' }}</button></div>
            </SettingRow>
            <SettingRow title="使用代理">
              <label class="switch"><input v-model="form.proxy.enabled" type="checkbox"
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
                  placeholder="127.0.0.1" @blur="saveProxy"></label>
              <label><span>端口</span><input v-model.number="form.proxy.port" :disabled="!form.proxy.enabled"
                  type="number" min="1" max="65535" placeholder="7890" @blur="saveProxy"></label>
            </div>
          </div>
        </section>

        <!-- 第三方辅助工具配置 -->
        <section id="tools" class="setting-section">
          <SectionTitle icon="◇" title="外部工具" />
          <div class="setting-card">
            <SettingRow title="Magpie 程序路径"><input
                v-model.trim="form.magpiePath" class="full-input"
                @blur="save('magpiePath')" @keydown.enter="blurInput"></SettingRow>
            <SettingRow title="Magpie 快捷键"><input v-model.trim="form.magpieHotkey"
                class="hotkey-input" placeholder="例如：Win + Shift + A" @blur="save('magpieHotkey')"
                @keydown.enter="blurInput"></SettingRow>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import type { Settings } from '@/main/settings'

// 页面内复用的“标题 + 控件”设置行。
const SettingRow = defineComponent({
  props: { title: String, stacked: Boolean },
  setup: (props, { slots }) => () => h('div', { class: ['setting-row', { stacked: props.stacked }] }, [h('span', { class: 'setting-title' }, props.title), h('div', { class: 'setting-control' }, slots.default?.())])
})
// 每个设置分组共用的标题结构。
const SectionTitle = defineComponent({
  props: { icon: String, title: String },
  setup: props => () => h('div', { class: 'section-heading' }, [h('span', { class: 'section-icon' }, props.icon), h('h2', props.title)])
})

// 左侧导航与主题选项。
const sections = [{ id: 'general', label: '常规', icon: '⌁' }, { id: 'display', label: '游戏显示', icon: '▣' }, { id: 'network', label: '数据与网络', icon: '◎' }, { id: 'tools', label: '外部工具', icon: '◇' }]
const themeOptions = [{ label: '浅色', value: 'light' }, { label: '深色', value: 'dark' }, { label: '跟随系统', value: 'system' }] as const

// 与主进程 Settings 保持相同结构；默认值仅用于加载期间兜底。
const form = reactive<Settings>({ autoLaunch: false, theme: 'system', gameTitle: 'Local', subTitle: true, bangumiToken: '', magpiePath: '', magpieHotkey: '', proxy: { enabled: false, protocol: 'http', host: '', port: 7890 }, gameSortType: 'addTime', gameSortOrder: 'asc' })
const loading = ref(true), showToken = ref(false), activeSection = ref('general'), contentRef = ref<HTMLElement | null>(null)
// 保存状态驱动页面右上角的反馈提示。
const saveState = ref<'saved' | 'saving' | 'error'>('saved')
const saveStateText = computed(() => ({ saved: '所有更改已保存', saving: '正在保存…', error: '保存失败' })[saveState.value])
let stateTimer: ReturnType<typeof setTimeout> | undefined

// 页面打开时一次性读取 electron-store 中的全部设置。
onMounted(async () => { try { Object.assign(form, await window.settingsAPI.getSettings()) } catch { saveState.value = 'error' } finally { loading.value = false } })
// 单项自动保存；克隆后可安全地通过 Electron IPC 传递。
async function save(key: keyof Settings) { saveState.value = 'saving'; if (stateTimer) clearTimeout(stateTimer); try { await window.settingsAPI.setSetting(key, structuredClone(form[key])); stateTimer = setTimeout(() => saveState.value = 'saved', 350) } catch { saveState.value = 'error' } }
function setValue<K extends keyof Settings>(key: K, value: Settings[K]) { form[key] = value; save(key) }
// Proxy 是嵌套对象，任一字段变化后保存整个对象。
function saveProxy() { save('proxy') }
function blurInput(event: KeyboardEvent) { (event.target as HTMLInputElement).blur() }
// 导航点击负责滚动；内容滚动时同步左侧高亮项。
function scrollToSection(id: string) { activeSection.value = id; document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
function updateActiveSection() { const root = contentRef.value; if (!root) return; const top = root.getBoundingClientRect().top + 70; let current = sections[0].id; for (const section of sections) { const el = document.getElementById(section.id); if (el && el.getBoundingClientRect().top <= top) current = section.id } activeSection.value = current }
</script>

<style scoped>
/* ===== 页面骨架 =====
 * 页面本身不滚动，右侧 .settings-content 单独负责内容滚动。
 */
.settings-page {
  height: 100%;
  padding: 60px 44px 0;
  color: #202636;
  background: radial-gradient(circle at 80% 0, rgba(115, 156, 255, .13), transparent 30%), #f5f7fb;
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  overflow: hidden
}

.drag-region {
  position: absolute;
  inset: 0 138px auto 0;
  height: 52px;
  -webkit-app-region: drag
}

/* ===== 页面标题与保存状态 ===== */
.page-header {
  height: 88px;
  max-width: 1080px;
  margin: auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between
}

.eyebrow {
  margin: 0 0 4px;
  color: #6689de;
  font-size: 9px;
  font-weight: 650;
  letter-spacing: .14em
}

.page-header h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -.02em
}

.subtitle {
  margin: 0;
  color: #8790a2;
  font-size: 13px
}

.save-state {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 6px;
  padding: 6px 10px;
  border: 1px solid #e6e9f0;
  border-radius: 999px;
  background: rgba(255, 255, 255, .75);
  color: #7c8596;
  font-size: 12px
}

.state-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #66ba8a;
  box-shadow: 0 0 0 3px #e2f4e9
}

.save-state.saving .state-dot {
  background: #efb451;
  box-shadow: 0 0 0 3px #fff1d8
}

.save-state.error .state-dot {
  background: #e86e77;
  box-shadow: 0 0 0 3px #fde5e7
}

/* ===== 左侧导航 + 右侧内容的双栏布局 =====
 * minmax(0, 1fr) 防止右侧表单内容撑破网格。
 */
.settings-layout {
  height: calc(100% - 88px);
  max-width: 1080px;
  margin: auto;
  display: grid;
  grid-template-columns: 184px minmax(0, 1fr);
  gap: 28px
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 3px
}

.settings-nav button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #737d90;
  font-size: 13px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  transition: .18s
}

.settings-nav button:hover {
  background: rgba(255, 255, 255, .65);
  color: #3f4b61
}

.settings-nav button.active {
  background: #fff;
  color: #4e78db;
  font-weight: 550;
  box-shadow: 0 4px 14px rgba(67, 79, 112, .07)
}

.nav-icon {
  width: 18px;
  text-align: center;
  color: #7190d9
}

/* 只有右侧设置内容滚动，标题和左侧导航保持固定。 */
.settings-content {
  height: 100%;
  overflow: auto;
  padding: 2px 12px 70px 2px;
  scrollbar-width: thin;
  scrollbar-color: #cdd3df transparent
}

.setting-section {
  scroll-margin-top: 15px;
  margin-bottom: 28px
}

/* ===== 设置分组标题 ===== */
.section-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 9px
}

.section-icon {
  display: grid;
  place-items: center;
  width: 31px;
  height: 31px;
  border-radius: 9px;
  background: #e8efff;
  color: #5c83de;
  font-size: 15px
}

/* h2 位于运行时创建的 SectionTitle 子组件内，需用 :deep 穿透 scoped 边界。 */
:deep(.section-heading h2) {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: .01em;
  margin: 0;
}

/* ===== 设置卡片与设置项 ===== */
.setting-card {
  border: 1px solid #e7eaf0;
  border-radius: 12px;
  background: rgba(255, 255, 255, .92);
  box-shadow: 0 5px 18px rgba(56, 65, 90, .04);
  overflow: hidden
}

.setting-row {
  min-height: 50px;
  padding: 9px 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1px solid #edf0f4
}

.setting-row:last-child {
  border-bottom: 0
}

.setting-row.stacked {
  display: block
}

/* 设置项标题使用普通 span，不携带标题标签的默认语义和复制格式。 */
:deep(.setting-title) {
  margin: 0;
  font-size: 13px;
  font-weight: 450;
  line-height: 1.45;
  letter-spacing: .005em;
  color: #303749;
}

.setting-control {
  flex-shrink: 0
}

.setting-row.stacked .setting-control {
  margin-top: 8px;
  width: 100%
}

/* ===== 开关控件 =====
 * 隐藏原生 checkbox，由 span 和伪元素绘制轨道与圆点。
 */
.switch {
  position: relative;
  display: block;
  width: 42px;
  height: 23px
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0
}

.switch span {
  position: absolute;
  inset: 0;
  border-radius: 20px;
  background: #dce1e9;
  cursor: pointer;
  transition: .2s
}

.switch span:before {
  content: "";
  position: absolute;
  width: 17px;
  height: 17px;
  left: 3px;
  top: 3px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 5px #9aa3b2;
  transition: .2s
}

.switch input:checked+span {
  background: #648be7
}

.switch input:checked+span:before {
  transform: translateX(19px)
}

/* ===== 多选一的分段按钮 ===== */
.segmented {
  display: flex;
  padding: 3px;
  background: #f0f2f6;
  border-radius: 9px
}

.segmented button {
  padding: 5px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #818a9a;
  font-size: 12px;
  cursor: pointer
}

.segmented button.active {
  background: white;
  color: #456dcc;
  font-weight: 550;
  box-shadow: 0 1px 5px rgba(60, 70, 95, .1)
}

.inline-fields {
  display: flex;
  gap: 8px
}

/* ===== 输入框与下拉框的通用外观 ===== */
.settings-page select,
.settings-page input {
  border: 1px solid #dfe3eb;
  border-radius: 8px;
  background: #f9fafc;
  color: #40485a;
  font: inherit;
  font-size: 12px;
  outline: none;
  transition: .18s
}

.settings-page select {
  height: 33px;
  padding: 0 28px 0 10px
}

.settings-page input {
  height: 35px;
  padding: 0 11px
}

.settings-page input:focus,
.settings-page select:focus {
  border-color: #86a4ea;
  box-shadow: 0 0 0 3px #edf2ff;
  background: white
}

.order-button {
  padding: 0 11px;
  border: 1px solid #dfe3eb;
  border-radius: 8px;
  background: white;
  color: #5e687a;
  font-size: 11px;
  cursor: pointer
}

/* Token 的显示/隐藏按钮叠放在输入框右侧。 */
.token-field {
  position: relative;
  width: min(480px, 48vw)
}

.token-field input {
  width: 100%;
  padding-right: 55px
}

.token-field button {
  position: absolute;
  right: 5px;
  top: 5px;
  height: 25px;
  border: 0;
  border-radius: 6px;
  background: #edf2fc;
  color: #5879c7;
  font-size: 10px;
  cursor: pointer
}

/* ===== 代理配置 =====
 * 默认按“协议 / 主机 / 端口”三列排列，禁用时整体降低透明度。
 */
.proxy-grid {
  display: grid;
  grid-template-columns: 120px 1fr 130px;
  gap: 12px;
  padding: 12px 15px;
  background: #fafbfc;
  transition: .2s
}

.proxy-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #848d9d;
  font-size: 11px
}

.proxy-grid input,
.proxy-grid select {
  width: 100%
}

.proxy-grid.disabled {
  opacity: .48
}

.full-input {
  width: min(480px, 48vw)
}

.hotkey-input {
  width: 180px
}

/* ===== 初次读取设置时的加载状态 ===== */
.loading-card {
  height: 170px;
  max-width: 1080px;
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid #e7eaf0;
  border-radius: 14px;
  background: white;
  color: #8790a2;
  font-size: 12px
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #dbe2f0;
  border-top-color: #6289e5;
  border-radius: 50%;
  animation: spin .7s linear infinite
}

@keyframes spin {
  to {
    transform: rotate(360deg)
  }
}

/* ===== 窄窗口适配 =====
 * 缩窄导航，代理表单及设置项改为纵向排列。
 */
@media(max-width:800px) {
  .settings-page {
    padding-left: 25px;
    padding-right: 25px
  }

  .settings-layout {
    grid-template-columns: 145px 1fr
  }

  .proxy-grid {
    grid-template-columns: 1fr
  }

  .setting-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px
  }

  .setting-control {
    width: 100%
  }

  .hotkey-input {
    width: 100%
  }

  .token-field,
  .full-input {
    width: 100%
  }
}
</style>

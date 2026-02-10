import { createApp } from 'vue'
import App from './App.vue'
import './index.css'
import router from './router'
import { createPinia } from 'pinia'

createApp(App)
  .use(router)  // 注册路由，用于页面导航
  .use(createPinia()) // 注册 Pinia，用于状态管理
  .mount('#app') // 挂载 Vue 应用到 HTML 中的 #app 元素
  
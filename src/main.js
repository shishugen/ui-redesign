import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd, { message } from 'ant-design-vue'
import {
  UserOutlined, LockOutlined, SecurityScanOutlined, DownOutlined,
  ReloadOutlined, ArrowRightOutlined, PlusOutlined, DeleteOutlined, SearchOutlined
} from '@ant-design/icons-vue'
import 'ant-design-vue/dist/reset.css'
// 分片上传组件（UploadChunk）与视频播放器（VideoPlay）依赖的全局插件
// 版本与 ui/package.json 一致：vue-simple-uploader 1.0.3 / longze-vue3-video-player 1.1.7
import uploader from 'vue-simple-uploader'
import 'vue-simple-uploader/dist/style.css'
import longzeVideoPlay from 'longze-vue3-video-player'

import '@/styles/design-system.scss'
import '@/styles/antd-override.scss'

import App from './App.vue'
import router from './router'
import { t } from './i18n'

const app = createApp(App)

// 模板里可直接用 $t('中文')；<script setup> 里用 import { t } from '@/i18n'
app.config.globalProperties.$t = t

app.use(createPinia())
app.use(Antd)
app.use(uploader)
app.use(longzeVideoPlay)

// 只注册模板里实际用到的图标，避免把整个图标库打进主包
const icons = {
  UserOutlined, LockOutlined, SecurityScanOutlined, DownOutlined,
  ReloadOutlined, ArrowRightOutlined, PlusOutlined, DeleteOutlined, SearchOutlined
}
Object.entries(icons).forEach(([name, comp]) => app.component(name, comp))

// 消息提示下移到顶栏(60px)之下，避免遮挡内容
message.config({ top: 76, duration: 2, maxCount: 3 })

app.use(router)
app.mount('#app')

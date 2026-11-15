<template>
  <a-spin :spinning="loading" :tip="t('正在加载中...')">
    <div id="preview" class="fp" :style="{ height: realHeight + 'px' }">
      <a-button v-if="filePath" class="fp__full" :title="t('全屏预览')" :aria-label="t('全屏预览')"
                @click="toggleFullscreen">
        <template #icon><FullscreenOutlined /></template>
      </a-button>

      <template v-if="Array.isArray(filePaths) && filePaths.length">
        <div v-for="(urlItem, idx) in filePaths" :key="idx" class="fp__item">
          <iframe :src="getPreviewUrl(urlItem)" class="fp__iframe" scrolling="auto"
                  :title="t('附件预览 {n}', { n: idx + 1 })"
                  @load="onIframeLoad" @error="onError" />
        </div>
      </template>

      <div v-else-if="filePath && !kkPrefix" class="fp__empty" role="status">
        <div class="fp__empty-t">{{ t('预览服务地址未配置') }}</div>
        <div class="fp__empty-d">{{ t('缺少系统参数 sys.kkfileview.url，暂时无法预览该附件。') }}</div>
      </div>

      <iframe v-else-if="filePath" :src="getPreviewUrl(filePath)" ref="iframeEl" class="fp__iframe"
              scrolling="auto" :title="t('文件预览')" @load="onIframeLoad" @error="onError" />
    </div>
  </a-spin>
</template>

<script setup name="FilePreview">
import { ref, onMounted, onUnmounted } from 'vue'
import { FullscreenOutlined } from '@ant-design/icons-vue'
import { Base64 } from 'js-base64'
import { getConfigKey } from '@/api/system/config'
import { t } from '@/i18n'

const props = defineProps({
  // 单文件预览 path
  filePath: { type: String, default: '' },
  // 多文件预览
  filePaths: { type: Array, default: null },
  // 高度比例
  ratio: { type: Number, default: 0.8 }
})

const realHeight = ref(window.innerHeight * props.ratio)
const kkPrefix = ref('') // kkfileView 链接
const fdfsPrefix = ref('') // fdfs 前缀
const loading = ref(false)
const iframeEl = ref(null)
const isFullscreen = ref(false)

function getPreviewUrl(filePath) {
  if (!kkPrefix.value) return ''
  const fileUrl = fdfsPrefix.value + filePath
  return kkPrefix.value + '/onlinePreview?url=' + encodeURIComponent(Base64.encode(fileUrl))
}

function onIframeLoad() {
  // iframe 加载完成后再留 1s，避免预览服务内部还在渲染
  setTimeout(() => { loading.value = false }, 1000)
}
function onError() { loading.value = false }

async function initConfig() {
  loading.value = true
  try {
    const kk = await getConfigKey('sys.kkfileview.url')
    if (kk?.msg) kkPrefix.value = kk.msg.endsWith('/') ? kk.msg.slice(0, -1) : kk.msg
  } catch (e) { /* 取不到则不拼预览地址，走空态说明 */ }
  try {
    const fdfs = await getConfigKey('sys.fdfsurl.url')
    if (fdfs?.msg) fdfsPrefix.value = fdfs.msg.endsWith('/') ? fdfs.msg : fdfs.msg + '/'
  } catch (e) { /* 同上 */ }
  if (!kkPrefix.value) loading.value = false
}

function updateHeight() { realHeight.value = window.innerHeight * props.ratio }

function toggleFullscreen() {
  if (!iframeEl.value) return
  isFullscreen.value ? exitFullscreen() : enterFullscreen()
}
function enterFullscreen() {
  const el = iframeEl.value
  const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen
  if (fn) fn.call(el)
}
function exitFullscreen() {
  const fn = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen
  if (fn) fn.call(document)
}
function handleFullscreenChange() {
  isFullscreen.value = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement)
}

onMounted(() => {
  initConfig()
  window.addEventListener('resize', updateHeight)
  updateHeight()
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.addEventListener('mozfullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateHeight)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
})
</script>

<style scoped>
.fp { position: relative; width: 100%; }
.fp__full {
  position: absolute; right: 30px; top: 8px; z-index: 5;
  background: var(--panel); border-color: var(--line-2);
}
.fp__item { margin-bottom: 16px; }
.fp__iframe {
  width: 100%; min-height: 100%; border: 0; display: block;
  background: var(--panel);
}
.fp__empty {
  height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; padding: 40px 16px; text-align: center;
  border: 1px dashed var(--line-2); border-radius: var(--r); background: var(--bg-soft);
}
.fp__empty-t { font-size: 13px; font-weight: 600; color: var(--ink-2); }
.fp__empty-d { font-size: 12px; color: var(--ink-4); }
</style>

<template>
  <div class="portal">
    <header class="portal__bar">
      <div class="portal__brand">
        <span class="portal__dot" />
        <span>{{ t(portal.title || '人工智能大语言模型项目实践平台') }}</span>
      </div>
      <div class="portal__right"><LocaleSwitch />
      <router-link to="/login" class="portal__entry">{{ t('进入平台') }}</router-link></div>
    </header>

    <div v-if="loading" class="portal__loading">
      <div class="portal__skel portal__skel--a" />
      <div class="portal__skel portal__skel--b" />
      <p>{{ t('正在加载系统资源，请耐心等待......') }}</p>
    </div>

    <div v-else-if="error" class="portal__state">
      <a-empty :description="t(error)" />
      <div class="portal__acts">
        <a-button @click="load">{{ t('重试') }}</a-button>
        <router-link to="/index"><a-button type="primary">{{ t('进入首页') }}</a-button></router-link>
      </div>
    </div>

    <main v-else class="portal__main" :style="{ minHeight: contentHeight + 'px' }">
      <div v-if="portal.content" class="portal__content" v-html="portal.content" />
      <a-empty v-else :description="t('门户尚未配置内容')" />
    </main>

    <footer v-if="!loading && !error && portal.footerContent" class="portal__footer" v-html="portal.footerContent" />
  </div>
</template>

<script setup>
import LocaleSwitch from '@/components/LocaleSwitch.vue'
import { t } from '@/i18n'
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getConfigKey } from '@/api/system/config'
import { getLast } from '@/api/system/portal.js'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const portal = ref({ id: '', logo: '', title: '', content: '', footerContent: '', type: '' })
const contentHeight = ref(0)
const previewHeight = ref(0)

function handleResize() {
  contentHeight.value = document.documentElement.clientHeight - 140
  previewHeight.value = document.documentElement.clientHeight
}

// 与旧页一致：先查 sys.portal.enabled，开启才拉门户配置；未开启直接进 /index
async function load() {
  loading.value = true
  error.value = ''
  try {
    const cfg = await getConfigKey('sys.portal.enabled')
    if (!cfg || cfg.msg !== 'true') {
      router.push({ path: '/index' })
      return
    }
    const res = await getLast()
    portal.value = res.data || {}
  } catch (e) {
    error.value = t('门户内容加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
  load()
})
onUnmounted(() => window.removeEventListener('resize', handleResize))
</script>

<style scoped>
.portal { min-height: 100vh; background: var(--bg); }
.portal__bar {
  height: 60px; padding: 0 28px; display: flex; align-items: center; justify-content: space-between;
  background: var(--panel); border-bottom: 1px solid var(--line);
}
.portal__brand { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; color: var(--ink); }
.portal__dot { width: 10px; height: 10px; border-radius: 3px; background: var(--pri); }
.portal__entry { font-size: 13px; color: var(--pri); text-decoration: none; }
.portal__right { display: flex; align-items: center; gap: 12px; }
.portal__loading { padding: 72px 32px; text-align: center; }
.portal__skel { margin: 0 auto 16px; border-radius: var(--r); background: var(--line-3); }
.portal__skel--a { width: min(720px, 100%); height: 180px; }
.portal__skel--b { width: min(520px, 100%); height: 64px; }
.portal__loading p { font-size: 13px; color: var(--ink-4); }
.portal__state { padding: 80px 32px; text-align: center; }
.portal__acts { display: flex; gap: 10px; justify-content: center; margin-top: 20px; }
.portal__main {
  max-width: 1120px; margin: 24px auto; padding: 32px;
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg);
}
/* D7（已拍板）：容器换肤、内容不动。下面只做「防溢出 / 基础间距」兜底，
   不覆盖后台 HTML 的内联样式、类名与配色，也不注入标题、表格、按钮等排版规则。 */
.portal__content { font-size: 13px; line-height: 1.8; color: var(--ink-2); overflow-x: auto; }
.portal__content :deep(img) { max-width: 100%; height: auto; }
.portal__content :deep(p) { margin-bottom: 8px; }
.portal__footer {
  max-width: 1120px; margin: 0 auto 32px; padding: 16px 32px; text-align: center;
  font-size: 12px; color: var(--ink-4); overflow-x: auto;
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--r);
}
.portal__footer :deep(img) { max-width: 100%; height: auto; }
.portal__footer :deep(p) { margin-bottom: 6px; }
</style>

<template>
  <div class="iframe" :style="{ height: height + 'px' }">
    <LocaleSwitch fixed />
    <iframe
      v-if="iframeUrl"
      class="iframe__frame"
      :src="iframeUrl"
      frameborder="no"
      :title="t('内嵌页面')"
    />
    <section v-else class="iframe__empty">
      <a-empty :description="t('暂无链接参数')" />
      <p>{{ t('请在地址中带上') }} <code>?url=</code> {{ t('参数后再打开。') }}</p>
    </section>
  </div>
</template>

<script setup>
import LocaleSwitch from '@/components/LocaleSwitch.vue'
import { t } from '@/i18n'
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const iframeUrl = ref('')
if (route.query && route.query.url) iframeUrl.value = route.query.url

const height = ref(document.documentElement.clientHeight)
</script>

<style scoped>
.iframe { width: 100%; overflow-y: hidden; background: var(--bg); }
.iframe__frame { width: 100%; height: 100%; border: 0; display: block; }
.iframe__empty {
  height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.iframe__empty p { margin-top: 12px; font-size: 13px; color: var(--ink-4); }
.iframe__empty code { font-family: var(--mono); color: var(--pri); }
</style>

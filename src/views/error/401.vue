<template>
  <div class="err">
    <LocaleSwitch fixed />
    <section class="err__card">
      <div class="err__figure" aria-hidden="true">
        <div class="err__code">401</div>
        <div class="err__rule" />
        <div class="err__label">ACCESS DENIED</div>
      </div>
      <div class="err__body">
        <span class="err__tag">{{ t('访问权限') }}</span>
        <h1>{{ t('您没有访问权限！') }}</h1>
        <p>{{ t('对不起，您没有访问权限，请不要进行非法操作！您可以返回主页面。') }}</p>
        <div class="err__acts">
          <a-button type="primary" @click="back">{{ t('返回') }}</a-button>
          <router-link to="/index"><a-button>{{ t('回首页') }}</a-button></router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import LocaleSwitch from '@/components/LocaleSwitch.vue'
import { t } from '@/i18n'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 与旧页一致：带 noGoBack 时直接回首页，否则退回上一页
function back() {
  if (route.query.noGoBack) router.push({ path: '/' })
  else router.go(-1)
}
</script>

<style scoped>
.err { min-height: 100vh; display: grid; place-items: center; padding: 32px; background: var(--bg); }
.err__card {
  width: min(760px, 100%); display: grid; grid-template-columns: 260px minmax(0, 1fr);
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg);
  box-shadow: var(--sh-2); overflow: hidden;
}
.err__figure {
  background: var(--pri-50); border-right: 1px solid var(--line);
  padding: 44px 28px; display: flex; flex-direction: column; justify-content: center;
}
.err__code { font: 500 64px/1 var(--mono); color: var(--pri); letter-spacing: -2px; }
.err__rule { width: 48px; height: 3px; background: var(--pri); border-radius: 2px; margin: 20px 0 12px; }
.err__label { font: 400 11px/1.4 var(--mono); color: var(--ink-4); letter-spacing: 1.5px; }
.err__body { padding: 44px 40px; }
.err__tag {
  display: inline-block; padding: 3px 10px; border-radius: 999px;
  background: var(--warn-soft); color: var(--warn); border: 1px solid var(--warn-line); font-size: 12px;
}
.err__body h1 { margin: 16px 0 10px; font-size: 24px; font-weight: 500; color: var(--ink); }
.err__body p { margin: 0; font-size: 13px; line-height: 1.8; color: var(--ink-3); }
.err__acts { display: flex; gap: 10px; margin-top: 28px; }
@media (max-width: 680px) {
  .err__card { grid-template-columns: 1fr; }
  .err__figure { border-right: 0; border-bottom: 1px solid var(--line); padding: 28px; }
  .err__body { padding: 28px; }
}
</style>

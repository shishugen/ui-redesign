<template>
  <div class="err">
    <LocaleSwitch fixed />
    <section class="err__card">
      <div class="err__figure" aria-hidden="true">
        <div class="err__code">404</div>
        <div class="err__rule" />
        <div class="err__label">PAGE NOT FOUND</div>
      </div>
      <div class="err__body">
        <span class="err__tag">{{ t('页面不存在') }}</span>
        <h1>{{ message }}</h1>
        <p>{{ t('对不起，您正在寻找的页面不存在。请检查网址是否正确，或刷新后重试，也可以返回首页继续访问。') }}</p>
        <div class="err__acts">
          <router-link to="/index"><a-button type="primary">{{ t('返回首页') }}</a-button></router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import LocaleSwitch from '@/components/LocaleSwitch.vue'
import { t } from '@/i18n'
import { computed } from 'vue'

// 旧页同款文案（computed 保留，便于以后按路由参数扩展）
const message = computed(() => t('找不到网页！'))
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
  background: var(--pri-50); color: var(--pri); border: 1px solid var(--pri-200); font-size: 12px;
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

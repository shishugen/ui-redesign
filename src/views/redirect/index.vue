<template>
  <div class="rd">
    <LocaleSwitch fixed />
    <section class="rd__card">
      <a-empty :description="t('路由暂未定义')" />
      <p class="rd__hint">{{ t('该重定向地址没有对应的页面，请从顶部菜单重新进入。') }}</p>
    </section>
  </div>
</template>

<script setup>
import LocaleSwitch from '@/components/LocaleSwitch.vue'
import { t } from '@/i18n'
</script>

<style scoped>
.rd { min-height: 100vh; display: grid; place-items: center; padding: 32px; background: var(--bg); }
.rd__card {
  width: min(480px, 100%); padding: 56px 32px; text-align: center;
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg);
  box-shadow: var(--sh-2);
}
.rd__hint { margin: 16px 0 0; font-size: 13px; color: var(--ink-4); }
</style>

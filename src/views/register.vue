<template>
  <div class="reg">
    <LocaleSwitch fixed />
    <section class="reg__card">
      <div class="reg__mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <rect x="4" y="7" width="32" height="26" rx="6" stroke="currentColor" stroke-width="1.6" />
          <path d="M12 17h16M12 23h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
      </div>
      <span class="reg__tag">{{ t('账户') }}</span>
      <h1>{{ t('注册功能正在待定......') }}</h1>
      <p>{{ t('当前平台账号由管理员统一创建。如需开通，请联系所在班级的任课教师或系统管理员。') }}</p>
      <router-link to="/login"><a-button type="primary">{{ t('返回登录') }}</a-button></router-link>
    </section>
  </div>
</template>

<script setup>
import LocaleSwitch from '@/components/LocaleSwitch.vue'
import { t } from '@/i18n'
</script>

<style scoped>
.reg { min-height: 100vh; display: grid; place-items: center; padding: 32px; background: var(--bg); }
.reg__card {
  width: min(440px, 100%); padding: 40px; text-align: center;
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg);
  box-shadow: var(--sh-2);
}
.reg__mark {
  width: 64px; height: 64px; margin: 0 auto 22px; display: grid; place-items: center;
  border-radius: var(--r); background: var(--pri-50); color: var(--pri);
}
.reg__mark svg { width: 40px; height: 40px; }
.reg__tag {
  display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px;
  background: var(--bg-soft); color: var(--ink-3); border: 1px solid var(--line);
}
.reg__card h1 { margin: 16px 0 10px; font-size: 20px; font-weight: 500; color: var(--ink); }
.reg__card p { margin: 0 0 26px; font-size: 13px; line-height: 1.8; color: var(--ink-3); }
</style>

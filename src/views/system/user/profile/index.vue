<template>
  <div class="page page-in">
    <PageHead :crumb="[t('个人中心')]" :title="t('个人中心')" :sub="t('查看与维护当前登录账号的资料、密码和头像。')">
      <template #acts>
        <a-button @click="router.push('/index')">{{ t('返回首页') }}</a-button>
      </template>
    </PageHead>

    <div class="pf">
      <aside class="pf__nav">
        <div class="pf__nav-hd">{{ t('账号设置') }}</div>
        <button class="pf__nav-i on" @click="active = 'profile'">
          <UserOutlined class="pf__ico" /><span>{{ t('个人信息') }}</span>
        </button>
      </aside>
      <section class="pf__body"><ProfileDetail v-if="active === 'profile'" /></section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { UserOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import PageHead from '@/components/PageHead.vue'
import ProfileDetail from './profile.vue'

const router = useRouter()
const active = ref('profile')
</script>

<style scoped>
.pf { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 16px; align-items: start; }
.pf__nav {
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg);
  box-shadow: var(--sh-1); padding: 8px; display: flex; flex-direction: column; min-height: 440px;
}
.pf__nav-hd { font-size: 11.5px; color: var(--ink-4); padding: 8px 10px 10px; }
.pf__nav-i {
  display: flex; align-items: center; gap: 9px; height: 38px; padding: 0 11px;
  border: 0; border-radius: var(--r-sm); background: transparent; color: var(--ink-2);
  font-size: 13px; text-align: left; cursor: pointer;
}
.pf__nav-i.on { background: var(--pri-50); color: var(--pri); font-weight: 600; }
.pf__ico { font-size: 14px; }
.pf__nav-ft {
  margin-top: auto; padding: 12px 10px 6px; border-top: 1px solid var(--line-3);
  font-size: 11px; line-height: 1.8; color: var(--ink-4);
}
.pf__body { min-width: 0; }
@media (max-width: 900px) {
  .pf { grid-template-columns: 1fr; }
  .pf__nav { min-height: 0; }
  .pf__nav-hd, .pf__nav-ft { display: none; }
}
</style>

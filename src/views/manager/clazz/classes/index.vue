<template>
  <div class="cc">
    <div class="cc__meta">
      <span class="cc__dot" :class="session.isLogged ? 'ok' : 'off'" />
      <span>{{ session.isLogged ? t('已登录 · {role}', { role: session.roleLabel }) : t('未登录 · 只读预览') }}</span>
      <span class="cc__sep">/</span>
      <span>{{ t('当前视图') }}：{{ isTeacherView ? t('教师班级视图') : t('管理员班级视图') }}</span>
    </div>
    <component :is="isTeacherView ? TeacherClasses : AdminClasses" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { t } from '@/i18n'
import { useSessionStore } from '@/stores/session'
import AdminClasses from './components/adminClasses.vue'
import TeacherClasses from './components/teacherClasses.vue'

// 旧页 classes/index.vue 用 isAdmin() / isTeacher() 切换两个角色组件；
// 这里按 D2 决议改为读 session，角色口径与 session.role 一致。
const session = useSessionStore()
const isTeacherView = computed(() => session.role === 'teacher')
</script>

<style scoped>
.cc {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--sh-1);
  padding: 16px;
}
.cc__meta {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 12px; color: var(--ink-3); padding: 0 4px 14px;
}
.cc__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ink-4); }
.cc__dot.ok { background: #16a34a; }
.cc__sep { color: var(--line-2); }
</style>

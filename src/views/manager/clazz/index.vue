<template>
  <div class="page page-in">
    <PageHead
      :crumb="[t('教务'), t('班级管理')]"
      :title="t('师生与班级')"
      :sub="t('学生管理、教师管理、班级管理三个子页。数据全部来自后端接口，写操作由后端鉴权。')"
    >
      <template #acts>
        <a-button @click="router.push('/index')">{{ t('返回首页') }}</a-button>
      </template>
    </PageHead>

    <div v-if="!session.isLogged" class="guard">
      <a-empty :description="t('登录后按账号权限显示菜单与数据')" />
      <a-button type="primary" @click="goLogin">{{ t('去登录') }}</a-button>
    </div>

    <div v-else class="cz">
      <aside class="cz__nav">
        <div class="cz__nav-hd">{{ t('组织管理') }}</div>
        <button
          v-for="m in visibleModules" :key="m.key"
          class="cz__nav-i" :class="{ on: active === m.key }"
          @click="active = m.key"
        >
          <component :is="m.icon" class="cz__ico" />
          <span>{{ t(m.label) }}</span>
          <span v-if="active === m.key" class="cz__nav-dot" />
        </button>
        <div class="cz__nav-ft">{{ t('菜单项按账号权限显示') }}</div>
      </aside>

      <section class="cz__body">
        <!-- 三个子页与旧项目同名同路径，按权限显隐 -->
        <StudentView v-if="active === 'student'" />
        <TeacherView v-else-if="active === 'teacher'" />
        <ClassesView v-else-if="active === 'classes'" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { UserOutlined, SolutionOutlined, BankOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import PageHead from '@/components/PageHead.vue'
import { useSessionStore } from '@/stores/session'
import ClassesView from './classes/index.vue'
import StudentView from './student/index.vue'
import TeacherView from './teacher/index.vue'

const router = useRouter()
const session = useSessionStore()
const active = ref('student')

const modules = [
  { key: 'student', label: '学生管理', icon: UserOutlined, permi: 'clazz:student:list' },
  { key: 'teacher', label: '教师管理', icon: SolutionOutlined, permi: 'clazz:teacher:list' },
  { key: 'classes', label: '班级管理', icon: BankOutlined, permi: 'clazz:class:list' }
]

// 旧页用 checkPermi([...])：'*:*:*' 全放行，其余按权限字符串精确匹配。
// 按 D2 决议改为读 session.permissions，判定口径与权限字符串保持一致。
const can = key => {
  const p = session.permissions || []
  return p.includes('*:*:*') || p.includes(key)
}
const visibleModules = computed(() => modules.filter(m => can(m.permi)))

function goLogin() {
  router.push({ path: '/login', query: { redirect: '/clazz' } })
}
</script>

<style scoped>
.guard {
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg);
  box-shadow: var(--sh-1); padding: 56px 24px; text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 14px;
}
.cz { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 16px; align-items: start; }
.cz__nav {
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg);
  box-shadow: var(--sh-1); padding: 8px; display: flex; flex-direction: column; min-height: 440px;
}
.cz__nav-hd { font-size: 11.5px; color: var(--ink-4); padding: 8px 10px 10px; }
.cz__nav-i {
  display: flex; align-items: center; gap: 9px; height: 38px; padding: 0 11px;
  border: 0; border-radius: var(--r-sm); background: transparent; color: var(--ink-2);
  font-size: 13px; text-align: left; cursor: pointer;
}
.cz__nav-i:hover { background: var(--bg); color: var(--ink); }
.cz__nav-i.on { background: var(--pri-50); color: var(--pri); font-weight: 600; }
.cz__ico { font-size: 14px; }
.cz__nav-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--pri); margin-left: auto; }
.cz__nav-ft {
  margin-top: auto; padding: 12px 10px 6px; border-top: 1px solid var(--line-3);
  font-size: 11px; line-height: 1.8; color: var(--ink-4); word-break: break-all;
}
.cz__body { min-width: 0; }
@media (max-width: 900px) {
  .cz { grid-template-columns: 1fr; }
  .cz__nav { min-height: 0; flex-direction: row; flex-wrap: wrap; }
  .cz__nav-hd, .cz__nav-ft { display: none; }
}
</style>
